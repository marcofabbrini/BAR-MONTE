
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    Product, StaffMember, Order, CashMovement, AdminUser, TillColors, 
    SeasonalityConfig, ShiftSettings, GeneralSettings, AttendanceRecord,
    Vehicle, VehicleBooking, OperationalVehicle, VehicleCheck,
    LaundryItemDef, LaundryEntry, LaundryShipment,
    Intervention, InterventionTypology, DutyOfficer,
    Reminder, CustomRole, AppNotification,
    AttendanceStatus, UserRole, MonthlyClosure
} from '../types';
import { BarService } from '../services/barService';
import { VehicleService } from '../services/vehicleService';
import { OperationalVehicleService } from '../services/operationalVehicleService';
import { InterventionService } from '../services/interventionService';
import { ReminderService } from '../services/reminderService';
import { USER_ROLES } from '../constants';

interface BarContextType {
    // Data
    products: Product[];
    staff: StaffMember[];
    orders: Order[];
    cashMovements: CashMovement[];
    adminList: AdminUser[];
    tillColors: TillColors;
    seasonalityConfig?: SeasonalityConfig;
    shiftSettings: ShiftSettings;
    generalSettings?: GeneralSettings;
    attendanceRecords: AttendanceRecord[];
    vehicles: Vehicle[];
    vehicleBookings: VehicleBooking[];
    operationalVehicles: OperationalVehicle[];
    vehicleChecks: VehicleCheck[];
    laundryItems: LaundryItemDef[];
    laundryEntries: LaundryEntry[];
    laundryShipments: LaundryShipment[];
    interventions: Intervention[];
    interventionTypologies: InterventionTypology[];
    dutyOfficers: DutyOfficer[];
    reminders: Reminder[];
    customRoles: CustomRole[];
    monthlyClosures: MonthlyClosure[];
    
    // UI
    activeToast: AppNotification | null;
    isLoading: boolean;
    setActiveToast: (n: AppNotification | null) => void;
    sendNotification: (title: string, body: string, target?: string) => Promise<void>;

    // Core Actions
    addProduct: (p: Omit<Product, 'id'>, user: string) => Promise<void>;
    updateProduct: (p: Product) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
    
    addStaff: (s: Omit<StaffMember, 'id'>) => Promise<void>;
    updateStaff: (s: StaffMember) => Promise<void>;
    deleteStaff: (id: string) => Promise<void>;
    
    completeOrder: (o: Omit<Order, 'id'>) => Promise<void>;
    updateOrder: (o: Order) => Promise<void>;
    deleteOrders: (ids: string[], user: string) => Promise<void>;
    permanentDeleteOrder: (id: string) => Promise<void>;
    
    addCashMovement: (m: Omit<CashMovement, 'id'>) => Promise<void>;
    updateCashMovement: (m: CashMovement) => Promise<void>;
    deleteCashMovement: (id: string, user: string) => Promise<void>;
    permanentDeleteMovement: (id: string) => Promise<void>;
    resetCash: (type: 'bar' | 'games') => Promise<void>;
    
    stockPurchase: (prodId: string, qty: number, cost: number) => Promise<void>;
    stockCorrection: (prodId: string, newStock: number) => Promise<void>;
    massDelete: (date: string, type: 'orders' | 'movements') => Promise<void>;

    addAdmin: (email: string, user: string) => Promise<void>;
    removeAdmin: (id: string) => Promise<void>;

    updateTillColors: (c: TillColors) => Promise<void>;
    updateSeasonality: (cfg: SeasonalityConfig) => Promise<void>;
    updateShiftSettings: (cfg: ShiftSettings) => Promise<void>;
    updateGeneralSettings: (cfg: GeneralSettings) => Promise<void>;
    updateMonthlyClosure: (id: string, data: Partial<MonthlyClosure>) => Promise<void>;

    saveAttendance: (tillId: string, presentStaffIds: string[], dateOverride?: string, closedBy?: string, details?: Record<string, AttendanceStatus>, substitutionNames?: Record<string, string>) => Promise<void>;
    reopenAttendance: (id: string) => Promise<void>;
    deleteAttendance: (id: string) => Promise<void>;

    // Fleet
    addVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
    updateVehicle: (v: Vehicle) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
    addBooking: (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => Promise<void>;
    updateBooking: (b: VehicleBooking) => Promise<void>;
    deleteBooking: (id: string) => Promise<void>;

    // Operational Vehicles
    addOperationalVehicle: (v: Omit<OperationalVehicle, 'id'>) => Promise<void>;
    updateOperationalVehicle: (v: OperationalVehicle) => Promise<void>;
    deleteOperationalVehicle: (id: string) => Promise<void>;
    addVehicleCheck: (c: Omit<VehicleCheck, 'id'>) => Promise<void>;
    updateVehicleCheck: (id: string, u: Partial<VehicleCheck>) => Promise<void>;

    // Laundry
    addLaundryItem: (i: Omit<LaundryItemDef, 'id'>) => Promise<void>;
    updateLaundryItem: (i: LaundryItemDef) => Promise<void>;
    deleteLaundryItem: (id: string) => Promise<void>;
    addLaundryEntry: (e: Omit<LaundryEntry, 'id'>) => Promise<void>;
    deleteLaundryEntry: (id: string) => Promise<void>;
    createLaundryShipment: (s: Omit<LaundryShipment, 'id'>, entryIds: string[]) => Promise<void>;
    updateLaundryShipment: (id: string, u: Partial<LaundryShipment>) => Promise<void>;
    deleteLaundryShipment: (id: string) => Promise<void>;

    // Interventions
    addIntervention: (i: Omit<Intervention, 'id'>) => Promise<void>;
    updateIntervention: (i: Intervention) => Promise<void>;
    deleteIntervention: (id: string) => Promise<void>;
    permanentDeleteIntervention: (id: string) => Promise<void>;
    addInterventionTypology: (name: string) => Promise<void>;
    deleteInterventionTypology: (id: string) => Promise<void>;
    addDutyOfficer: (name: string) => Promise<void>;
    deleteDutyOfficer: (id: string) => Promise<void>;

    // Reminders
    addReminder: (r: Omit<Reminder, 'id' | 'createdAt' | 'completedDates'>) => Promise<void>;
    updateReminder: (id: string, r: Partial<Reminder>) => Promise<void>;
    deleteReminder: (id: string) => Promise<void>;
    toggleReminderCompletion: (id: string, date: string, currentCompleted: string[]) => Promise<void>;

    // Roles
    addCustomRole: (r: Omit<CustomRole, 'id'>) => Promise<void>;
    deleteCustomRole: (id: string) => Promise<void>;
    availableRoles: {id: string, label: string, level: number}[];

    // Auth & Utils
    activeBarUser: StaffMember | null;
    loginBarUser: (username: string, pass: string) => Promise<boolean>;
    logoutBarUser: () => void;
    getNow: () => Date;
}

const BarContext = createContext<BarContextType | undefined>(undefined);

export const BarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- STATE ---
    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
    const [adminList, setAdminList] = useState<AdminUser[]>([]);
    const [tillColors, setTillColors] = useState<TillColors>({});
    const [seasonalityConfig, setSeasonalityConfig] = useState<SeasonalityConfig | undefined>(undefined);
    const [shiftSettings, setShiftSettings] = useState<ShiftSettings>({ anchorDate: '2025-12-20', anchorShift: 'b' });
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings | undefined>(undefined);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vehicleBookings, setVehicleBookings] = useState<VehicleBooking[]>([]);
    const [operationalVehicles, setOperationalVehicles] = useState<OperationalVehicle[]>([]);
    const [vehicleChecks, setVehicleChecks] = useState<VehicleCheck[]>([]);
    const [laundryItems, setLaundryItems] = useState<LaundryItemDef[]>([]);
    const [laundryEntries, setLaundryEntries] = useState<LaundryEntry[]>([]);
    const [laundryShipments, setLaundryShipments] = useState<LaundryShipment[]>([]);
    const [interventions, setInterventions] = useState<Intervention[]>([]);
    const [interventionTypologies, setInterventionTypologies] = useState<InterventionTypology[]>([]);
    const [dutyOfficers, setDutyOfficers] = useState<DutyOfficer[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
    const [monthlyClosures, setMonthlyClosures] = useState<MonthlyClosure[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const [now, setNow] = useState(new Date());
    const [activeBarUser, setActiveBarUser] = useState<StaffMember | null>(null);

    // --- SUBSCRIPTIONS ---
    useEffect(() => {
        const unsubProducts = BarService.subscribeToProducts(setProducts);
        const unsubStaff = BarService.subscribeToStaff(setStaff);
        const unsubOrders = BarService.subscribeToOrders(setOrders);
        const unsubCash = BarService.subscribeToCashMovements(setCashMovements);
        const unsubAdmins = BarService.subscribeToAdmins(setAdminList);
        const unsubColors = BarService.subscribeToTillColors(setTillColors);
        const unsubSeas = BarService.subscribeToSeasonality(setSeasonalityConfig);
        const unsubShifts = BarService.subscribeToShiftSettings(setShiftSettings);
        const unsubGeneral = BarService.subscribeToGeneralSettings(setGeneralSettings);
        const unsubAtt = BarService.subscribeToAttendance(setAttendanceRecords);
        const unsubVeh = VehicleService.subscribeToVehicles(setVehicles);
        const unsubBook = VehicleService.subscribeToBookings(setVehicleBookings);
        const unsubOpVeh = OperationalVehicleService.subscribeToVehicles(setOperationalVehicles);
        const unsubChecks = OperationalVehicleService.subscribeToChecks(setVehicleChecks);
        const unsubLItems = BarService.subscribeToLaundryItems(setLaundryItems);
        const unsubLEntry = BarService.subscribeToLaundryEntries(setLaundryEntries);
        const unsubLShip = BarService.subscribeToLaundryShipments(setLaundryShipments);
        const unsubInt = InterventionService.subscribeToInterventions(setInterventions);
        const unsubIntType = InterventionService.subscribeToTypologies(setInterventionTypologies);
        const unsubOff = InterventionService.subscribeToOfficers(setDutyOfficers);
        const unsubRem = ReminderService.subscribeToReminders(setReminders);
        const unsubRoles = BarService.subscribeToCustomRoles(setCustomRoles);
        const unsubClosures = BarService.subscribeToMonthlyClosures(setMonthlyClosures);

        const timer = setInterval(() => setNow(new Date()), 30000); // Update "now" every 30s

        // Load Auth from LocalStorage
        const savedUser = localStorage.getItem('bar_user_id');
        if(savedUser) {
            // We need staff loaded first, but effect runs parallel.
            // We'll fix this by checking in the staff subscription or separately
        }

        setIsLoading(false);

        return () => {
            unsubProducts(); unsubStaff(); unsubOrders(); unsubCash(); unsubAdmins();
            unsubColors(); unsubSeas(); unsubShifts(); unsubGeneral(); unsubAtt();
            unsubVeh(); unsubBook(); unsubOpVeh(); unsubChecks();
            unsubLItems(); unsubLEntry(); unsubLShip();
            unsubInt(); unsubIntType(); unsubOff(); unsubRem(); unsubRoles();
            unsubClosures();
            clearInterval(timer);
        };
    }, []);

    // Sync Auth State with Staff List
    useEffect(() => {
        const savedUserId = localStorage.getItem('bar_user_id');
        if (savedUserId && staff.length > 0) {
            const user = staff.find(s => s.id === savedUserId);
            if (user) setActiveBarUser(user);
        }
    }, [staff]);

    const getNow = () => now;

    // --- ACTIONS IMPLEMENTATION ---
    const addProduct = async (p: Omit<Product, 'id'>, user: string) => { await BarService.addProduct(p); };
    const updateProduct = (p: Product) => BarService.updateProduct(p);
    const deleteProduct = (id: string) => BarService.deleteProduct(id);

    const addStaff = async (s: Omit<StaffMember, 'id'>) => { await BarService.addStaff(s); };
    const updateStaff = (s: StaffMember) => BarService.updateStaff(s);
    const deleteStaff = (id: string) => BarService.deleteStaff(id);

    const completeOrder = async (o: Omit<Order, 'id'>) => { await BarService.addOrder(o); };
    const updateOrder = (o: Order) => BarService.updateOrder(o);
    const deleteOrders = async (ids: string[], user: string) => {
        for (const id of ids) await BarService.deleteOrder(id, user);
    };
    const permanentDeleteOrder = (id: string) => BarService.permanentDeleteOrder(id);

    const addCashMovement = async (m: Omit<CashMovement, 'id'>) => { await BarService.addCashMovement(m); };
    const updateCashMovement = (m: CashMovement) => BarService.updateCashMovement(m);
    const deleteCashMovement = (id: string, user: string) => BarService.deleteCashMovement(id, user);
    const permanentDeleteMovement = (id: string) => BarService.permanentDeleteMovement(id);
    const resetCash = async (type: 'bar' | 'games') => {
        // Implementation logic depends on requirement, here simplified
        // Normally this would archive current movements or delete them.
        // Assuming clearing movements for this demo.
        // A proper implementation would likely snapshot the balance and archive.
        console.warn("Reset Cash not fully implemented in service for safety.");
    };

    const stockPurchase = async (prodId: string, qty: number, cost: number) => {
        const prod = products.find(p => p.id === prodId);
        if(!prod) return;
        
        await BarService.updateProduct({ ...prod, stock: prod.stock + qty, costPrice: cost });
        await BarService.addCashMovement({
            amount: qty * cost,
            reason: `Acquisto Stock: ${prod.name} (x${qty})`,
            timestamp: new Date().toISOString(),
            type: 'withdrawal',
            category: 'bar'
        });
    };

    const stockCorrection = async (prodId: string, newStock: number) => {
        const prod = products.find(p => p.id === prodId);
        if(prod) await BarService.updateProduct({ ...prod, stock: newStock });
    };

    const massDelete = async (date: string, type: 'orders' | 'movements') => {
        // Implementation requires query by date and batch delete
        console.warn("Mass delete logic needs careful implementation.");
    };

    const addAdmin = async (email: string, user: string) => { await BarService.addAdmin(email); };
    const removeAdmin = (id: string) => BarService.removeAdmin(id);

    // Settings Wrappers
    const updateTillColors = async (c: TillColors) => { await BarService.updateTillColors(c); };
    const updateSeasonality = async (cfg: SeasonalityConfig) => { await BarService.updateSeasonality(cfg); };
    const updateShiftSettings = async (cfg: ShiftSettings) => { await BarService.updateShiftSettings(cfg); };
    const updateGeneralSettings = async (cfg: GeneralSettings) => { await BarService.updateGeneralSettings(cfg); };
    const updateMonthlyClosure = async (id: string, data: Partial<MonthlyClosure>) => { await BarService.updateMonthlyClosure(id, data); };

    // Attendance
    const saveAttendance = async (tillId: string, presentIds: string[], dateOverride?: string, closedBy?: string, details?: Record<string, AttendanceStatus>, substitutionNames?: Record<string, string>) => {
        const recordId = `${dateOverride || new Date().toISOString().split('T')[0]}_${tillId}`;
        const record: AttendanceRecord = {
            id: recordId,
            date: dateOverride || new Date().toISOString().split('T')[0],
            tillId,
            presentStaffIds: presentIds,
            timestamp: new Date().toISOString(),
            attendanceDetails: details,
            substitutionNames: substitutionNames
        };
        if(closedBy) {
            record.closedBy = closedBy;
            record.closedAt = new Date().toISOString();
        }
        await BarService.saveAttendance(record);
    };
    const reopenAttendance = async (id: string) => { await BarService.reopenAttendance(id); };
    const deleteAttendance = async (id: string) => { await BarService.deleteAttendance(id); };

    // Fleet & Op Vehicles
    const addVehicle = async (v: Omit<Vehicle, 'id'>) => { await VehicleService.addVehicle(v); };
    const updateVehicle = (v: Vehicle) => VehicleService.updateVehicle(v);
    const deleteVehicle = (id: string) => VehicleService.deleteVehicle(id);
    const addBooking = async (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => { await VehicleService.addBooking(b); };
    const updateBooking = (b: VehicleBooking) => VehicleService.updateBooking(b);
    const deleteBooking = (id: string) => VehicleService.deleteBooking(id);

    const addOperationalVehicle = async (v: Omit<OperationalVehicle, 'id'>) => { await OperationalVehicleService.addVehicle(v); };
    const updateOperationalVehicle = (v: OperationalVehicle) => OperationalVehicleService.updateVehicle(v);
    const deleteOperationalVehicle = (id: string) => OperationalVehicleService.deleteVehicle(id);
    const addVehicleCheck = async (c: Omit<VehicleCheck, 'id'>) => { await OperationalVehicleService.addCheck(c); };
    const updateVehicleCheck = (id: string, u: Partial<VehicleCheck>) => OperationalVehicleService.updateCheck(id, u);

    // Laundry
    const addLaundryItem = async (i: Omit<LaundryItemDef, 'id'>) => { await BarService.addLaundryItem(i); };
    const updateLaundryItem = (i: LaundryItemDef) => BarService.updateLaundryItem(i);
    const deleteLaundryItem = (id: string) => BarService.deleteLaundryItem(id);
    const addLaundryEntry = async (e: Omit<LaundryEntry, 'id'>) => { await BarService.addLaundryEntry(e); };
    const deleteLaundryEntry = (id: string) => BarService.deleteLaundryEntry(id);
    const createLaundryShipment = async (s: Omit<LaundryShipment, 'id'>, entryIds: string[]) => { await BarService.createLaundryShipment(s, entryIds); };
    const updateLaundryShipment = (id: string, u: Partial<LaundryShipment>) => BarService.updateLaundryShipment(id, u);
    const deleteLaundryShipment = (id: string) => BarService.deleteLaundryShipment(id);

    // Intervention
    const addIntervention = async (i: Omit<Intervention, 'id'>) => { await InterventionService.addIntervention(i); };
    const updateIntervention = (i: Intervention) => InterventionService.updateIntervention(i);
    const deleteIntervention = (id: string) => InterventionService.deleteIntervention(id, activeBarUser?.name || 'User');
    const permanentDeleteIntervention = (id: string) => InterventionService.permanentDeleteIntervention(id);
    const addInterventionTypology = async (name: string) => { await InterventionService.addTypology(name); };
    const deleteInterventionTypology = (id: string) => InterventionService.deleteTypology(id);
    const addDutyOfficer = async (name: string) => { await InterventionService.addOfficer(name); };
    const deleteDutyOfficer = (id: string) => InterventionService.deleteOfficer(id);

    // Reminders
    const addReminder = async (r: Omit<Reminder, 'id' | 'createdAt' | 'completedDates'>) => { await ReminderService.addReminder(r); };
    const updateReminder = (id: string, r: Partial<Reminder>) => ReminderService.updateReminder(id, r);
    const deleteReminder = (id: string) => ReminderService.deleteReminder(id);
    const toggleReminderCompletion = (id: string, date: string, current: string[]) => ReminderService.toggleCompletion(id, date, current);

    // Roles
    const addCustomRole = async (r: Omit<CustomRole, 'id'>) => { await BarService.addCustomRole(r); };
    const deleteCustomRole = (id: string) => BarService.deleteCustomRole(id);

    const availableRoles = [
        ...USER_ROLES,
        ...customRoles.map(r => ({ id: r.id, label: r.label, level: r.level }))
    ];

    // Notification
    const sendNotification = async (title: string, body: string, target?: string) => {
        // Simplified: Just shows local toast for now
        setActiveToast({ id: Date.now().toString(), title, body, timestamp: new Date().toISOString() });
        setTimeout(() => setActiveToast(null), 5000);
    };

    // Auth
    const loginBarUser = async (username: string, pass: string): Promise<boolean> => {
        // Case insensitive username match
        const user = staff.find(s => 
            (s.username?.toLowerCase() === username.toLowerCase() || s.name.toLowerCase() === username.toLowerCase())
        );
        
        if (user) {
            // Simple password check (if set)
            if (user.password && user.password !== pass) return false;
            
            // Success
            setActiveBarUser(user);
            localStorage.setItem('bar_user_id', user.id);
            // Update last seen
            await BarService.updateStaff({ ...user, lastSeen: new Date().toISOString() });
            return true;
        }
        return false;
    };

    const logoutBarUser = () => {
        setActiveBarUser(null);
        localStorage.removeItem('bar_user_id');
    };

    return (
        <BarContext.Provider value={{
            products, staff, orders, cashMovements, adminList, tillColors, seasonalityConfig, shiftSettings, generalSettings, attendanceRecords,
            vehicles, vehicleBookings, operationalVehicles, vehicleChecks,
            laundryItems, laundryEntries, laundryShipments,
            interventions, interventionTypologies, dutyOfficers, reminders, customRoles, monthlyClosures,
            activeToast, isLoading, setActiveToast, sendNotification,
            addProduct, updateProduct, deleteProduct,
            addStaff, updateStaff, deleteStaff,
            completeOrder, updateOrder, deleteOrders, permanentDeleteOrder,
            addCashMovement, updateCashMovement, deleteCashMovement, permanentDeleteMovement, resetCash,
            stockPurchase, stockCorrection, massDelete,
            addAdmin, removeAdmin,
            updateTillColors, updateSeasonality, updateShiftSettings, updateGeneralSettings, updateMonthlyClosure,
            saveAttendance, reopenAttendance, deleteAttendance,
            addVehicle, updateVehicle, deleteVehicle, addBooking, deleteBooking, updateBooking,
            addOperationalVehicle, updateOperationalVehicle, deleteOperationalVehicle, addVehicleCheck, updateVehicleCheck,
            addLaundryItem, updateLaundryItem, deleteLaundryItem, addLaundryEntry, deleteLaundryEntry, createLaundryShipment, updateLaundryShipment, deleteLaundryShipment,
            addIntervention, updateIntervention, deleteIntervention, permanentDeleteIntervention, addInterventionTypology, deleteInterventionTypology, addDutyOfficer, deleteDutyOfficer,
            addReminder, updateReminder, deleteReminder, toggleReminderCompletion,
            addCustomRole, deleteCustomRole, availableRoles,
            activeBarUser, loginBarUser, logoutBarUser, getNow
        }}>
            {children}
        </BarContext.Provider>
    );
};

export const useBar = () => {
    const context = useContext(BarContext);
    if (context === undefined) {
        throw new Error('useBar must be used within a BarProvider');
    }
    return context;
};
