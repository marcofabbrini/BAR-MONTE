import { db } from '../firebaseConfig';
import { 
    collection, 
    doc, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    setDoc,
    query, 
    orderBy, 
    writeBatch,
    QuerySnapshot,
    DocumentData
} from 'firebase/firestore';
import { 
    Product, 
    StaffMember, 
    Order, 
    CashMovement, 
    AdminUser, 
    TillColors, 
    SeasonalityConfig, 
    ShiftSettings, 
    GeneralSettings, 
    AttendanceRecord,
    LaundryItemDef,
    LaundryEntry,
    LaundryShipment,
    CustomRole
} from '../types';

export const BarService = {
    // --- SUBSCRIPTIONS ---
    subscribeToProducts: (onUpdate: (data: Product[]) => void) => {
        return onSnapshot(collection(db, 'products'), (snapshot: QuerySnapshot<DocumentData>) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
        });
    },
    subscribeToStaff: (onUpdate: (data: StaffMember[]) => void) => {
        return onSnapshot(collection(db, 'staff'), (snapshot: QuerySnapshot<DocumentData>) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember)));
        });
    },
    subscribeToOrders: (onUpdate: (data: Order[]) => void) => {
        const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc')); 
        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
        });
    },
    subscribeToCashMovements: (onUpdate: (data: CashMovement[]) => void) => {
        const q = query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement)));
        });
    },
    subscribeToAdmins: (onUpdate: (data: AdminUser[]) => void) => {
        return onSnapshot(collection(db, 'admins'), (snapshot: QuerySnapshot<DocumentData>) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser)));
        });
    },
    subscribeToCustomRoles: (onUpdate: (data: CustomRole[]) => void) => {
        return onSnapshot(collection(db, 'custom_roles'), (snapshot: QuerySnapshot<DocumentData>) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CustomRole)));
        });
    },
    subscribeToTillColors: (onUpdate: (data: TillColors) => void) => {
        return onSnapshot(doc(db, 'settings', 'tillColors'), (doc) => {
            if (doc.exists()) onUpdate(doc.data() as TillColors);
        });
    },
    subscribeToSeasonality: (onUpdate: (data: SeasonalityConfig) => void) => {
        return onSnapshot(doc(db, 'settings', 'seasonality'), (doc) => {
            if (doc.exists()) onUpdate(doc.data() as SeasonalityConfig);
        });
    },
    subscribeToShiftSettings: (onUpdate: (data: ShiftSettings) => void) => {
        return onSnapshot(doc(db, 'settings', 'shifts'), (doc) => {
            if (doc.exists()) onUpdate(doc.data() as ShiftSettings);
        });
    },
    subscribeToGeneralSettings: (onUpdate: (data: GeneralSettings) => void) => {
        return onSnapshot(doc(db, 'settings', 'general'), (doc) => {
            if (doc.exists()) onUpdate(doc.data() as GeneralSettings);
        });
    },
    subscribeToAttendance: (onUpdate: (data: AttendanceRecord[]) => void) => {
        const q = query(collection(db, 'attendance'), orderBy('date', 'desc'));
        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord)));
        });
    },
    
    // Laundry Subscriptions
    subscribeToLaundryItems: (onUpdate: (data: LaundryItemDef[]) => void) => {
        return onSnapshot(collection(db, 'laundry_items'), (s) => onUpdate(s.docs.map(d => ({...d.data(), id: d.id} as LaundryItemDef))));
    },
    subscribeToLaundryEntries: (onUpdate: (data: LaundryEntry[]) => void) => {
        const q = query(collection(db, 'laundry_entries'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (s) => onUpdate(s.docs.map(d => ({...d.data(), id: d.id} as LaundryEntry))));
    },
    subscribeToLaundryShipments: (onUpdate: (data: LaundryShipment[]) => void) => {
        const q = query(collection(db, 'laundry_shipments'), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (s) => onUpdate(s.docs.map(d => ({...d.data(), id: d.id} as LaundryShipment))));
    },

    // --- ACTIONS ---
    // Product
    addProduct: async (p: any) => addDoc(collection(db, 'products'), p),
    updateProduct: async (p: any) => updateDoc(doc(db, 'products', p.id), p),
    deleteProduct: async (id: string) => deleteDoc(doc(db, 'products', id)),
    
    // Staff
    addStaff: async (s: any) => addDoc(collection(db, 'staff'), s),
    updateStaff: async (s: any) => updateDoc(doc(db, 'staff', s.id), s),
    deleteStaff: async (id: string) => deleteDoc(doc(db, 'staff', id)),

    // Orders
    addOrder: async (o: any) => addDoc(collection(db, 'orders'), o),
    updateOrder: async (o: any) => updateDoc(doc(db, 'orders', o.id), o),
    deleteOrder: async (id: string, user: string) => updateDoc(doc(db, 'orders', id), { isDeleted: true, deletedBy: user, deletedAt: new Date().toISOString() }),
    permanentDeleteOrder: async (id: string) => deleteDoc(doc(db, 'orders', id)),

    // Cash
    addCashMovement: async (m: any) => addDoc(collection(db, 'cash_movements'), m),
    updateCashMovement: async (m: any) => updateDoc(doc(db, 'cash_movements', m.id), m),
    deleteCashMovement: async (id: string, user: string) => updateDoc(doc(db, 'cash_movements', id), { isDeleted: true, deletedBy: user, deletedAt: new Date().toISOString() }),
    permanentDeleteMovement: async (id: string) => deleteDoc(doc(db, 'cash_movements', id)),
    
    // Admins
    addAdmin: async (email: string) => addDoc(collection(db, 'admins'), { email, timestamp: new Date().toISOString() }),
    removeAdmin: async (id: string) => deleteDoc(doc(db, 'admins', id)),

    // Roles
    addCustomRole: async (role: Omit<CustomRole, 'id'>) => addDoc(collection(db, 'custom_roles'), role),
    deleteCustomRole: async (id: string) => deleteDoc(doc(db, 'custom_roles', id)),

    // Settings
    updateTillColors: async (colors: TillColors) => setDoc(doc(db, 'settings', 'tillColors'), colors),
    updateSeasonality: async (cfg: SeasonalityConfig) => setDoc(doc(db, 'settings', 'seasonality'), cfg),
    updateShiftSettings: async (cfg: ShiftSettings) => setDoc(doc(db, 'settings', 'shifts'), cfg),
    updateGeneralSettings: async (cfg: GeneralSettings) => setDoc(doc(db, 'settings', 'general'), cfg),

    // Attendance
    saveAttendance: async (record: any) => {
        if(record.id) {
            await updateDoc(doc(db, 'attendance', record.id), record);
        } else {
            // Check duplicati gestito logicamente in FE o qui con query se necessario
            await addDoc(collection(db, 'attendance'), record);
        }
    },
    deleteAttendance: async (id: string) => deleteDoc(doc(db, 'attendance', id)),
    reopenAttendance: async (id: string) => updateDoc(doc(db, 'attendance', id), { closedAt: null, closedBy: null }),

    // Laundry
    addLaundryItem: async (item: any) => addDoc(collection(db, 'laundry_items'), item),
    updateLaundryItem: async (item: any) => updateDoc(doc(db, 'laundry_items', item.id), item),
    deleteLaundryItem: async (id: string) => deleteDoc(doc(db, 'laundry_items', id)),

    addLaundryEntry: async (entry: any) => addDoc(collection(db, 'laundry_entries'), entry),
    deleteLaundryEntry: async (id: string) => deleteDoc(doc(db, 'laundry_entries', id)),

    createLaundryShipment: async (shipment: Omit<LaundryShipment, 'id'>, entryIds: string[]) => {
        const batch = writeBatch(db);
        const shipRef = doc(collection(db, 'laundry_shipments'));
        batch.set(shipRef, shipment);
        
        entryIds.forEach(id => {
            const entryRef = doc(db, 'laundry_entries', id);
            batch.update(entryRef, { shipmentId: shipRef.id });
        });
        await batch.commit();
    },
    updateLaundryShipment: async (id: string, updates: Partial<LaundryShipment>) => updateDoc(doc(db, 'laundry_shipments', id), updates),
    deleteLaundryShipment: async (id: string) => deleteDoc(doc(db, 'laundry_shipments', id)),
};