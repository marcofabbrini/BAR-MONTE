/**
 * Test end-to-end: i SERVIZI REALI dell'app (Bar, Tombola, Analotto, Promemoria...)
 * usati attraverso il nuovo livello dati contro l'API PHP + MySQL.
 *
 * Prerequisiti: server PHP e DB di prova avviati e seedati (vedi server/tests/seed.php).
 * Uso: GD_TEST_URL=http://127.0.0.1:8099/index.php npx tsx tests/e2e-services.ts
 */
import assert from 'node:assert/strict';
import { configureApi, AuthApi, db, __stopSync } from '../lib/db';
import { BarService } from '../services/barService';
import { TombolaService } from '../services/tombolaService';
import { AnalottoService } from '../services/analottoService';
import { ReminderService } from '../services/reminderService';
import { InterventionService } from '../services/interventionService';

const URL_BASE = process.env.GD_TEST_URL || 'http://127.0.0.1:8099/index.php';

function cookieFetch() {
    let cookie = '';
    const f: typeof fetch = async (input, init) => {
        const headers = new Headers(init?.headers);
        if (cookie) headers.set('Cookie', cookie);
        const res = await fetch(input, { ...init, headers });
        for (const c of res.headers.getSetCookie?.() ?? []) {
            const kv = c.split(';')[0];
            cookie = kv.endsWith('=') ? '' : kv;
        }
        return res;
    };
    return { f, get cookie() { return cookie; }, set cookie(v: string) { cookie = v; } };
}

const jar = cookieFetch();
configureApi({ endpoint: URL_BASE, fetchImpl: jar.f, pollMs: 150 });

const results: string[] = [];
let failed = 0;
async function test(name: string, fn: () => Promise<void>) {
    try { await fn(); results.push(`  ok   ${name}`); }
    catch (e: any) { failed++; results.push(`  FAIL ${name}\n       ${String(e.message).split('\n').join('\n       ')}`); }
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function waitFor<T>(fn: () => T | undefined | false, ms = 4000): Promise<T> {
    const t0 = Date.now();
    for (;;) {
        const v = fn();
        if (v) return v as T;
        if (Date.now() - t0 > ms) throw new Error('timeout in attesa di aggiornamento dal server');
        await sleep(50);
    }
}

await test('login tramite AuthApi', async () => {
    const u = await AuthApi.login('admin', 'superpw');
    assert.equal(u.id, 'u-super');
    assert.equal((await AuthApi.me()).id, 'u-super');
});

// --- Bar: prodotti, ordini con decremento scorte (batch + increment) -----------
let products: any[] = [];
let orders: any[] = [];
let cash: any[] = [];
const unsubs = [
    BarService.subscribeToProducts(p => { products = p; }),
    BarService.subscribeToOrders(o => { orders = o; }),
    BarService.subscribeToCashMovements(c => { cash = c; }),
];

let prodId = '';
await test('addProduct: il listener riceve il nuovo prodotto con id generato', async () => {
    await BarService.addProduct({ name: 'Caffè E2E', price: 1.2, stock: 10, category: 'bar' });
    const p = await waitFor(() => products.find(x => x.name === 'Caffè E2E'));
    assert.equal(p.id.length, 20);
    prodId = p.id;
});
await test('addOrder: ordine salvato e scorta decrementata atomicamente', async () => {
    const product = products.find(p => p.id === prodId);
    await BarService.addOrder({
        items: [{ product, quantity: 3 }, { product: { id: 'LOTTERY_TICKET_FAKE_ID' }, quantity: 1 }],
        total: 3.6, timestamp: '2026-10-28T10:00:00.000Z', staffId: 'u-super', tillId: 'a',
    });
    await waitFor(() => orders.length >= 1);
    await waitFor(() => products.find(p => p.id === prodId)?.stock === 7);
    assert.equal(orders[0].total, 3.6);
});
await test('ordini ordinati per timestamp decrescente (orderBy lato server)', async () => {
    await BarService.addOrder({ items: [], total: 1, timestamp: '2026-10-29T10:00:00.000Z', staffId: 'u-super', tillId: 'a' });
    await BarService.addOrder({ items: [], total: 2, timestamp: '2026-10-27T10:00:00.000Z', staffId: 'u-super', tillId: 'a' });
    await waitFor(() => orders.length >= 3);
    assert.deepEqual(orders.map(o => o.timestamp), ['2026-10-29T10:00:00.000Z', '2026-10-28T10:00:00.000Z', '2026-10-27T10:00:00.000Z']);
});
await test('soft delete ordine (update con campi extra)', async () => {
    await BarService.deleteOrder(orders[0].id, 'Tester');
    const o = await waitFor(() => orders.find(x => x.isDeleted));
    assert.equal(o.deletedBy, 'Tester');
});
await test('impostazioni (settings/doc) : set + listener documento', async () => {
    let colors: any;
    const u = BarService.subscribeToTillColors(c => { colors = c; });
    await BarService.updateTillColors({ a: '#ff0000' } as any);
    await waitFor(() => colors?.a === '#ff0000');
    await BarService.updateTillColors({ a: '#00ff00', b: '#0000ff' } as any);
    await waitFor(() => colors?.b === '#0000ff' && colors?.a === '#00ff00');
    u();
});

// --- Tombola: transazioni con letture e scritture multiple -----------------------
let tConfig: any, tTickets: any[] = [];
unsubs.push(TombolaService.subscribeToConfig(c => { tConfig = c; }));
unsubs.push(TombolaService.subscribeToTickets(t => { tTickets = t; }));

await test('tombola: config iniziale creata automaticamente se assente', async () => {
    await waitFor(() => tConfig && tConfig.maxTickets === 168);
    assert.equal(tConfig.jackpot, 0);
});
await test('tombola: acquisto 1 cartella (transazione) -> cartella + jackpot + 2 movimenti cassa', async () => {
    await TombolaService.buyTicket('u-std', 'Mario', 1);
    await waitFor(() => tTickets.length === 1 && tConfig.jackpot === 1.6);
    assert.equal(tTickets[0].numbers.length, 15);
    const tomb = cash.filter(c => c.category === 'tombola'); const bar = cash.filter(c => c.category === 'bar' && /Utile Tombola/.test(c.reason));
    assert.equal(tomb.length, 1); assert.equal(tomb[0].amount, 2); assert.equal(bar[0].amount, 0.4);
});
await test('tombola: 6 acquisti simultanei -> nessun aggiornamento perso (retry sui conflitti)', async () => {
    const before = tConfig.jackpot;
    await Promise.all(Array.from({ length: 6 }, (_, i) => TombolaService.buyTicket('u-std', 'Mario', 1)));
    await waitFor(() => tTickets.length === 7);
    await waitFor(() => Math.abs(tConfig.jackpot - (before + 6 * 1.6)) < 1e-9);
    assert.equal(cash.filter(c => c.category === 'tombola').length, 7);
});
await test('tombola: pacchetto da 6 cartelle usa numeri distinti 1..90', async () => {
    await TombolaService.buyTicket('u-super', 'Admin', 6);
    await waitFor(() => tTickets.length === 13);
    const bundle = tTickets.filter(t => t.playerId === 'u-super');
    assert.equal(bundle.length, 6);
    const all = bundle.flatMap(t => t.numbers);
    assert.equal(new Set(all).size, 90);
});
await test('tombola: rimborso cartella (transazione con delete)', async () => {
    const t = tTickets.find(x => x.playerId === 'u-std');
    const before = tConfig.jackpot;
    await TombolaService.refundTicket(t.id);
    await waitFor(() => tTickets.length === 12);
    await waitFor(() => Math.abs(tConfig.jackpot - (before - 1.6)) < 1e-9);
});
await test('tombola: rimborso massivo di un giocatore (query where + transazione)', async () => {
    await TombolaService.refundPlayerTickets('u-std', 'Mario');
    await waitFor(() => tTickets.filter(t => t.playerId === 'u-std').length === 0);
    assert.equal(tTickets.length, 6);
});
await test('tombola: avvio gioco + estrazione genera vincite', async () => {
    await TombolaService.startGame();
    await waitFor(() => tConfig.status === 'active');
    for (let i = 0; i < 40; i++) await TombolaService.manualExtraction();
    await waitFor(() => tConfig.extractedNumbers?.length === 40);
    const wins = await db.collection('tombola_wins').get();
    assert.ok(wins.size > 0, 'dopo 40 estrazioni su 6 cartelle ci devono essere vincite');
    assert.ok(wins.docs[0].id.includes('_'));
});
await test('tombola: annullamento totale (get collezione + transazione con molte letture)', async () => {
    await TombolaService.refundAllGameTickets();
    await waitFor(() => tTickets.length === 0 && tConfig.status === 'pending');
    assert.equal(tConfig.jackpot, 0);
    assert.equal((await db.collection('tombola_wins').get()).size, 0);
});

// --- Analotto ----------------------------------------------------------------------
let aConfig: any, aBets: any[] = [];
unsubs.push(AnalottoService.subscribeToConfig(c => { aConfig = c; }));
unsubs.push(AnalottoService.subscribeToBets(b => { aBets = b; }));
await test('analotto: config iniziale + giocata (transazione set/merge)', async () => {
    await waitFor(() => aConfig && aConfig.jackpot === 0);
    await AnalottoService.placeBet({ playerId: 'u-std', playerName: 'Mario', amount: 5, numbers: [1, 2], wheels: ['APS'], status: 'active' } as any);
    await waitFor(() => aBets.length === 1 && aConfig.jackpot === 4);
    assert.ok(aBets[0].timestamp);
});
await test('analotto: estrazione e trasferimento fondi', async () => {
    await AnalottoService.runExtraction();
    await AnalottoService.transferFunds(4);
    await waitFor(() => aConfig.jackpot === 0 && aConfig.lastExtraction);
    assert.ok(cash.some(c => c.reason === 'Versamento utile Analotto'));
});

// --- Promemoria: arrayUnion/arrayRemove -----------------------------------------------
let reminders: any[] = [];
unsubs.push(ReminderService.subscribeToReminders(r => { reminders = r; }));
await test('promemoria: undefined rimossi + toggle completamento (arrayUnion/Remove)', async () => {
    await ReminderService.addReminder({ title: 'Controllo estintori', frequency: 'daily', description: undefined } as any);
    const r = await waitFor(() => reminders[0]);
    assert.equal('description' in r, false);
    await ReminderService.toggleCompletion(r.id, '2026-10-28', r.completedDates);
    await waitFor(() => reminders[0].completedDates.includes('2026-10-28'));
    await ReminderService.toggleCompletion(r.id, '2026-10-28', ['2026-10-28']);
    await waitFor(() => reminders[0].completedDates.length === 0);
});

// --- Interventi (orderBy + limit + where) ------------------------------------------------
let interventions: any[] = [];
unsubs.push(InterventionService.subscribeToInterventions(i => { interventions = i; }));
await test('interventi: ordinamento data+ora uscita lato client sui dati del server', async () => {
    await InterventionService.addIntervention({ date: '2026-10-01', exitTime: '10:00' } as any);
    await InterventionService.addIntervention({ date: '2026-10-01', exitTime: '12:00' } as any);
    await InterventionService.addIntervention({ date: '2026-09-30', exitTime: '23:00' } as any);
    await waitFor(() => interventions.length === 3);
    assert.deepEqual(interventions.map(i => i.exitTime), ['12:00', '10:00', '23:00']);
});

// --- Staff: nessuna password esposta ----------------------------------------------------------
await test('lista staff via listener: nessuna password, solo hasPassword', async () => {
    let staff: any[] = [];
    const u = BarService.subscribeToStaff(s => { staff = s; });
    await waitFor(() => staff.length >= 6);
    assert.ok(staff.every(s => !('password' in s)));
    assert.ok(staff.find(s => s.id === 'u-super').hasPassword === true);
    u();
});

// --- Sessione scaduta: il poller segnala 401 ---------------------------------------------------
await test('sessione invalidata altrove -> onUnauthorized scatta', async () => {
    let fired = false;
    const off = AuthApi.onUnauthorized(() => { fired = true; });
    // un secondo "browser" fa logout con lo stesso cookie
    const other = cookieFetch(); other.cookie = jar.cookie;
    await other.f(URL_BASE + '?action=auth.logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    await waitFor(() => fired, 5000);
    off();
});

unsubs.forEach(u => u());
__stopSync();
console.log(results.join('\n'));
console.log(`\n${results.length - failed}/${results.length} test superati`);
process.exit(failed ? 1 : 0);
