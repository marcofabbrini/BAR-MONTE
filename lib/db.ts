/**
 * Livello dati dell'app: sostituisce Firestore con l'API PHP + MySQL
 * (cartella server/, pubblicata in <dominio>/vvf/gestionali/api/).
 *
 * Espone la stessa interfaccia usata finora dai servizi
 * (db.collection().doc().onSnapshot / get / set / update / delete,
 * db.batch(), db.runTransaction(), FieldValue.*), così i servizi restano invariati.
 *
 * Aggiornamenti in tempo reale: invece di una connessione persistente, un unico
 * "poller" interroga il server ogni pochi secondi per TUTTE le sottoscrizioni attive;
 * il server risponde con i dati solo per le collezioni cambiate (revisione per collezione).
 * Dopo ogni scrittura locale il poller scatta subito, quindi la propria interfaccia
 * si aggiorna senza attese.
 */

export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Comunicazione con l'API
// ---------------------------------------------------------------------------

interface ApiConfig {
    endpoint: string;
    fetchImpl?: typeof fetch;
    pollMs: number;
    pollHiddenMs: number;
}

let apiConfig: ApiConfig = {
    // Relativo alla pagina: funziona sotto qualunque percorso (es. /vvf/gestionali/).
    endpoint: 'api/index.php',
    pollMs: 3000,
    pollHiddenMs: 20000,
};

/** Usato dai test o per ambienti particolari. */
export function configureApi(partial: Partial<ApiConfig>): void {
    apiConfig = { ...apiConfig, ...partial };
}

export class ApiError extends Error {
    constructor(public status: number, public code: string, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function apiCall<T = any>(action: string, body: unknown = {}): Promise<T> {
    const doFetch = apiConfig.fetchImpl ?? fetch;
    let res: Response;
    try {
        res = await doFetch(`${apiConfig.endpoint}?action=${encodeURIComponent(action)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'same-origin',
            cache: 'no-store',
        });
    } catch {
        throw new ApiError(0, 'network', 'Server non raggiungibile. Controlla la connessione.');
    }
    let json: any = {};
    try {
        json = await res.json();
    } catch {
        /* risposta non JSON */
    }
    if (!res.ok) {
        throw new ApiError(res.status, json?.error ?? 'error', json?.message ?? `Errore del server (${res.status})`);
    }
    return json as T;
}

// ---------------------------------------------------------------------------
// Operatori di campo (FieldValue)
// ---------------------------------------------------------------------------

export const FieldValue = {
    increment: (n: number) => ({ __op: 'increment', value: n }),
    arrayUnion: (...values: any[]) => ({ __op: 'arrayUnion', values }),
    arrayRemove: (...values: any[]) => ({ __op: 'arrayRemove', values }),
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
};

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

export class DocumentSnapshot {
    constructor(public ref: DocumentReference, private _data: any | undefined) {}
    get id(): string { return this.ref.id; }
    get exists(): boolean { return this._data !== undefined; }
    data(): any { return this._data; }
}

export class QueryDocumentSnapshot extends DocumentSnapshot {}

export class QuerySnapshot {
    constructor(public docs: QueryDocumentSnapshot[]) {}
    get empty(): boolean { return this.docs.length === 0; }
    get size(): number { return this.docs.length; }
    forEach(fn: (doc: QueryDocumentSnapshot) => void): void { this.docs.forEach(fn); }
}

// ---------------------------------------------------------------------------
// Sincronizzazione (polling)
// ---------------------------------------------------------------------------

interface SubSpec {
    kind: 'query' | 'doc';
    collection: string;
    docId?: string;
    where?: [string, string, any][];
    orderBy?: [string, 'asc' | 'desc'][];
    limit?: number | null;
}

interface Listener {
    id: number;
    spec: SubSpec;
    rev: number | null;
    deliver: (result: any) => void;
}

const unauthorizedHandlers = new Set<() => void>();

class SyncEngine {
    private listeners = new Map<number, Listener>();
    private nextId = 1;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private inFlight = false;
    private paused = false;
    private again = false;
    private failures = 0;
    private started = false;
    // Cambia a ogni login/logout: serve a riconoscere le risposte 401 "vecchie",
    // relative a richieste partite prima che l'utente effettuasse l'accesso.
    private authEpoch = 0;

    add(spec: SubSpec, deliver: (r: any) => void): Unsubscribe {
        const id = this.nextId++;
        this.listeners.set(id, { id, spec, rev: null, deliver });
        this.start();
        this.kick();
        return () => { this.listeners.delete(id); };
    }

    /** Richiede un aggiornamento immediato. */
    kick(): void {
        if (this.inFlight) { this.again = true; return; }
        this.schedule(0);
    }

    pause(): void {
        this.authEpoch++;
        this.paused = true;
    }

    resume(): void {
        this.authEpoch++;
        this.paused = false;
        // I dati vanno riletti da zero: l'utente potrebbe essere cambiato.
        this.listeners.forEach(l => { l.rev = null; });
        this.failures = 0;
        this.kick();
    }

    stop(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.listeners.clear();
    }

    private start(): void {
        if (this.started) return;
        this.started = true;
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') this.kick();
            });
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.kick());
            window.addEventListener('focus', () => this.kick());
        }
    }

    private interval(): number {
        if (this.failures > 0) return Math.min(30000, 3000 * 2 ** Math.min(this.failures, 4));
        const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
        return hidden ? apiConfig.pollHiddenMs : apiConfig.pollMs;
    }

    private schedule(ms: number): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => { void this.tick(); }, ms);
        (this.timer as any)?.unref?.();
    }

    private async tick(): Promise<void> {
        this.timer = null;
        if (this.inFlight) return;
        if (this.paused || this.listeners.size === 0) {
            // Niente da fare ora: ricontrolla più tardi (si riattiva con resume()/add()).
            if (!this.paused) this.schedule(this.interval());
            return;
        }
        this.inFlight = true;
        this.again = false;
        const epochAtStart = this.authEpoch;
        try {
            const snapshot = Array.from(this.listeners.values());
            const subs = snapshot.map(l => ({ id: l.id, ...l.spec, rev: l.rev }));
            const res = await apiCall<{ results: any[] }>('sync', { subs });
            this.failures = 0;
            for (const r of res.results) {
                const l = this.listeners.get(r.id);
                if (!l) continue;
                l.rev = r.rev;
                if (r.changed) {
                    try { l.deliver(r); } catch (e) { console.error('Errore nel listener', e); }
                }
            }
        } catch (e) {
            if (e instanceof ApiError && e.status === 401) {
                if (epochAtStart !== this.authEpoch) {
                    // Richiesta partita prima di un login/logout: il 401 è obsoleto, si ripete.
                    this.again = true;
                } else {
                    this.paused = true;
                    unauthorizedHandlers.forEach(h => { try { h(); } catch { /* ignora */ } });
                }
            } else {
                this.failures++;
                console.warn('Sincronizzazione non riuscita:', (e as Error).message);
            }
        } finally {
            this.inFlight = false;
            if (!this.paused) this.schedule(this.again ? 0 : this.interval());
        }
    }
}

const engine = new SyncEngine();

// ---------------------------------------------------------------------------
// Scritture
// ---------------------------------------------------------------------------

interface Write {
    op: 'set' | 'update' | 'delete';
    c: string;
    id: string;
    data?: any;
    merge?: boolean;
}

async function commitWrites(writes: Write[], reads: { c: string; id: string; v: number }[] = []): Promise<void> {
    if (writes.length === 0) return;
    await apiCall('commit', { writes, reads });
    engine.kick();
}

function newId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = new Uint8Array(20);
    globalThis.crypto.getRandomValues(bytes);
    let s = '';
    for (const b of bytes) s += chars[b % chars.length];
    return s;
}

function plain(data: any): any {
    // Elimina i campi undefined (Firestore li rifiutava; JSON li ignora comunque).
    return JSON.parse(JSON.stringify(data ?? {}));
}

// ---------------------------------------------------------------------------
// Riferimenti
// ---------------------------------------------------------------------------

export class DocumentReference {
    constructor(public readonly collectionPath: string, public readonly id: string) {}

    get path(): string { return `${this.collectionPath}/${this.id}`; }

    async get(): Promise<DocumentSnapshot> {
        const r = await apiCall<{ exists: boolean; data?: any }>('getDoc', { c: this.collectionPath, id: this.id });
        return new DocumentSnapshot(this, r.exists ? r.data : undefined);
    }

    set(data: any, options?: { merge?: boolean }): Promise<void> {
        return commitWrites([{ op: 'set', c: this.collectionPath, id: this.id, data: plain(data), merge: !!options?.merge }]);
    }

    update(data: any): Promise<void> {
        return commitWrites([{ op: 'update', c: this.collectionPath, id: this.id, data: plain(data) }]);
    }

    delete(): Promise<void> {
        return commitWrites([{ op: 'delete', c: this.collectionPath, id: this.id }]);
    }

    onSnapshot(onNext: (snap: DocumentSnapshot) => void, _onError?: (e: Error) => void): Unsubscribe {
        return engine.add({ kind: 'doc', collection: this.collectionPath, docId: this.id }, (r) => {
            onNext(new DocumentSnapshot(this, r.exists ? r.data : undefined));
        });
    }
}

export class Query {
    constructor(
        protected readonly collectionPath: string,
        protected readonly spec: Pick<SubSpec, 'where' | 'orderBy' | 'limit'> = {},
    ) {}

    where(field: string, op: string, value: any): Query {
        return new Query(this.collectionPath, { ...this.spec, where: [...(this.spec.where ?? []), [field, op, value]] });
    }

    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): Query {
        return new Query(this.collectionPath, { ...this.spec, orderBy: [...(this.spec.orderBy ?? []), [field, direction]] });
    }

    limit(n: number): Query {
        return new Query(this.collectionPath, { ...this.spec, limit: n });
    }

    private toSnapshot(docs: { id: string; data: any }[]): QuerySnapshot {
        return new QuerySnapshot(
            docs.map(d => new QueryDocumentSnapshot(new DocumentReference(this.collectionPath, d.id), d.data)),
        );
    }

    async get(): Promise<QuerySnapshot> {
        const r = await apiCall<{ docs: { id: string; data: any }[] }>('getQuery', { collection: this.collectionPath, ...this.spec });
        return this.toSnapshot(r.docs);
    }

    onSnapshot(onNext: (snap: QuerySnapshot) => void, _onError?: (e: Error) => void): Unsubscribe {
        return engine.add({ kind: 'query', collection: this.collectionPath, ...this.spec }, (r) => {
            onNext(this.toSnapshot(r.docs ?? []));
        });
    }
}

export class CollectionReference extends Query {
    constructor(path: string) { super(path); }

    doc(id?: string): DocumentReference {
        return new DocumentReference(this.collectionPath, id ?? newId());
    }

    async add(data: any): Promise<DocumentReference> {
        const ref = this.doc();
        await ref.set(data);
        return ref;
    }
}

// ---------------------------------------------------------------------------
// Batch e transazioni
// ---------------------------------------------------------------------------

export class WriteBatch {
    private writes: Write[] = [];

    set(ref: DocumentReference, data: any, options?: { merge?: boolean }): WriteBatch {
        this.writes.push({ op: 'set', c: ref.collectionPath, id: ref.id, data: plain(data), merge: !!options?.merge });
        return this;
    }
    update(ref: DocumentReference, data: any): WriteBatch {
        this.writes.push({ op: 'update', c: ref.collectionPath, id: ref.id, data: plain(data) });
        return this;
    }
    delete(ref: DocumentReference): WriteBatch {
        this.writes.push({ op: 'delete', c: ref.collectionPath, id: ref.id });
        return this;
    }
    commit(): Promise<void> {
        return commitWrites(this.writes);
    }
}

export class Transaction {
    private reads = new Map<string, { c: string; id: string; v: number }>();
    private writes: Write[] = [];

    async get(ref: DocumentReference): Promise<DocumentSnapshot> {
        const r = await apiCall<{ exists: boolean; version: number; data?: any }>('getDoc', { c: ref.collectionPath, id: ref.id });
        this.reads.set(ref.path, { c: ref.collectionPath, id: ref.id, v: r.version });
        return new DocumentSnapshot(ref, r.exists ? r.data : undefined);
    }
    set(ref: DocumentReference, data: any, options?: { merge?: boolean }): Transaction {
        this.writes.push({ op: 'set', c: ref.collectionPath, id: ref.id, data: plain(data), merge: !!options?.merge });
        return this;
    }
    update(ref: DocumentReference, data: any): Transaction {
        this.writes.push({ op: 'update', c: ref.collectionPath, id: ref.id, data: plain(data) });
        return this;
    }
    delete(ref: DocumentReference): Transaction {
        this.writes.push({ op: 'delete', c: ref.collectionPath, id: ref.id });
        return this;
    }

    /** @internal */
    async commit(): Promise<void> {
        await commitWrites(this.writes, Array.from(this.reads.values()));
    }
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * Transazione ottimistica: se un documento letto cambia prima del commit,
 * il server risponde 409 e la funzione viene rieseguita da capo (come in Firestore).
 */
async function runTransaction<T>(fn: (t: Transaction) => Promise<T>, maxAttempts = 6): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const t = new Transaction();
        const result = await fn(t);
        try {
            await t.commit();
            return result;
        } catch (e) {
            lastError = e;
            if (e instanceof ApiError && e.status === 409 && attempt < maxAttempts) {
                await sleep(40 * attempt + Math.random() * 60);
                continue;
            }
            throw e;
        }
    }
    throw lastError;
}

export const db = {
    collection: (path: string) => new CollectionReference(path),
    batch: () => new WriteBatch(),
    runTransaction,
};

// ---------------------------------------------------------------------------
// Autenticazione (sessione lato server)
// ---------------------------------------------------------------------------

/** Sede (distaccamento) della sessione corrente. */
export type ModuleId = 'bar' | 'games' | 'calendar' | 'vehicle_booking' | 'operational_vehicles' | 'laundry' | 'interventions';
export interface TenantConfig {
    modules: Record<ModuleId, boolean>;
    displayName: string;
    municipalities: string[];
    weather: { label: string; lat: number; lon: number } | null;
    /** Indirizzo a cui inviare il riepilogo della lavanderia. */
    laundryEmail: string;
}
export interface TenantInfo { id: string; name: string; config: TenantConfig; platform: boolean }
/** Riga dell'elenco sedi (solo amministratore di piattaforma). */
export interface TenantSummary { id: string; name: string; createdAt: string; staffCount: number; isDefault: boolean; config: TenantConfig }
export interface ModuleDef { label: string; requires: ModuleId[] }
let currentTenant: TenantInfo | null = null;

/** Codice sede indicato nell'indirizzo (?sede=chiusi); senza, il server usa la sede predefinita. */
function tenantFromUrl(): string | undefined {
    try {
        if (typeof window === 'undefined') return undefined;
        const v = new URLSearchParams(window.location.search).get('sede');
        return v ? v.trim().toLowerCase() : undefined;
    } catch {
        return undefined;
    }
}

export const AuthApi = {
    /** Sede dell'utente collegato (null se nessuno è collegato). */
    tenant(): TenantInfo | null {
        return currentTenant;
    },

    /** Utente della sessione corrente, o null. */
    async me(): Promise<any | null> {
        try {
            const r = await apiCall<{ user: any | null; tenant?: TenantInfo | null }>('auth.me');
            currentTenant = r.user ? (r.tenant ?? null) : null;
            if (r.user) engine.resume();
            return r.user;
        } catch {
            return null;
        }
    },

    /** Lancia ApiError con status 401 (credenziali errate) o 429 (troppi tentativi). */
    async login(username: string, password: string, tenant?: string): Promise<any> {
        const r = await apiCall<{ user: any; tenant?: TenantInfo | null }>('auth.login', { username, password, tenant: tenant ?? tenantFromUrl() });
        currentTenant = r.tenant ?? null;
        engine.resume();
        return r.user;
    },

    /** Nome pubblico della sede per la schermata di login (null se la sede non esiste). */
    async publicName(tenant?: string): Promise<string | null> {
        try {
            const r = await apiCall<{ name: string | null }>('tenant.public', { tenant: tenant ?? tenantFromUrl() });
            return r.name ?? null;
        } catch {
            return null;
        }
    },

    async logout(): Promise<void> {
        try { await apiCall('auth.logout'); } catch { /* sessione già scaduta */ }
        currentTenant = null;
        engine.pause();
    },

    /** Notifica quando la sessione scade (il server risponde 401 durante la sincronizzazione). */
    onUnauthorized(handler: () => void): Unsubscribe {
        unauthorizedHandlers.add(handler);
        return () => { unauthorizedHandlers.delete(handler); };
    },
};

/** Gestione delle sedi: riservata al Super Admin della sede predefinita (controllo sul server). */
export const TenantApi = {
    list: () => apiCall<{ tenants: TenantSummary[]; modules: Record<ModuleId, ModuleDef> }>('tenants.list'),
    create: (b: { id: string; name: string; config: Partial<TenantConfig>; adminUser: string; adminPassword: string }) =>
        apiCall<{ tenant: TenantSummary }>('tenants.create', b),
    update: (b: { id: string; name: string; config: Partial<TenantConfig> }) =>
        apiCall<{ tenant: TenantSummary }>('tenants.update', b),
    setAdmin: (b: { id: string; username: string; password: string }) =>
        apiCall<{ created: boolean }>('tenants.setAdmin', b),
};

/** Solo per i test: ferma il poller. */
export function __stopSync(): void {
    engine.stop();
}
