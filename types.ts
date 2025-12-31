
export interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    description: string;
    stock: number;
    isFavorite: boolean;
    icon?: string;
    costPrice?: number;
}

export interface OrderItem {
    product: Product;
    quantity: number;
}

export interface Order {
    id: string;
    items: OrderItem[];
    total: number;
    timestamp: string;
    staffId?: string;
    staffName?: string;
    tillId: string;
    isDeleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
}

export interface Till {
    id: string;
    name: string;
    shift: Shift;
}

export type Shift = 'a' | 'b' | 'c' | 'd';

export type UserRole = 'super-admin' | 'admin' | 'manager' | 'standard' | string;

export interface CustomRole {
    id: string;
    label: string;
    level: number; // 1=Standard, 2=Manager, 3=Admin
}

export interface StaffMember {
    id: string;
    name: string;
    username?: string; // Nuovo campo per login personalizzato
    grade?: string; // Grado (es. VESC, CR, CSE)
    shift: Shift;
    rcSubGroup?: number; // Gruppo di salto 1-8
    icon?: string;
    photoUrl?: string; // Base64 image data
    password?: string; // Password per accesso
    lastSeen?: string; // Timestamp ultima attività
    role?: UserRole; // Livello di accesso
}

export interface TillColors {
    [key: string]: string; 
}

export interface CashMovement {
    id: string;
    amount: number;
    reason: string;
    timestamp: string;
    type: 'withdrawal' | 'deposit';
    category?: 'bar' | 'tombola' | 'analotto';
    isDeleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
}

export interface AdminUser {
    id: string;
    email: string;
    addedBy: string;
    timestamp: string;
}

export interface TombolaConfig {
    status: 'pending' | 'active' | 'completed';
    maxTickets: number;
    minTicketsToStart?: number;
    ticketPriceSingle: number;
    ticketPriceBundle: number;
    jackpot: number;
    lastExtraction: string;
    extractedNumbers: number[];
    gameStartTime?: string; // Data inizio gioco per calcolo intervalli
    targetDate?: string;    // Data fine prevista (es. 25 Dicembre 20:00)
}

export interface TombolaTicket {
    id: string;
    playerId: string;
    playerName: string;
    numbers: number[];
    purchaseTime: string;
    pricePaid?: number;
}

export interface TombolaWin {
    id: string;
    ticketId: string;
    playerName: string;
    type: 'Ambo' | 'Terno' | 'Quaterna' | 'Cinquina' | 'Tombola';
    numbers: number[];
    timestamp: string;
}

// === ANALOTTO VVF ===
export interface AnalottoConfig {
    jackpot: number;
    lastExtraction: string;
    rules?: string;
    extractionSchedule?: string;
}

export type AnalottoWheel = 'APS' | 'Campagnola' | 'Autoscala' | 'Autobotte' | 'Direttivo';

export interface AnalottoBet {
    id: string;
    playerId: string;
    playerName: string;
    numbers?: number[];
    wheels?: AnalottoWheel[];
    amount: number;
    timestamp: string;
    status: 'pending' | 'active' | 'completed';
}

export interface AnalottoExtraction {
    id: string;
    timestamp: string;
    numbers: Record<AnalottoWheel, number[]>;
}
// ====================

// === GESTIONE AUTOPARCO (PRENOTAZIONI) ===
export interface Vehicle {
    id: string;
    plate: string;
    model: string;
    fuelType: 'diesel' | 'benzina' | 'elettrica' | 'ibrida';
    checkDay?: CheckDay; // Giorno controllo settimanale
    photoUrl?: string;
    customChecklist?: string[]; // Lista controlli personalizzati (es. Gomme, Olio, Luci)
}

export interface VehicleBooking {
    id: string;
    vehicleId: string;
    vehicleName: string; // Denormalized for easier display
    startDate: string; // ISO String
    endDate: string;   // ISO String
    
    // Requester Info
    requesterType: 'internal' | 'external';
    internalStaffId?: string;
    requesterName: string; // Nome completo per visualizzazione rapida
    
    // External specifics
    externalGrade?: string;
    externalLocation?: string;

    serviceType: 'Sostituzione personale' | 'Missione' | 'Servizio Comando' | 'Altro';
    destination: string;
    timestamp: string; // Booking creation time
}
// ==========================

// === MEZZI OPERATIVI (CHECKLIST & CARICAMENTO) ===
export type OperationalVehicleType = 'APS' | 'ABP' | 'POL' | 'CA/PU' | 'AV' | 'AF' | 'RIBA' | 'CARRELLO' | 'ALTRO';
export type CheckDay = 'Lunedì' | 'Martedì' | 'Mercoledì' | 'Giovedì' | 'Venerdì' | 'Sabato' | 'Domenica';

export interface VehicleItem {
    id: string;
    name: string;
    quantity: number;
    expirationDate?: string; // ISO Date YYYY-MM-DD
}

export interface VehicleCompartment {
    id: string;
    name: string; // Es. "Vano 1SX", "Tetto", "Cabina"
    items: VehicleItem[];
}

export interface OperationalVehicle {
    id: string;
    plate: string;
    type: OperationalVehicleType;
    model: string;
    checkDay: CheckDay;
    notes?: string;
    photoUrl?: string;
    compartments?: VehicleCompartment[]; // Nuovo campo per scomparti
}

export interface VehicleCheck {
    id: string;
    vehicleId: string;
    vehicleName: string;
    date: string; // YYYY-MM-DD
    timestamp: string; // Full ISO
    shift: string; // Turno che ha effettuato il controllo
    operatorName?: string; // Opzionale
    status: 'ok' | 'issues'; // ok = tutto presente, issues = mancanze
    missingItems: { compartmentName: string, itemName: string, quantity: number }[]; // Lista mancanze
    notes: string;
}
// ==========================

// === GESTIONE LAVANDERIA ===
export interface LaundryItemDef {
    id: string;
    name: string;
    order?: number; // Per ordinamento visuale
}

export interface LaundryEntry {
    id: string;
    date: string; // Data consegna YYYY-MM-DD
    staffId: string;
    staffName: string;
    shift: string;
    items: { name: string; quantity: number }[];
    totalItems: number;
    timestamp: string; // Data creazione record ISO
    shipmentId?: string; // ID Spedizione (se inviato)
}

export interface LaundryShipment {
    id: string;
    sentDate: string; // YYYY-MM-DD
    timestamp: string; // Full ISO
    items: { name: string; staffName: string; totalQuantity: number; returnedQuantity: number }[]; // Riepilogo aggregato con nome
    status: 'in_transit' | 'completed';
    notes?: string;
}
// ==========================

// === REGISTRO INTERVENTI ===
export interface InterventionTypology {
    id: string;
    name: string; // Es. Incendio, Incidente Stradale, Apertura Porta
}

export interface DutyOfficer {
    id: string;
    name: string; // Es. Funzionario Rossi
}

export interface Intervention {
    id: string;
    interventionNumber?: string; // Nr. Intervento S.O.
    date: string; // YYYY-MM-DD
    exitTime: string; // HH:mm
    returnTime: string; // HH:mm
    
    typology: string; // Nome tipologia
    notes?: string; // Note aggiuntive sotto la tipologia
    
    // Luogo
    addressType?: string; // Via, Piazza, SS...
    street: string; // Nome via o KM
    number: string; // Civico
    municipality: string;
    locality: string;

    // Personale
    teamLeaderId: string; // ID Capo Partenza (CS+) oppure 'EXTERNAL' se esterno
    teamLeaderName: string; // Denormalized
    isExternalLeader?: boolean; // Flag per capo partenza altra sede
    
    dutyOfficer: string; // Nome Funzionario

    shift: string; // Turno che ha effettuato l'intervento (A, B, C, D)
    timestamp: string; // Creation timestamp
    
    // Soft Delete
    isDeleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
}
// ==========================

// === PROMEMORIA (REMINDERS) ===
export interface Reminder {
    id: string;
    text: string;
    type: 'recurring' | 'spot' | 'monthly'; // Added monthly
    dayOfWeek?: number; // 0=Dom, 1=Lun... per recurring
    monthlyDetail?: 'first-day' | 'last-day'; // Dettaglio per tipo mensile
    date?: string; // YYYY-MM-DD per spot
    completedDates: string[]; // Array di stringhe YYYY-MM-DD in cui è stato completato
    createdAt: string;
}
// ==============================

// === CHIUSURA MENSILE BAR ===
export interface MonthlyClosure {
    id: string; // Format: YYYY-MM (e.g. 2023-10)
    payments: {
        a: boolean;
        b: boolean;
        c: boolean;
        d: boolean;
    };
    notes?: string;
}
// ============================

export interface SeasonalityConfig {
    startDate: string;
    endDate: string;
    preset: 'custom' | 'christmas' | 'easter' | 'summer' | 'halloween';
    animationType: 'snow' | 'rain' | 'float' | 'none';
    emojis: string[];
    opacity: number;
    backgroundColor: string;
}

export interface ShiftSettings {
    anchorDate: string;
    anchorShift: Shift;
    
    // Configurazione Riposo Compensativo (Salto Turno)
    rcAnchorDate?: string;
    rcAnchorShift?: Shift;
    rcAnchorSubGroup?: number;
}

export interface GeneralSettings {
    waterQuotaPrice: number;
}

export type AttendanceStatus = 'present' | 'sub1' | 'sub2' | 'sub3' | 'substitution' | 'mission' | 'sick' | 'leave' | 'rest' | 'permit';

export interface AttendanceRecord {
    id: string;
    tillId: string;
    date: string;
    timestamp: string;
    presentStaffIds: string[]; // Legacy & Quick Lookup
    attendanceDetails?: Record<string, AttendanceStatus>; // Mappa dettagliata ID -> Status
    substitutionNames?: Record<string, string>; // Mappa ID -> Nome (per le righe personalizzabili sub_1, sub_2, sub_3)
    closedBy?: string; // Nome di chi ha chiuso il turno
    closedAt?: string; // Timestamp chiusura
}

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    timestamp: string;
    target?: 'all' | string;
    sender?: string;
}
