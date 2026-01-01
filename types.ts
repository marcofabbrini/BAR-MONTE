
export type Shift = 'a' | 'b' | 'c' | 'd';
export type UserRole = 'super-admin' | 'admin' | 'manager' | 'standard';
export type AttendanceStatus = 'present' | 'sub1' | 'sub2' | 'sub3' | 'substitution' | 'mission' | 'sick' | 'leave' | 'rest' | 'permit' | 'absent';

export interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    description?: string;
    stock: number;
    isFavorite: boolean;
    icon?: string;
    costPrice?: number;
}

export interface Till {
    id: string;
    name: string;
    shift: Shift;
}

export interface StaffMember {
    id: string;
    name: string;
    shift: Shift;
    rcSubGroup?: number;
    icon?: string;
    role?: UserRole | string;
    username?: string;
    password?: string;
    photoUrl?: string;
    grade?: string;
    lastSeen?: string;
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
    staffId: string;
    staffName?: string;
    tillId: string;
    isDeleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
}

export interface CashMovement {
    id: string;
    amount: number;
    reason: string;
    timestamp: string;
    type: 'deposit' | 'withdrawal';
    category?: 'bar' | 'tombola' | 'analotto';
    isDeleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
}

export interface AdminUser {
    id: string;
    email: string;
    timestamp: string;
}

export interface TillColors {
    [tillId: string]: string;
}

export interface SeasonalityConfig {
    startDate?: string;
    endDate?: string;
    preset?: 'custom' | 'christmas' | 'easter' | 'summer' | 'halloween';
    animationType?: 'none' | 'snow' | 'rain' | 'float';
    emojis?: string[];
    opacity?: number;
    backgroundColor?: string;
}

export interface ShiftSettings {
    anchorDate: string;
    anchorShift: Shift;
}

export interface GeneralSettings {
    waterQuotaPrice: number;
}

export interface AttendanceRecord {
    id: string;
    date: string;
    tillId: string;
    presentStaffIds: string[];
    timestamp: string;
    closedAt?: string;
    closedBy?: string;
    attendanceDetails?: Record<string, AttendanceStatus>;
    substitutionNames?: Record<string, string>;
}

export interface TombolaConfig {
    status: 'pending' | 'active' | 'completed';
    maxTickets: number;
    minTicketsToStart: number;
    ticketPriceSingle: number;
    ticketPriceBundle: number;
    jackpot: number;
    lastExtraction: string;
    extractedNumbers: number[];
    targetDate?: string | null;
    gameStartTime?: string | null;
    rules?: string; 
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
    type: string;
    numbers: number[];
    timestamp: string;
}

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
    numbers: number[];
    wheels: AnalottoWheel[];
    amount: number;
    status: 'pending' | 'active' | 'completed';
    timestamp: string;
}

export interface AnalottoExtraction {
    id: string;
    timestamp: string;
    numbers: Record<string, number[]>;
}

export type CheckDay = 'Lunedì' | 'Martedì' | 'Mercoledì' | 'Giovedì' | 'Venerdì' | 'Sabato' | 'Domenica';

export interface Vehicle {
    id: string;
    plate: string;
    model: string;
    fuelType: string;
    checkDay?: CheckDay;
    photoUrl?: string;
    customChecklist?: string[];
}

export type OperationalVehicleType = 'APS' | 'ABP' | 'POL' | 'CA/PU' | 'AV' | 'AF' | 'RIBA' | 'CARRELLO' | 'ALTRO';

export interface VehicleItem {
    id: string;
    name: string;
    quantity: number;
    expirationDate?: string;
}

export interface VehicleCompartment {
    id: string;
    name: string;
    items: VehicleItem[];
}

export interface OperationalVehicle {
    id: string;
    plate: string;
    model: string;
    type: OperationalVehicleType;
    checkDay: CheckDay;
    notes?: string;
    photoUrl?: string;
    compartments: VehicleCompartment[];
}

export interface VehicleCheck {
    id: string;
    vehicleId: string;
    vehicleName: string;
    date: string;
    timestamp: string;
    shift: string;
    status: 'ok' | 'issues';
    missingItems?: { compartmentName: string, itemName: string, quantity: number }[];
    notes?: string;
}

export interface VehicleBooking {
    id: string;
    vehicleId: string;
    vehicleName: string;
    startDate: string;
    endDate: string;
    requesterType: 'internal' | 'external';
    internalStaffId?: string;
    requesterName: string;
    externalGrade?: string;
    externalLocation?: string;
    serviceType: 'Sostituzione personale' | 'Missione' | 'Servizio Comando' | 'Altro';
    destination: string;
    timestamp: string;
    isCancelled?: boolean;
    cancelledBy?: string;
    cancelledAt?: string;
}

export interface LaundryItemDef {
    id: string;
    name: string;
}

export interface LaundryEntry {
    id: string;
    date: string;
    staffId: string;
    staffName: string;
    shift: string;
    items: { name: string, quantity: number }[];
    totalItems: number;
    timestamp: string;
    shipmentId?: string;
}

export interface LaundryShipmentItem {
    name: string;
    staffName: string;
    totalQuantity: number;
    returnedQuantity: number;
}

export interface LaundryShipment {
    id: string;
    sentDate: string;
    timestamp: string;
    items: LaundryShipmentItem[];
    status: 'in_transit' | 'completed';
    notes?: string;
}

export interface Intervention {
    id: string;
    interventionNumber?: string;
    date: string;
    exitTime: string;
    returnTime: string;
    typology: string;
    notes?: string;
    requesterName?: string;
    addressType?: string;
    street?: string;
    number?: string;
    municipality: string;
    locality?: string;
    teamLeaderId?: string;
    teamLeaderName: string;
    isExternalLeader?: boolean;
    dutyOfficer?: string;
    shift: Shift;
    timestamp: string;
    isDeleted?: boolean;
    deletedBy?: string;
    deletedAt?: string;
}

export interface InterventionTypology {
    id: string;
    name: string;
}

export interface DutyOfficer {
    id: string;
    name: string;
}

export interface Reminder {
    id: string;
    text: string;
    type: 'recurring' | 'spot' | 'monthly';
    dayOfWeek?: number;
    monthlyDetail?: 'first-day' | 'last-day';
    date?: string;
    completedDates: string[];
    createdAt: string;
}

export interface CustomRole {
    id: string;
    label: string;
    level: number;
}

export interface MonthlyClosure {
    id: string;
    payments: {
        a: boolean;
        b: boolean;
        c: boolean;
        d: boolean;
    };
}

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    timestamp: string;
}
