
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Product, StaffMember, Order, CashMovement, TillColors, SeasonalityConfig, ShiftSettings, GeneralSettings, AttendanceRecord, AdminUser, AppNotification, AttendanceStatus, Vehicle, VehicleBooking, LaundryItemDef, LaundryEntry, Intervention, InterventionTypology, DutyOfficer, OperationalVehicle, VehicleCheck, Reminder } from '../types';
import { BarService } from '../services/barService';
import { VehicleService } from '../services/vehicleService';
import { InterventionService } from '../services/interventionService';
import { OperationalVehicleService } from '../services/operationalVehicleService';
import { ReminderService } from '../services/reminderService';

interface BarContextType {
    products: Product[];
    staff: StaffMember[];
    orders: Order[];
    cashMovements: CashMovement[];
    adminList: AdminUser[];
    tillColors: TillColors;
    seasonalityConfig: SeasonalityConfig | undefined;
    shiftSettings: ShiftSettings;
    generalSettings: GeneralSettings;
    attendanceRecords: AttendanceRecord[];
    
    // Auth State
    activeBarUser: StaffMember | null;
    loginBarUser: (username: string, password: string) => Promise<boolean>;
    logoutBarUser: () => void;
    onlineStaffCount: number;

    // Vehicles (Booking)
    vehicles: Vehicle[];
    vehicleBookings: VehicleBooking[];

    // Operational Vehicles
    operationalVehicles: OperationalVehicle[];
    vehicleChecks: VehicleCheck[];

    // Laundry
    laundryItems: LaundryItemDef[];
    laundryEntries: LaundryEntry[];

    // Interventions
    interventions: Intervention[];
    interventionTypologies: InterventionTypology[];
    dutyOfficers: DutyOfficer[];

    // Reminders
    reminders: Reminder[];

    activeToast: AppNotification | null;
    isLoading: boolean;
    setActiveToast: (n: AppNotification | null) => void;
    addProduct: (d: any, email: string) => Promise<void>;
    updateProduct: (p: any) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    addStaff: (d: any) => Promise<void>;
    updateStaff: (s: any) => Promise<void>;
    deleteStaff: (id: string) => Promise<void>;
    completeOrder: (o: any) => Promise<void>;
    updateOrder: (o: any) => Promise<void>;
    deleteOrders: (ids: string[], email: string) => Promise<void>;
    permanentDeleteOrder: (id: string) => Promise<void>;
    addCashMovement: (d: any) => Promise<void>;
    updateCashMovement: (m: any) => Promise<void>;
    deleteCashMovement: (id: string, email: string) => Promise<void>;
    permanentDeleteMovement: (id: string) => Promise<void>;
    resetCash: (type: 'bar' | 'games') => Promise<void>;
    stockPurchase: (pid: string, qty: number, cost: number) => Promise<void>;
    stockCorrection: (pid: string, stock: number) => Promise<void>;
    addAdmin: (email: string, by: string) => Promise<void>;
    removeAdmin: (id: string) => Promise<void>;
    saveAttendance: (till: string, ids: string[], date?: string, closedBy?: string, details?: Record<string, AttendanceStatus>, substitutionNames?: Record<string, string>) => Promise<void>;
    reopenAttendance: (id: string) => Promise<void>;
    deleteAttendance: (id: string) => Promise<void>;
    updateTillColors: (c: TillColors) => Promise<void>;
    updateSeasonality: (cfg: SeasonalityConfig) => Promise<void>;
    updateShiftSettings: (cfg: ShiftSettings) => Promise<void>;
    updateGeneralSettings: (cfg: GeneralSettings) => Promise<void>;
    sendNotification: (title: string, body: string, sender: string) => Promise<void>;
    massDelete: (d: string, t: 'orders'|'movements') => Promise<void>;
    
    // Vehicle Actions (Booking)
    addVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
    updateVehicle: (v: Vehicle) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
    addBooking: (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => Promise<void>;
    deleteBooking: (id: string) => Promise<void>;

    // Operational Vehicle Actions
    addOperationalVehicle: (v: Omit<OperationalVehicle, 'id'>) => Promise<void>;
    updateOperationalVehicle: (v: OperationalVehicle) => Promise<void>;
    deleteOperationalVehicle: (id: string) => Promise<void>;
    addVehicleCheck: (c: Omit<VehicleCheck, 'id'>) => Promise<void>;
    updateVehicleCheck: (id: string, u: Partial<VehicleCheck>) => Promise<void>;

    // Laundry Actions
    addLaundryItem: (i: Omit<LaundryItemDef, 'id'>) => Promise<void>;
    updateLaundryItem: (i: LaundryItemDef) => Promise<void>;
    deleteLaundryItem: (id: string) => Promise<void>;
    addLaundryEntry: (e: Omit<LaundryEntry, 'id'>) => Promise<void>;
    deleteLaundryEntry: (id: string) => Promise<void>;

    // Intervention Actions
    addIntervention: (i: Omit<Intervention, 'id'>) => Promise<void>;
    updateIntervention: (i: Intervention) => Promise<void>;
    deleteIntervention: (id: string) => Promise<void>;
    permanentDeleteIntervention: (id: string) => Promise<void>;
    addInterventionTypology: (name: string) => Promise<void>;
    deleteInterventionTypology: (id: string) => Promise<void>;
    addDutyOfficer: (name: string) => Promise<void>;
    deleteDutyOfficer: (id: string) => Promise<void>;

    // Reminder Actions
    addReminder: (r: Omit<Reminder, 'id' | 'createdAt' | 'completedDates'>) => Promise<void>;
    updateReminder: (id: string, r: Partial<Reminder>) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;
    toggleReminderCompletion: (id: string, date: string, completedDates: string[]) => Promise<void>;

    // Time Sync
    getNow: () => Date;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export const BarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
    const [adminList, setAdminList] = useState<AdminUser[]>([]);
    const [tillColors, setTillColors] = useState<TillColors>({});
    const [seasonalityConfig, setSeasonalityConfig] = useState<SeasonalityConfig | undefined>(undefined);
    const [shiftSettings, setShiftSettings] = useState<ShiftSettings>({ anchorDate: '', anchorShift: 'b' });
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({ waterQuotaPrice: 0 });
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);
    const [operationalVehicles, setOperationalVehicles] = useState<OperationalVehicle[]>([]);
    const [vehicleChecks, setVehicleChecks] = useState<VehicleCheck[]>([]);
    const [laundryItems, setLaundryItems] = useState<LaundryItemDef[]>([]);
    const [laundryEntries, setLaundryEntries] = useState<LaundryEntry[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [interventionTypologies, setInterventionTypologies] = useState<InterventionTypology[]>([]);
    const [dutyOfficers, setDutyOfficers] = useState<DutyOfficer[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);

    // Logged In Staff
    const [activeBarUser, setActiveBarUser] = useState<StaffMember | null>(null);
    const [onlineStaffCount, setOnlineStaffCount] = useState(0);

    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Time Offset
    const [timeOffset, setTimeOffset] = useState(0);

    // Fetch reliable time on mount
    useEffect(() => {
        const fetchTime = async () => {
            try {
                const response = await fetch('https://worldtimeapi.org/api/timezone/Europe/Rome');
                if (response.ok) {
                    const data = await response.json();
                    const serverTime = new Date(data.datetime).getTime();
                    const localTime = Date.now();
                    const offset = serverTime - localTime;
                    setTimeOffset(offset);
                }
            } catch (error) {
                console.warn("Could not fetch world time, falling back to local clock.", error);
            }
        };
        fetchTime();
        const interval = setInterval(fetchTime, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getNow = useCallback(() => {
        return new Date(Date.now() + timeOffset);
    }, [timeOffset]);

    // Restore login from localStorage
    useEffect(() => {
        const savedUserId = localStorage.getItem('bar_user_id');
        if (savedUserId) {
            if (savedUserId === 'super-admin-virtual') {
                setActiveBarUser({
                    id: 'super-admin-virtual',
                    name: 'Super Admin',
                    grade: 'Admin',
                    shift: 'a',
                    icon: '👑'
                });
            } else if (staff.length > 0) {
                const user = staff.find(s => s.id === savedUserId);
                if (user) setActiveBarUser(user);
            }
        }
    }, [staff]);

    // Heartbeat Effect
    useEffect(() => {
        if (!activeBarUser || activeBarUser.id === 'super-admin-virtual') return;
        
        const heartbeat = () => {
            BarService.updateStaffLastSeen(activeBarUser.id);
        };

        heartbeat();
        const interval = setInterval(heartbeat, 60 * 1000);
        return () => clearInterval(interval);
    }, [activeBarUser]);

    // Calculate Online Users
    useEffect(() => {
        const calculateOnline = () => {
            const now = new Date().getTime();
            const fiveMinutes = 5 * 60 * 1000;
            const count = staff.filter(s => {
                if (!s.lastSeen) return false;
                const lastSeenTime = new Date(s.lastSeen).getTime();
                return (now - lastSeenTime) < fiveMinutes;
            }).length;
            setOnlineStaffCount(count);
        };

        calculateOnline();
        const interval = setInterval(calculateOnline, 30 * 1000);
        return () => clearInterval(interval);
    }, [staff]);

    const loginBarUser = async (username: string, password: string) => {
        const lowerInputName = username.trim().toLowerCase();
        
        // 1. GESTIONE SUPER ADMIN (Backdoor o Utente Reale)
        if (lowerInputName === 'admin') {
            // Cerca se esiste un utente reale chiamato "Admin" o "Super Admin" nel DB
            const dbAdmin = staff.find(s => s.name.toLowerCase() === 'admin' || s.name.toLowerCase() === 'super admin');
            
            if (dbAdmin) {
                // Se esiste, usa la sua password. Se non ha password, usa 1234
                const storedPwd = dbAdmin.password;
                if (storedPwd && storedPwd.trim() !== '') {
                    if (storedPwd === password) { 
                        setActiveBarUser(dbAdmin); 
                        localStorage.setItem('bar_user_id', dbAdmin.id);
                        return true; 
                    }
                } else {
                    // Fallback se l'utente esiste ma non ha pwd settata
                    if (password === '1234') { 
                        setActiveBarUser(dbAdmin); 
                        localStorage.setItem('bar_user_id', dbAdmin.id);
                        return true; 
                    }
                }
            } else {
                // Utente virtuale (Primo avvio o Admin non censito)
                if (password === '1234') {
                    const virtualAdmin: StaffMember = {
                        id: 'super-admin-virtual',
                        name: 'Super Admin',
                        grade: 'Admin',
                        shift: 'a',
                        icon: '👑'
                    };
                    setActiveBarUser(virtualAdmin);
                    localStorage.setItem('bar_user_id', 'super-admin-virtual');
                    return true;
                }
            }
        }

        // 2. GESTIONE UTENTI STANDARD
        // Cerca un utente il cui nome inizi con l'input (es. "Mario" trova "Mario Rossi")
        const targetUser = staff.find(s => s.name.toLowerCase().startsWith(lowerInputName) && !s.name.toLowerCase().includes('cassa'));

        if (!targetUser) return false;

        // Logica Password:
        // Se l'utente ha una password nel DB -> usa quella
        // Se NON ha password -> usa il nome (prima parte) in minuscolo
        const firstName = targetUser.name.split(' ')[0].toLowerCase();
        const expectedPwd = (targetUser.password && targetUser.password.trim() !== '') 
            ? targetUser.password 
            : firstName;

        if (password === expectedPwd) {
            setActiveBarUser(targetUser);
            localStorage.setItem('bar_user_id', targetUser.id);
            await BarService.updateStaffLastSeen(targetUser.id);
            return true;
        }

        return false;
    };

    const logoutBarUser = () => {
        setActiveBarUser(null);
        localStorage.removeItem('bar_user_id');
    };

    useEffect(() => {
        const unsubs = [
            BarService.subscribeToProducts(setProducts),
            BarService.subscribeToStaff(setStaff),
            BarService.subscribeToOrders(setOrders),
            BarService.subscribeToCashMovements(setCashMovements),
            BarService.subscribeToAdmins(setAdminList),
            BarService.subscribeToTillColors(setTillColors),
            BarService.subscribeToSeasonality(setSeasonalityConfig),
            BarService.subscribeToShiftSettings(setShiftSettings),
            BarService.subscribeToGeneralSettings(setGeneralSettings),
            BarService.subscribeToAttendance(setAttendanceRecords),
            BarService.subscribeToLaundryItems(setLaundryItems),
            BarService.subscribeToLaundryEntries(setLaundryEntries),
            VehicleService.subscribeToVehicles(setVehicles),
            VehicleService.subscribeToBookings(setVehicleBookings),
            OperationalVehicleService.subscribeToVehicles(setOperationalVehicles),
            OperationalVehicleService.subscribeToChecks(setVehicleChecks),
            InterventionService.subscribeToInterventions(setInterventions),
            InterventionService.subscribeToTypologies(setInterventionTypologies),
            InterventionService.subscribeToOfficers(setDutyOfficers),
            ReminderService.subscribeToReminders(setReminders),
            BarService.subscribeToNotifications((n) => {
                if (n) {
                    setActiveToast(n);
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
                            new Notification(n.title, { body: n.body, icon: '/logo.png' });
                        }
                        setTimeout(() => setActiveToast(null), 5000);
                    } catch(e) {}
                }
            })
        ];
        
        setIsLoading(false);
        return () => unsubs.forEach(u => u());
    }, []);

    const addProduct = (d: any, e: string) => BarService.addProduct(d, e);
    const updateProduct = (p: any) => BarService.updateProduct(p);
    const deleteProduct = (id: string) => BarService.deleteProduct(id);
    const addStaff = (d: any) => BarService.addStaff(d);
    const updateStaff = (s: any) => BarService.updateStaff(s);
    const deleteStaff = (id: string) => BarService.deleteStaff(id);
    const completeOrder = (o: any) => BarService.completeOrder(o);
    const updateOrder = (o: any) => BarService.updateOrder(o);
    const deleteOrders = (ids: string[], email: string) => BarService.deleteOrders(ids, email);
    const permanentDeleteOrder = (id: string) => BarService.permanentDeleteOrder(id);
    const addCashMovement = (d: any) => BarService.addCashMovement(d);
    const updateCashMovement = (m: any) => BarService.updateCashMovement(m);
    const deleteCashMovement = (id: string, email: string) => BarService.deleteCashMovement(id, email);
    const permanentDeleteMovement = (id: string) => BarService.permanentDeleteMovement(id);
    const resetCash = (t: 'bar'|'games') => BarService.resetCash(t, cashMovements);
    const stockPurchase = (p: string, q: number, c: number) => BarService.stockPurchase(p, q, c);
    const stockCorrection = (p: string, s: number) => BarService.stockCorrection(p, s);
    const addAdmin = (e: string, by: string) => BarService.addAdmin(e, by);
    const removeAdmin = (id: string) => BarService.removeAdmin(id);
    const saveAttendance = (t: string, i: string[], d?: string, c?: string, det?: Record<string, AttendanceStatus>, subNames?: Record<string, string>) => BarService.saveAttendance(t, i, d, c, det, subNames);
    const reopenAttendance = (id: string) => BarService.reopenAttendance(id);
    const deleteAttendance = (id: string) => BarService.deleteAttendance(id);
    const updateTillColors = (c: TillColors) => BarService.updateTillColors(c);
    const updateSeasonality = (c: SeasonalityConfig) => BarService.updateSeasonality(c);
    const updateShiftSettings = (c: ShiftSettings) => BarService.updateShiftSettings(c);
    const updateGeneralSettings = (c: GeneralSettings) => BarService.updateGeneralSettings(c);
    const sendNotification = (t: string, b: string, s: string) => BarService.sendNotification(t, b, s);
    const massDelete = (d: string, t: 'orders'|'movements') => BarService.massDelete(d, t);

    const addVehicle = (v: Omit<Vehicle, 'id'>) => VehicleService.addVehicle(v);
    const updateVehicle = (v: Vehicle) => VehicleService.updateVehicle(v);
    const deleteVehicle = (id: string) => VehicleService.deleteVehicle(id);
    const addBooking = (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => VehicleService.addBooking(b);
    const deleteBooking = (id: string) => VehicleService.deleteBooking(id);

    const addOperationalVehicle = (v: Omit<OperationalVehicle, 'id'>) => OperationalVehicleService.addVehicle(v);
    const updateOperationalVehicle = (v: OperationalVehicle) => OperationalVehicleService.updateVehicle(v);
    const deleteOperationalVehicle = (id: string) => OperationalVehicleService.deleteVehicle(id);
    const addVehicleCheck = (c: Omit<VehicleCheck, 'id'>) => OperationalVehicleService.addCheck(c);
    const updateVehicleCheck = (id: string, u: Partial<VehicleCheck>) => OperationalVehicleService.updateCheck(id, u);

    const addLaundryItem = (i: Omit<LaundryItemDef, 'id'>) => BarService.addLaundryItem(i);
    const updateLaundryItem = (i: LaundryItemDef) => BarService.updateLaundryItem(i);
    const deleteLaundryItem = (id: string) => BarService.deleteLaundryItem(id);
    const addLaundryEntry = (e: Omit<LaundryEntry, 'id'>) => BarService.addLaundryEntry(e);
    const deleteLaundryEntry = (id: string) => BarService.deleteLaundryEntry(id);

    const addIntervention = (i: Omit<Intervention, 'id'>) => InterventionService.addIntervention(i);
    const updateIntervention = (i: Intervention) => InterventionService.updateIntervention(i);
    const deleteIntervention = (id: string) => InterventionService.deleteIntervention(id);
    const permanentDeleteIntervention = (id: string) => InterventionService.permanentDeleteIntervention(id);
    const addInterventionTypology = (name: string) => InterventionService.addTypology(name);
    const deleteInterventionTypology = (id: string) => InterventionService.deleteTypology(id);
    const addDutyOfficer = (name: string) => InterventionService.addOfficer(name);
    const deleteDutyOfficer = (id: string) => InterventionService.deleteOfficer(id);

    const addReminder = (r: Omit<Reminder, 'id' | 'createdAt' | 'completedDates'>) => ReminderService.addReminder(r);
    const updateReminder = (id: string, r: Partial<Reminder>) => ReminderService.updateReminder(id, r);
    const deleteReminder = (id: string) => ReminderService.deleteReminder(id);
    const toggleReminderCompletion = (id: string, date: string, completedDates: string[]) => ReminderService.toggleCompletion(id, date, completedDates);

    return (
        <BarContext.Provider value={{
            products, staff, orders, cashMovements, adminList, tillColors, seasonalityConfig, shiftSettings, generalSettings, attendanceRecords, activeToast, isLoading, setActiveToast,
            vehicles, vehicleBookings, operationalVehicles, vehicleChecks, laundryItems, laundryEntries, interventions, interventionTypologies, dutyOfficers, reminders,
            activeBarUser, loginBarUser, logoutBarUser, onlineStaffCount,
            addProduct, updateProduct, deleteProduct, addStaff, updateStaff, deleteStaff, completeOrder, updateOrder, deleteOrders, permanentDeleteOrder,
            addCashMovement, updateCashMovement, deleteCashMovement, permanentDeleteMovement, resetCash, stockPurchase, stockCorrection,
            addAdmin, removeAdmin, saveAttendance, reopenAttendance, deleteAttendance, updateTillColors, updateSeasonality, updateShiftSettings, updateGeneralSettings, sendNotification, massDelete,
            addVehicle, updateVehicle, deleteVehicle, addBooking, deleteBooking,
            addOperationalVehicle, updateOperationalVehicle, deleteOperationalVehicle, addVehicleCheck, updateVehicleCheck,
            addLaundryItem, updateLaundryItem, deleteLaundryItem, addLaundryEntry, deleteLaundryEntry,
            addIntervention, updateIntervention, deleteIntervention, permanentDeleteIntervention, addInterventionTypology, deleteInterventionTypology, addDutyOfficer, deleteDutyOfficer,
            addReminder, updateReminder, deleteReminder, toggleReminderCompletion,
            getNow
        }}>
            {children}
        </BarContext.Provider>
    );
};

export const useBar = () => {
    const context = useContext(BarContext);
    if (context === undefined) throw new Error('useBar must be used within a BarProvider');
    return context;
};
