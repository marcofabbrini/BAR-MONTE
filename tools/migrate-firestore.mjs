#!/usr/bin/env node
/**
 * Migrazione dei dati da Firestore (vecchia app) a MySQL (nuova app).
 *
 * Legge tutte le collezioni del progetto Firebase e genera uno o più file .sql da
 * importare con phpMyAdmin nel database Sql837388_4. Non scrive nulla su Firestore.
 *
 * Uso (serve Node 18 o superiore, nessuna installazione):
 *
 *   node tools/migrate-firestore.mjs
 *   node tools/migrate-firestore.mjs --out ./migrazione
 *   node tools/migrate-firestore.mjs --token "$(gcloud auth print-access-token)"
 *
 * Opzioni:
 *   --project <id>       progetto Firebase (default: bar-montepulciano-1f5a1)
 *   --api-key <chiave>   chiave API web del progetto (default: quella della vecchia app)
 *   --token <token>      token OAuth: serve solo se le regole di Firestore non permettono
 *                        la lettura pubblica (si ottiene con:  gcloud auth print-access-token)
 *   --collections a,b,c  elenco collezioni (default: tutte quelle usate dall'app + quelle trovate)
 *   --out <cartella>     dove scrivere i file .sql (default: ./migrazione)
 *   --max-mb <n>         dimensione massima di ogni file .sql (default 1.5, per i limiti di phpMyAdmin)
 *
 * Le password degli utenti vengono copiate così come sono: al primo accesso di ciascun
 * utente la nuova app le converte automaticamente in hash sicuri.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_COLLECTIONS = [
    'products', 'staff', 'orders', 'cash_movements', 'admins', 'custom_roles', 'settings',
    'attendance', 'monthly_closures',
    'laundry_items', 'laundry_entries', 'laundry_shipments',
    'vehicles', 'vehicle_bookings', 'operational_vehicles', 'vehicle_checks',
    'interventions', 'intervention_typologies', 'duty_officers',
    'reminders',
    'tombola', 'tombola_tickets', 'tombola_wins',
    'analotto', 'analotto_bets', 'analotto_extractions',
    'lottery_tickets',
];

// ---------------------------------------------------------------------------
// Decodifica dei valori "tipizzati" dell'API REST di Firestore
// ---------------------------------------------------------------------------

export function decodeValue(v) {
    if (v === null || typeof v !== 'object') return null;
    if ('nullValue' in v) return null;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) {
        const d = v.doubleValue;
        return typeof d === 'string' ? Number(d) : d; // "NaN"/"Infinity" arrivano come stringhe
    }
    if ('timestampValue' in v) return v.timestampValue; // l'app usa stringhe ISO; se c'è un Timestamp lo teniamo ISO
    if ('stringValue' in v) return v.stringValue;
    if ('bytesValue' in v) return v.bytesValue;
    if ('referenceValue' in v) return v.referenceValue;
    if ('geoPointValue' in v) return { latitude: v.geoPointValue.latitude ?? 0, longitude: v.geoPointValue.longitude ?? 0 };
    if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decodeValue);
    if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {});
    return null;
}

export function decodeFields(fields) {
    const out = {};
    for (const [k, val] of Object.entries(fields ?? {})) out[k] = decodeValue(val);
    return out;
}

// ---------------------------------------------------------------------------
// Generazione SQL
// ---------------------------------------------------------------------------

const sqlStr = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\0/g, '\\0') + "'";
const sqlDate = (iso) => {
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(iso ?? '');
    return m ? `${m[1]} ${m[2]}` : new Date().toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * @param {{collection:string,id:string,data:object,createTime?:string,updateTime?:string}[]} docs
 * @returns {{files:string[], skipped:string[]}}
 */
export function buildSql(docs, maxBytes = 1.5 * 1024 * 1024) {
    const header = [
        '-- Importazione dati GESDI (generata da tools/migrate-firestore.mjs)',
        '-- Importa questo file con phpMyAdmin nel database Sql837388_4.',
        '-- Se i file sono più di uno, importali in ordine numerico.',
        'SET NAMES utf8mb4;',
        'SET FOREIGN_KEY_CHECKS = 0;',
        '',
    ].join('\n');

    const skipped = [];
    const stmts = [];
    const collections = new Set();
    for (const d of docs) {
        if (!/^[A-Za-z0-9_\-]{1,60}$/.test(d.collection) || !d.id || d.id.length > 100 || /[\/\x00-\x1f]/.test(d.id)) {
            skipped.push(`${d.collection}/${d.id}`);
            continue;
        }
        collections.add(d.collection);
        const json = JSON.stringify(d.data);
        stmts.push(
            'INSERT INTO gd_documents (collection, doc_id, data, version, created_at, updated_at) VALUES (' +
            `${sqlStr(d.collection)}, ${sqlStr(d.id)}, ${sqlStr(json)}, 1, ${sqlStr(sqlDate(d.createTime))}, ${sqlStr(sqlDate(d.updateTime))}` +
            ') ON DUPLICATE KEY UPDATE data = VALUES(data), version = version + 1, updated_at = VALUES(updated_at);'
        );
    }
    // La "revisione" per collezione fa scaricare i dati nuovi a tutti i dispositivi già aperti.
    const tail = [...collections].sort().map(
        (c) => `INSERT INTO gd_collection_rev (collection, rev) VALUES (${sqlStr(c)}, 1) ON DUPLICATE KEY UPDATE rev = rev + 1;`
    );

    const files = [];
    let cur = header;
    for (const s of [...stmts, ...tail]) {
        if (Buffer.byteLength(cur) + Buffer.byteLength(s) > maxBytes && cur !== header) {
            files.push(cur);
            cur = header;
        }
        cur += s + '\n';
    }
    files.push(cur);
    return { files, skipped };
}

// ---------------------------------------------------------------------------
// Lettura da Firestore (REST)
// ---------------------------------------------------------------------------

async function api(url, { token, method = 'GET', body } = {}) {
    const res = await fetch(url, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* ignora */ }
    if (!res.ok) {
        const err = new Error(json?.error?.message || `HTTP ${res.status}`);
        err.status = res.status;
        err.code = json?.error?.status;
        throw err;
    }
    return json;
}

export async function fetchCollection({ base, project, apiKey, token, collection }) {
    const docs = [];
    let pageToken = '';
    do {
        const qs = new URLSearchParams({ pageSize: '300' });
        if (apiKey && !token) qs.set('key', apiKey);
        if (pageToken) qs.set('pageToken', pageToken);
        const url = `${base}/v1/projects/${project}/databases/(default)/documents/${encodeURIComponent(collection)}?${qs}`;
        const page = await api(url, { token });
        for (const d of page.documents ?? []) {
            const id = decodeURIComponent(d.name.split('/').pop());
            docs.push({ collection, id, data: decodeFields(d.fields), createTime: d.createTime, updateTime: d.updateTime });
        }
        pageToken = page.nextPageToken || '';
    } while (pageToken);
    return docs;
}

async function discoverCollections({ base, project, apiKey, token }) {
    try {
        const qs = apiKey && !token ? `?key=${apiKey}` : '';
        const url = `${base}/v1/projects/${project}/databases/(default)/documents:listCollectionIds${qs}`;
        const r = await api(url, { token, method: 'POST', body: {} });
        return r.collectionIds ?? [];
    } catch {
        return []; // non è un problema: si usa l'elenco predefinito
    }
}

// ---------------------------------------------------------------------------
// Programma principale
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const o = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a.startsWith('--')) o[a.slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    }
    return o;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const project = args.project || 'bar-montepulciano-1f5a1';
    const apiKey = args['api-key'] || 'AIzaSyDVs7kbp_O6oMZ8AetE03S6Wu6cywL_ca0';
    const token = typeof args.token === 'string' ? args.token : process.env.FIREBASE_TOKEN || '';
    const base = process.env.FIRESTORE_BASE || 'https://firestore.googleapis.com';
    const outDir = resolve(typeof args.out === 'string' ? args.out : './migrazione');
    const maxBytes = (Number(args['max-mb']) || 1.5) * 1024 * 1024;

    let collections = typeof args.collections === 'string' ? args.collections.split(',').map((s) => s.trim()).filter(Boolean) : null;
    if (!collections) {
        const found = await discoverCollections({ base, project, apiKey, token });
        collections = [...new Set([...DEFAULT_COLLECTIONS, ...found])];
        const extra = found.filter((c) => !DEFAULT_COLLECTIONS.includes(c));
        if (extra.length) console.log(`Collezioni trovate oltre a quelle note all'app: ${extra.join(', ')}`);
    }

    console.log(`Progetto Firestore: ${project}`);
    const all = [];
    for (const collection of collections) {
        try {
            const docs = await fetchCollection({ base, project, apiKey, token, collection });
            all.push(...docs);
            console.log(`  ${collection.padEnd(26)} ${String(docs.length).padStart(6)} documenti`);
        } catch (e) {
            if (e.status === 403 || e.code === 'PERMISSION_DENIED') {
                console.error(`\nAccesso negato a "${collection}": le regole di Firestore non consentono la lettura pubblica.`);
                console.error('Rilancia con un token:  node tools/migrate-firestore.mjs --token "$(gcloud auth print-access-token)"');
                console.error('(gcloud si installa da https://cloud.google.com/sdk; usa un account con accesso al progetto Firebase).');
                process.exit(2);
            }
            console.error(`  ${collection}: errore (${e.message}) — saltata`);
        }
    }

    if (all.length === 0) {
        console.error('\nNessun documento trovato: niente da migrare.');
        process.exit(1);
    }

    const { files, skipped } = buildSql(all, maxBytes);
    mkdirSync(outDir, { recursive: true });
    const names = files.map((content, i) => {
        const name = `gestionali-import-${String(i + 1).padStart(2, '0')}.sql`;
        writeFileSync(join(outDir, name), content, 'utf8');
        return name;
    });

    console.log(`\nTotale: ${all.length - skipped.length} documenti in ${names.length} file, cartella: ${outDir}`);
    names.forEach((n) => console.log(`  ${n}`));
    if (skipped.length) console.warn(`\nATTENZIONE: ${skipped.length} documenti saltati (id non valido): ${skipped.slice(0, 5).join(', ')}…`);
    console.log('\nPassi successivi: importa i file in ordine con phpMyAdmin (database Sql837388_4, scheda "Importa").');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main().catch((e) => { console.error('Errore:', e.message); process.exit(1); });
}
