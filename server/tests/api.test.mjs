// Test end-to-end dell'API. Richiede un server PHP + DB di prova già avviati e seedati.
// Uso: GD_TEST_URL=http://127.0.0.1:8099/index.php node tests/api.test.mjs
import assert from 'node:assert/strict';

const URL_BASE = process.env.GD_TEST_URL || 'http://127.0.0.1:8099/index.php';
let passed = 0;
const results = [];

class Client {
    constructor() { this.cookie = ''; }
    async call(action, body = {}, { headers = {}, raw = false } = {}) {
        const res = await fetch(`${URL_BASE}?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
            body: JSON.stringify(body),
        });
        const set = res.headers.getSetCookie?.() ?? [];
        for (const c of set) {
            const kv = c.split(';')[0];
            if (kv.endsWith('=')) this.cookie = ''; else this.cookie = kv;
        }
        const json = await res.json();
        return raw ? { status: res.status, json, res } : { status: res.status, ...json };
    }
    async login(username, password) { return this.call('auth.login', { username, password }); }
    async commit(writes, reads = []) { return this.call('commit', { reads, writes }); }
    async query(collection, extra = {}) { return (await this.call('getQuery', { collection, ...extra })).docs; }
}

async function test(name, fn) {
    try { await fn(); passed++; results.push(`  ok   ${name}`); }
    catch (e) { results.push(`  FAIL ${name}\n       ${e.message.split('\n').join('\n       ')}`); process.exitCode = 1; }
}

const set = (c, id, data, merge = false) => ({ op: 'set', c, id, data, merge });
const upd = (c, id, data) => ({ op: 'update', c, id, data });
const del = (c, id) => ({ op: 'delete', c, id });

// --- Autenticazione -----------------------------------------------------------
const anon = new Client();
await test('me senza sessione -> user null', async () => {
    const r = await anon.call('auth.me');
    assert.equal(r.status, 200); assert.equal(r.user, null);
});
await test('sync senza sessione -> 401', async () => {
    const r = await anon.call('sync', { subs: [] });
    assert.equal(r.status, 401);
});
await test('commit senza sessione -> 401', async () => {
    const r = await anon.commit([set('products', 'x', { a: 1 })]);
    assert.equal(r.status, 401);
});
await test('login con password errata -> 401', async () => {
    const r = await new Client().login('mario', 'sbagliata');
    assert.equal(r.status, 401);
});

const std = new Client();
await test('login utente standard (per username)', async () => {
    const r = await std.login('MARIO', 'mariopw');
    assert.equal(r.status, 200);
    assert.equal(r.user.id, 'u-std'); assert.equal(r.user.name, 'Mario Rossi');
    assert.equal('password' in r.user, false); assert.equal(r.user.hasPassword, true);
    assert.ok(r.user.lastSeen);
});
await test('me dopo il login restituisce l\'utente', async () => {
    const r = await std.call('auth.me'); assert.equal(r.user.id, 'u-std');
});
const mgr = new Client();
await test('login per nome (senza username) con password', async () => {
    const r = await mgr.login('marco manager', 'mgrpw'); assert.equal(r.status, 200); assert.equal(r.user.id, 'u-mgr');
});
await test('accesso libero consentito a utente standard senza password', async () => {
    const r = await new Client().login('Libero Accesso', ''); assert.equal(r.status, 200); assert.equal(r.user.hasPassword, false);
});
await test('accesso libero NEGATO a manager senza password', async () => {
    const r = await new Client().login('Manager Senza Password', ''); assert.equal(r.status, 401);
});
await test('password in chiaro importata: login ok e poi convertita in hash', async () => {
    const c = new Client();
    const r = await c.login('vecchio', 'plainpw'); assert.equal(r.status, 200);
    const r2 = await new Client().login('vecchio', 'plainpw'); assert.equal(r2.status, 200);
    const r3 = await new Client().login('vecchio', 'altra'); assert.equal(r3.status, 401);
});
const admin = new Client(), sup = new Client();
await admin.login('anna', 'annapw'); await sup.login('admin', 'superpw');

// --- Scritture ----------------------------------------------------------------
await test('set / update / lettura documento', async () => {
    let r = await std.commit([set('products', 'p1', { name: 'Caffè', price: 1.2, stock: 10, tags: ['a'], empty: {}, list: [], note: 'è così ☕' })]);
    assert.equal(r.status, 200);
    r = await std.call('getDoc', { c: 'products', id: 'p1' });
    assert.equal(r.exists, true); assert.equal(r.version, 1);
    assert.deepEqual(r.data, { name: 'Caffè', price: 1.2, stock: 10, tags: ['a'], empty: {}, list: [], note: 'è così ☕' });
    r = await std.commit([upd('products', 'p1', { price: 1.5 })]);
    r = await std.call('getDoc', { c: 'products', id: 'p1' });
    assert.equal(r.data.price, 1.5); assert.equal(r.version, 2); assert.equal(r.data.name, 'Caffè');
});
await test('oggetti vuoti {} e array vuoti [] restano distinti', async () => {
    const r = await std.call('getDoc', { c: 'products', id: 'p1' });
    assert.deepEqual(r.data.empty, {}); assert.deepEqual(r.data.list, []);
});
await test('update su documento inesistente -> 404', async () => {
    const r = await std.commit([upd('products', 'nope', { a: 1 })]); assert.equal(r.status, 404);
});
await test('increment (anche negativo) e campo mancante', async () => {
    await std.commit([upd('products', 'p1', { stock: { __op: 'increment', value: -3 } })]);
    await std.commit([upd('products', 'p1', { sold: { __op: 'increment', value: 2 } })]);
    const r = await std.call('getDoc', { c: 'products', id: 'p1' });
    assert.equal(r.data.stock, 7); assert.equal(r.data.sold, 2);
});
await test('arrayUnion / arrayRemove', async () => {
    await std.commit([set('reminders', 'r1', { completedDates: [] })]);
    await std.commit([upd('reminders', 'r1', { completedDates: { __op: 'arrayUnion', values: ['2026-10-01'] } })]);
    await std.commit([upd('reminders', 'r1', { completedDates: { __op: 'arrayUnion', values: ['2026-10-01', '2026-10-02'] } })]);
    let r = await std.call('getDoc', { c: 'reminders', id: 'r1' });
    assert.deepEqual(r.data.completedDates, ['2026-10-01', '2026-10-02']);
    await std.commit([upd('reminders', 'r1', { completedDates: { __op: 'arrayRemove', values: ['2026-10-01'] } })]);
    r = await std.call('getDoc', { c: 'reminders', id: 'r1' });
    assert.deepEqual(r.data.completedDates, ['2026-10-02']);
});
await test('set con merge: unisce anche gli oggetti annidati', async () => {
    await std.commit([set('settings', 'general', { a: 1, nested: { x: 1, y: 2 } })]);
    await std.commit([set('settings', 'general', { b: 2, nested: { y: 9, z: 3 } }, true)]);
    const r = await std.call('getDoc', { c: 'settings', id: 'general' });
    assert.deepEqual(r.data, { a: 1, b: 2, nested: { x: 1, y: 9, z: 3 } });
});
await test('set con merge su documento nuovo lo crea', async () => {
    await std.commit([set('settings', 'fresh', { k: 1 }, true)]);
    assert.equal((await std.call('getDoc', { c: 'settings', id: 'fresh' })).data.k, 1);
});
await test('set senza merge sostituisce il documento', async () => {
    await std.commit([set('settings', 'general', { only: true })]);
    assert.deepEqual((await std.call('getDoc', { c: 'settings', id: 'general' })).data, { only: true });
});
await test('delete', async () => {
    await std.commit([del('settings', 'fresh')]);
    assert.equal((await std.call('getDoc', { c: 'settings', id: 'fresh' })).exists, false);
});
await test('batch atomico: se una scrittura fallisce non viene applicata nessuna', async () => {
    const before = (await std.call('getDoc', { c: 'products', id: 'p1' })).version;
    const r = await std.commit([upd('products', 'p1', { price: 99 }), upd('products', 'manca', { a: 1 })]);
    assert.equal(r.status, 404);
    const after = await std.call('getDoc', { c: 'products', id: 'p1' });
    assert.equal(after.version, before); assert.notEqual(after.data.price, 99);
});
await test('nomi collezione/id non validi -> 422', async () => {
    assert.equal((await std.commit([set('a/b', 'x', {})])).status, 422);
    assert.equal((await std.commit([set('products', 'a/b', {})])).status, 422);
    assert.equal((await std.commit([set('products', '', {})])).status, 422);
});

// --- Concorrenza (transazioni ottimistiche) ------------------------------------
await test('lettura con versione: commit ok se invariata, 409 se cambiata', async () => {
    await std.commit([set('tombola', 'config', { jackpot: 10 })]);
    const d = await std.call('getDoc', { c: 'tombola', id: 'config' });
    let r = await std.commit([upd('tombola', 'config', { jackpot: 20 })], [{ c: 'tombola', id: 'config', v: d.version }]);
    assert.equal(r.status, 200);
    r = await std.commit([upd('tombola', 'config', { jackpot: 30 })], [{ c: 'tombola', id: 'config', v: d.version }]);
    assert.equal(r.status, 409);
    assert.equal((await std.call('getDoc', { c: 'tombola', id: 'config' })).data.jackpot, 20);
});
await test('lettura di documento inesistente (v=0): 409 se nel frattempo è stato creato', async () => {
    let r = await std.commit([set('x_new', 'a', { v: 1 })], [{ c: 'x_new', id: 'a', v: 0 }]);
    assert.equal(r.status, 200);
    r = await std.commit([set('x_new', 'a', { v: 2 })], [{ c: 'x_new', id: 'a', v: 0 }]);
    assert.equal(r.status, 409);
});
await test('incrementi concorrenti non si perdono (30 richieste parallele)', async () => {
    await std.commit([set('counters', 'c', { n: 0 })]);
    const rs = await Promise.all(Array.from({ length: 30 }, () => std.commit([upd('counters', 'c', { n: { __op: 'increment', value: 1 } })])));
    assert.ok(rs.every(r => r.status === 200), JSON.stringify(rs.filter(r => r.status !== 200)));
    assert.equal((await std.call('getDoc', { c: 'counters', id: 'c' })).data.n, 30);
});

// --- Interrogazioni --------------------------------------------------------------
await test('orderBy desc + limit + where; esclude i documenti senza il campo', async () => {
    await std.commit([
        set('orders', 'o1', { timestamp: '2026-10-01T10:00:00Z', total: 5, who: 'a' }),
        set('orders', 'o2', { timestamp: '2026-10-03T10:00:00Z', total: 7, who: 'b' }),
        set('orders', 'o3', { timestamp: '2026-10-02T10:00:00Z', total: 9, who: 'a' }),
        set('orders', 'o4', { total: 1, who: 'a' }),
    ]);
    let docs = await std.query('orders', { orderBy: [['timestamp', 'desc']] });
    assert.deepEqual(docs.map(d => d.id), ['o2', 'o3', 'o1']);
    docs = await std.query('orders', { orderBy: [['timestamp', 'desc']], limit: 2 });
    assert.deepEqual(docs.map(d => d.id), ['o2', 'o3']);
    docs = await std.query('orders', { where: [['who', '==', 'a']], orderBy: [['timestamp', 'asc']] });
    assert.deepEqual(docs.map(d => d.id), ['o1', 'o3']);
    docs = await std.query('orders', { where: [['total', '>=', 7]] });
    assert.deepEqual(docs.map(d => d.id).sort(), ['o2', 'o3']);
    docs = await std.query('orders', { where: [['who', 'in', ['b', 'z']]] });
    assert.deepEqual(docs.map(d => d.id), ['o2']);
    docs = await std.query('orders');
    assert.deepEqual(docs.map(d => d.id), ['o1', 'o2', 'o3', 'o4']);
});

// --- Sync (polling) -------------------------------------------------------------
await test('sync: invia i dati la prima volta, poi "unchanged" finché non cambia', async () => {
    const sub = { id: 1, kind: 'query', collection: 'orders', where: [], orderBy: [['timestamp', 'desc']], limit: null, rev: null };
    let r = await std.call('sync', { subs: [sub] });
    const a = r.results[0];
    assert.equal(a.changed, true); assert.equal(a.docs.length, 3); assert.equal(typeof a.rev, 'number');
    r = await std.call('sync', { subs: [{ ...sub, rev: a.rev }] });
    assert.equal(r.results[0].changed, false);
    await std.commit([upd('orders', 'o1', { total: 6 })]);
    r = await std.call('sync', { subs: [{ ...sub, rev: a.rev }] });
    assert.equal(r.results[0].changed, true); assert.ok(r.results[0].rev > a.rev);
    assert.equal(r.results[0].docs.find(d => d.id === 'o1').data.total, 6);
});
await test('sync: documento singolo, esistente e inesistente', async () => {
    const r = await std.call('sync', { subs: [
        { id: 'a', kind: 'doc', collection: 'tombola', docId: 'config', rev: null },
        { id: 'b', kind: 'doc', collection: 'tombola', docId: 'nonesiste', rev: null },
    ] });
    assert.equal(r.results[0].exists, true); assert.equal(r.results[0].data.jackpot, 20);
    assert.equal(r.results[1].exists, false);
});
await test('sync: collezione mai scritta -> lista vuota, poi unchanged', async () => {
    let r = await std.call('sync', { subs: [{ id: 1, kind: 'query', collection: 'mai_scritta', rev: null }] });
    assert.deepEqual(r.results[0].docs, []);
    r = await std.call('sync', { subs: [{ id: 1, kind: 'query', collection: 'mai_scritta', rev: r.results[0].rev }] });
    assert.equal(r.results[0].changed, false);
});

// --- Password mai esposte ------------------------------------------------------
await test('la lista staff non contiene mai password', async () => {
    const r = await std.call('sync', { subs: [{ id: 1, kind: 'query', collection: 'staff', rev: null }] });
    const docs = r.results[0].docs;
    assert.ok(docs.length >= 6);
    for (const d of docs) { assert.equal('password' in d.data, false); assert.equal(typeof d.data.hasPassword, 'boolean'); }
    const q = await std.query('staff');
    for (const d of q) assert.equal('password' in d.data, false);
    const one = await std.call('getDoc', { c: 'staff', id: 'u-super' });
    assert.equal('password' in one.data, false);
});

// --- Permessi -------------------------------------------------------------------
await test('utente standard può modificare il proprio profilo (anche password), non il ruolo', async () => {
    let r = await std.commit([upd('staff', 'u-std', { username: 'mario2', rcSubGroup: 2, role: 'standard', hasPassword: true })]);
    assert.equal(r.status, 200);
    r = await std.commit([upd('staff', 'u-std', { role: 'admin' })]);
    assert.equal(r.status, 403);
    r = await std.commit([upd('staff', 'u-std', { password: 'nuovapw' })]);
    assert.equal(r.status, 200);
    assert.equal((await new Client().login('mario2', 'mariopw')).status, 401);
    assert.equal((await new Client().login('mario2', 'nuovapw')).status, 200);
    const me = await std.call('auth.me'); assert.equal(me.user.hasPassword, true);
});
await test('aggiornare lo staff senza campo password non cancella la password', async () => {
    await std.commit([upd('staff', 'u-std', { icon: '🔥' })]);
    assert.equal((await new Client().login('mario2', 'nuovapw')).status, 200);
});
await test('set completo su staff esistente preserva la password', async () => {
    await mgr.commit([set('staff', 'u-std', { name: 'Mario Rossi', username: 'mario2', role: 'standard', shift: 'a' })]);
    assert.equal((await new Client().login('mario2', 'nuovapw')).status, 200);
});
await test('password vuota esplicita = rimozione (accesso libero per standard)', async () => {
    await std.commit([upd('staff', 'u-std', { password: '' })]);
    assert.equal((await new Client().login('mario2', '')).status, 200);
    await std.commit([upd('staff', 'u-std', { password: 'mariopw' })]);
});
await test('utente standard NON può modificare/eliminare/creare altri utenti', async () => {
    assert.equal((await std.commit([upd('staff', 'u-mgr', { icon: 'x' })])).status, 403);
    assert.equal((await std.commit([del('staff', 'u-mgr')])).status, 403);
    assert.equal((await std.commit([set('staff', 'nuovo', { name: 'Hacker', role: 'standard' })])).status, 403);
});
await test('utente standard NON può toccare admins e custom_roles', async () => {
    assert.equal((await std.commit([set('admins', 'a1', { email: 'x@y.z' })])).status, 403);
    assert.equal((await std.commit([set('custom_roles', 'r1', { label: 'X', level: 1 })])).status, 403);
});
await test('manager può creare standard ma non admin/super-admin', async () => {
    assert.equal((await mgr.commit([set('staff', 'n1', { name: 'Nuovo', role: 'standard' })])).status, 200);
    assert.equal((await mgr.commit([set('staff', 'n2', { name: 'Boss', role: 'admin' })])).status, 403);
    assert.equal((await mgr.commit([set('staff', 'n3', { name: 'Boss', role: 'super-admin' })])).status, 403);
});
await test('manager NON può modificare né eliminare un super-admin', async () => {
    assert.equal((await mgr.commit([upd('staff', 'u-super', { icon: 'x' })])).status, 403);
    assert.equal((await mgr.commit([upd('staff', 'u-super', { password: 'rubata' })])).status, 403);
    assert.equal((await mgr.commit([del('staff', 'u-super')])).status, 403);
    assert.equal((await new Client().login('admin', 'rubata')).status, 401);
});
await test('manager NON può promuovere sé stesso o altri sopra il proprio livello', async () => {
    assert.equal((await mgr.commit([upd('staff', 'u-mgr', { role: 'super-admin' })])).status, 403);
    assert.equal((await mgr.commit([upd('staff', 'n1', { role: 'admin' })])).status, 403);
});
await test('admin può creare un manager, non un super-admin', async () => {
    assert.equal((await admin.commit([set('staff', 'n4', { name: 'M2', role: 'manager' })])).status, 200);
    assert.equal((await admin.commit([set('staff', 'n5', { name: 'S2', role: 'super-admin' })])).status, 403);
    assert.equal((await admin.commit([set('admins', 'a1', { email: 'x@y.z' })])).status, 403);
});
await test('super-admin può gestire utenti, admins e ruoli personalizzati', async () => {
    assert.equal((await sup.commit([set('staff', 'n6', { name: 'S3', role: 'super-admin', password: 'xx' })])).status, 200);
    assert.equal((await sup.commit([set('admins', 'a1', { email: 'x@y.z' })])).status, 200);
    assert.equal((await sup.commit([set('custom_roles', 'cr1', { label: 'Cuoco', level: 2 })])).status, 200);
    assert.equal((await sup.commit([del('staff', 'n6')])).status, 200);
});
await test('ruolo personalizzato: il livello viene rispettato nei permessi', async () => {
    assert.equal((await admin.commit([set('custom_roles', 'cr2', { label: 'Troppo', level: 4 })])).status, 403);
    assert.equal((await admin.commit([set('staff', 'n7', { name: 'Cuoco', role: 'cr1' })])).status, 200);
    assert.equal((await admin.commit([set('custom_roles', 'cr3', { label: 'Ok', level: 2 })])).status, 200);
});
await test('non puoi eliminare il tuo stesso utente', async () => {
    assert.equal((await admin.commit([del('staff', 'u-admin')])).status, 403);
});

// --- Sicurezza richieste ---------------------------------------------------------
await test('Content-Type non JSON -> 415', async () => {
    const res = await fetch(`${URL_BASE}?action=auth.me`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
    assert.equal(res.status, 415);
});
await test('metodo GET -> 405', async () => {
    const res = await fetch(`${URL_BASE}?action=auth.me`); assert.equal(res.status, 405);
});
await test('Origin diversa dall\'host -> 403 (anti-CSRF)', async () => {
    const r = await std.call('auth.me', {}, { headers: { Origin: 'https://evil.example' } });
    assert.equal(r.status, 403);
});
await test('Origin uguale all\'host -> ok', async () => {
    const u = new URL(URL_BASE);
    const r = await std.call('auth.me', {}, { headers: { Origin: `http://${u.host}` } });
    assert.equal(r.status, 200);
});
await test('azione sconosciuta -> 404; JSON malformato -> 400', async () => {
    assert.equal((await std.call('boh')).status, 404);
    const res = await fetch(`${URL_BASE}?action=auth.login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{rotto' });
    assert.equal(res.status, 400);
});
await test('analyze senza chiave configurata -> 503 (con sessione); senza sessione -> 401', async () => {
    assert.equal((await std.call('analyze', { prompt: 'ciao' })).status, 503);
    assert.equal((await new Client().call('analyze', { prompt: 'ciao' })).status, 401);
    assert.equal((await std.call('analyze', { prompt: '' })).status, 400);
});
await test('logout invalida la sessione', async () => {
    const c = new Client(); await c.login('Libero Accesso', '');
    const old = c.cookie;
    await c.call('auth.logout');
    const again = new Client(); again.cookie = old;
    const r = await again.call('auth.me'); assert.equal(r.user, null);
});
await test('cookie di sessione: HttpOnly e SameSite=Lax', async () => {
    const r = await new Client().call('auth.login', { username: 'Libero Accesso', password: '' }, { raw: true });
    const sc = r.res.headers.getSetCookie().join(';').toLowerCase();
    assert.ok(sc.includes('httponly')); assert.ok(sc.includes('samesite=lax'));
});
await test('limite tentativi: dopo 10 errori sullo stesso utente -> 429', async () => {
    const c = new Client(); let last;
    for (let i = 0; i < 11; i++) last = await c.login('bersaglio', 'x' + i);
    assert.equal(last.status, 429);
    // un login corretto di un altro utente (stesso IP) resta possibile
    assert.equal((await new Client().login('anna', 'annapw')).status, 200);
});

console.log(results.join('\n'));
console.log(`\n${passed}/${results.length} test superati`);
