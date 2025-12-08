
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

export interface StaffMember {
    id: string;
    name: string;
    shift: Shift;
    rcSubGroup?: number; // Gruppo di salto 1-8
    icon?: string;
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
    category?: 'bar' | 'tombola' | 'analotto'; // Aggiunto analotto
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
}

export interface TombolaTicket {
    id: string;
    playerId: string;
    playerName: string;
    numbers: number[];
    purchaseTime: string;
    pricePaid?: number; // Importante per rimborsi corretti
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
    rules?: string; // HTML/Text del regolamento
    extractionSchedule?: string; // Es: "Ogni Venerdì alle 20:00"
}

export type AnalottoWheel = 'APS' | 'Campagnola' | 'Autoscala' | 'Autobotte' | 'Direttivo';

export interface AnalottoBet {
    id: string;
    playerId: string;
    playerName: string;
    numbers?: number[]; // 1-10 numeri scelti (Opzionale se pending)
    wheels?: AnalottoWheel[]; // Ruote su cui si gioca (Opzionale se pending)
    amount: number; // Importo giocato
    timestamp: string;
    status: 'pending' | 'active' | 'completed';
}

export interface AnalottoExtraction {
    id: string;
    timestamp: string;
    numbers: Record<AnalottoWheel, number[]>; // Es: { APS: [1, 5, 90, 23, 11], ... }
}
// ====================

export interface SeasonalityConfig {
    startDate: string;
    endDate: string;
    preset: 'custom' | 'christmas' | 'easter' | 'summer' | 'halloween';
    animationType: 'snow' | 'rain' | 'float' | 'none';
    emojis: string[];
    opacity: number;      // 0.1 a 1.0
    backgroundColor: string; // Hex color
}

export interface ShiftSettings {
    anchorDate: string; // Data di riferimento YYYY-MM-DD
    anchorShift: Shift; // Turno diurno attivo in quella data
    
    // Configurazione Riposo Compensativo (Salto Turno)
    rcAnchorDate?: string; // Data nota di un riposo
    rcAnchorShift?: Shift; // Quale turno era di servizio (e quindi ha generato il salto per un sottogruppo)
    rcAnchorSubGroup?: number; // Quale sottogruppo (1-8) stava riposando in quella data
}

export interface AttendanceRecord {
    id: string;
    tillId: string; // es. "TA", "TB"
    date: string; // YYYY-MM-DD
    timestamp: string;
    presentStaffIds: string[];
}
