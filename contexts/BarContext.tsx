
import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Product, StaffMember, Order, CashMovement, TillColors, SeasonalityConfig, ShiftSettings, GeneralSettings, AttendanceRecord, AdminUser, AppNotification, AttendanceStatus, Vehicle, VehicleBooking } from '../types';
import { BarService } from '../services/barService';
import { VehicleService } from '../services/vehicleService';

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
    
    // Vehicles
    vehicles: Vehicle[];
    vehicleBookings: VehicleBooking[];

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
    
    // Vehicle Actions
    addVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
    updateVehicle: (v: Vehicle) => Promise<void>;
    deleteVehicle: (id: string) => Promise<void>;
    addBooking: (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => Promise<void>;
    deleteBooking: (id: string) => Promise<void>;

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

    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Time Offset (Difference between Server Time and Local Time in ms)
    const [timeOffset, setTimeOffset] = useState(0);

    // Fetch reliable time on mount
    useEffect(() => {
        const fetchTime = async () => {
            try {
                // Fonte attendibile per l'orario Italiano (Europe/Rome)
                const response = await fetch('https://worldtimeapi.org/api/timezone/Europe/Rome');
                if (response.ok) {
                    const data = await response.json();
                    const serverTime = new Date(data.datetime).getTime();
                    const localTime = Date.now();
                    const offset = serverTime - localTime;
                    setTimeOffset(offset);
                    console.log("Time synchronized. Offset:", offset, "ms");
                }
            } catch (error) {
                console.warn("Could not fetch world time, falling back to local clock.", error);
            }
        };
        fetchTime();
        
        // Re-sync every 30 minutes
        const interval = setInterval(fetchTime, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getNow = useCallback(() => {
        return new Date(Date.now() + timeOffset);
    }, [timeOffset]);

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
            VehicleService.subscribeToVehicles(setVehicles),
            VehicleService.subscribeToBookings(setVehicleBookings),
            BarService.subscribeToNotifications((n) => {
                if (n) {
                    setActiveToast(n);
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.volume = 0.5;
                        audio.play().catch(() => {});
                        // FIX: Check if Notification exists in window (safeguard for iOS/WebView)
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

    // Vehicle Functions
    const addVehicle = (v: Omit<Vehicle, 'id'>) => VehicleService.addVehicle(v);
    const updateVehicle = (v: Vehicle) => VehicleService.updateVehicle(v);
    const deleteVehicle = (id: string) => VehicleService.deleteVehicle(id);
    const addBooking = (b: Omit<VehicleBooking, 'id' | 'timestamp'>) => VehicleService.addBooking(b);
    const deleteBooking = (id: string) => VehicleService.deleteBooking(id);

    return (
        <BarContext.Provider value={{
            products, staff, orders, cashMovements, adminList, tillColors, seasonalityConfig, shiftSettings, generalSettings, attendanceRecords, activeToast, isLoading, setActiveToast,
            vehicles, vehicleBookings,
            addProduct, updateProduct, deleteProduct, addStaff, updateStaff, deleteStaff, completeOrder, updateOrder, deleteOrders, permanentDeleteOrder,
            addCashMovement, updateCashMovement, deleteCashMovement, permanentDeleteMovement, resetCash, stockPurchase, stockCorrection,
            addAdmin, removeAdmin, saveAttendance, reopenAttendance, deleteAttendance, updateTillColors, updateSeasonality, updateShiftSettings, updateGeneralSettings, sendNotification, massDelete,
            addVehicle, updateVehicle, deleteVehicle, addBooking, deleteBooking,
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
