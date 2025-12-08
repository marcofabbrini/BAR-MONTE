
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
    category?: 'bar' | 'tombola';
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
}