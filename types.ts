
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

export interface AttendanceRecord {
    id: string;
    tillId: string;
    date: string;
    timestamp: string;
    presentStaffIds: string[];
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
