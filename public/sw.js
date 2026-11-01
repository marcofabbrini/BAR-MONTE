/* Service worker minimo: rende il sito installabile e velocizza l'avvio.
 * - Pagine: sempre dalla rete (così ogni aggiornamento arriva subito); offline mostra l'ultima copia.
 * - File in /assets (nome con impronta): dalla cache, aggiornata in background.
 * - API (/api/...): MAI in cache, né toccate: i dati devono essere sempre quelli veri.
 */
const CACHE = 'gesdi-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.includes('/api/')) return; // dati: sempre rete, nessuna cache

    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy));
                    return res;
                })
                .catch(() => caches.match(req).then((r) => r || caches.match('./')))
        );
        return;
    }

    if (url.pathname.includes('/assets/') || /\.(png|svg|webmanifest)$/.test(url.pathname)) {
        e.respondWith(
            caches.match(req).then((hit) => {
                const net = fetch(req).then((res) => {
                    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
                    return res;
                });
                return hit || net;
            })
        );
    }
});
