// Test dello strumento di migrazione contro un finto server Firestore REST.
// Uso: node tests/migrate.test.mjs   (genera i file .sql in una cartella temporanea e ne stampa il percorso)
import assert from 'node:assert/strict';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { decodeValue, decodeFields, buildSql } from '../tools/migrate-firestore.mjs';

let ok = 0;
const t = (name, fn) => { try { fn(); ok++; console.log('  ok  ', name); } catch (e) { console.log('  FAIL', name, '\n      ', e.message); process.exitCode = 1; } };

t('decodeValue: tutti i tipi di Firestore', () => {
    assert.equal(decodeValue({ stringValue: 'ciao' }), 'ciao');
    assert.equal(decodeValue({ integerValue: '42' }), 42);
    assert.equal(decodeValue({ doubleValue: 1.5 }), 1.5);
    assert.equal(decodeValue({ booleanValue: false }), false);
    assert.equal(decodeValue({ nullValue: null }), null);
    assert.equal(decodeValue({ timestampValue: '2026-10-28T10:00:00Z' }), '2026-10-28T10:00:00Z');
    assert.deepEqual(decodeValue({ arrayValue: {} }), []);
    assert.deepEqual(decodeValue({ mapValue: {} }), {});
    assert.deepEqual(decodeValue({ arrayValue: { values: [{ integerValue: '1' }, { mapValue: { fields: { a: { stringValue: 'x' } } } }] } }), [1, { a: 'x' }]);
});

t('buildSql: escape di apici, backslash, emoji; suddivisione in file', () => {
    const docs = Array.from({ length: 50 }, (_, i) => ({ collection: 'products', id: 'p' + i, data: { name: `Caffè d'oro \\ "x" 🔥 ${i}`, n: i } }));
    docs.push({ collection: 'products', id: 'a/b', data: {} });
    const { files, skipped } = buildSql(docs, 4000);
    assert.ok(files.length > 1, 'deve dividere in più file');
    assert.deepEqual(skipped, ['products/a/b']);
    assert.ok(files.every(f => f.startsWith('-- Importazione dati GESDI')));
    assert.ok(files[files.length - 1].includes('gd_collection_rev'));
});

// --- Con un finto server Firestore ---------------------------------------------------
const docsByCol = {
    products: [
        { name: 'projects/x/databases/(default)/documents/products/prod1', createTime: '2025-12-01T10:00:00.123Z', updateTime: '2025-12-02T11:00:00Z',
          fields: { name: { stringValue: "Caffè dell'amico \\ \"speciale\" 🔥\nriga2" }, price: { doubleValue: 1.2 }, stock: { integerValue: '10' }, tags: { arrayValue: { values: [{ stringValue: 'a' }] } }, empty: { mapValue: {} }, list: { arrayValue: {} }, flag: { booleanValue: true }, nothing: { nullValue: null } } },
        { name: 'projects/x/databases/(default)/documents/products/prod2', createTime: '2025-12-01T10:00:00Z', updateTime: '2025-12-01T10:00:00Z', fields: { name: { stringValue: 'Tè' } } },
    ],
    staff: [
        { name: 'projects/x/databases/(default)/documents/staff/s1', createTime: '2025-12-01T10:00:00Z', updateTime: '2025-12-01T10:00:00Z',
          fields: { name: { stringValue: 'Importato Uno' }, username: { stringValue: 'import1' }, password: { stringValue: 'vecchiapw' }, role: { stringValue: 'standard' }, shift: { stringValue: 'a' } } },
    ],
    settings: [
        { name: 'projects/x/databases/(default)/documents/settings/shifts', createTime: '2025-12-01T10:00:00Z', updateTime: '2025-12-01T10:00:00Z', fields: { anchorDate: { stringValue: '2025-12-20' }, anchorShift: { stringValue: 'b' } } },
    ],
};
let requests = 0;
const server = http.createServer((req, res) => {
    requests++;
    const u = new URL(req.url, 'http://x');
    const m = /\/documents\/([^/:]+)$/.exec(u.pathname);
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'POST' && u.pathname.endsWith(':listCollectionIds')) { res.end(JSON.stringify({ collectionIds: ['products', 'staff', 'settings'] })); return; }
    if (!m) { res.statusCode = 404; res.end('{}'); return; }
    const all = docsByCol[m[1]] ?? [];
    // paginazione: 1 documento per pagina
    const start = Number(u.searchParams.get('pageToken') || 0);
    const page = all.slice(start, start + 1);
    const body = { documents: page };
    if (start + 1 < all.length) body.nextPageToken = String(start + 1);
    res.end(JSON.stringify(body));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const out = mkdtempSync(join(tmpdir(), 'gd-migr-'));

try {
    const { stdout: log } = await execFileAsync('node', ['tools/migrate-firestore.mjs', '--collections', 'products,staff,settings,vuota', '--out', out],
        { env: { ...process.env, FIRESTORE_BASE: `http://127.0.0.1:${port}` }, encoding: 'utf8' });
    assert.match(log, /products\s+2 documenti/);
    assert.match(log, /staff\s+1 documenti/);
    const files = readdirSync(out);
    assert.deepEqual(files, ['gestionali-import-01.sql']);
    const sql = readFileSync(join(out, files[0]), 'utf8');
    assert.ok(sql.includes("INSERT INTO gd_documents"));
    assert.ok(sql.includes('2025-12-01 10:00:00'));
    ok++; console.log('  ok   script completo contro finto Firestore (paginazione, collezione vuota)');
    console.log('       SQL generato in:', join(out, files[0]));
} catch (e) { console.log('  FAIL script completo', e.message); process.exitCode = 1; }
server.close();
console.log(`\n${ok} test superati`);
