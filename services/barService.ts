
import { db } from '../firebaseConfig';
import firebase from 'firebase/compat/app';
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
    CustomRole,
    MonthlyClosure
} from '../types';

export const BarService = {
    // --- SUBSCRIPTIONS ---
    subscribeToProducts: (onUpdate: (data: Product[]) => void) => {
        return db.collection('products').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product)));
        });
    },
    subscribeToStaff: (onUpdate: (data: StaffMember[]) => void) => {
        return db.collection('staff').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember)));
        });
    },
    subscribeToOrders: (onUpdate: (data: Order[]) => void) => {
        return db.collection('orders').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
        });
    },
    subscribeToCashMovements: (onUpdate: (data: CashMovement[]) => void) => {
        return db.collection('cash_movements').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement)));
        });
    },
    subscribeToAdmins: (onUpdate: (data: AdminUser[]) => void) => {
        return db.collection('admins').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser)));
        });
    },
    subscribeToCustomRoles: (onUpdate: (data: CustomRole[]) => void) => {
        return db.collection('custom_roles').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CustomRole)));
        });
    },
    subscribeToTillColors: (onUpdate: (data: TillColors) => void) => {
        return db.collection('settings').doc('tillColors').onSnapshot((doc) => {
            if (doc.exists) onUpdate(doc.data() as TillColors);
        });
    },
    subscribeToSeasonality: (onUpdate: (data: SeasonalityConfig) => void) => {
        return db.collection('settings').doc('seasonality').onSnapshot((doc) => {
            if (doc.exists) onUpdate(doc.data() as SeasonalityConfig);
        });
    },
    subscribeToShiftSettings: (onUpdate: (data: ShiftSettings) => void) => {
        return db.collection('settings').doc('shifts').onSnapshot((doc) => {
            if (doc.exists) onUpdate(doc.data() as ShiftSettings);
        });
    },
    subscribeToGeneralSettings: (onUpdate: (data: GeneralSettings) => void) => {
        return db.collection('settings').doc('general').onSnapshot((doc) => {
            if (doc.exists) onUpdate(doc.data() as GeneralSettings);
        });
    },
    subscribeToAttendance: (onUpdate: (data: AttendanceRecord[]) => void) => {
        return db.collection('attendance').orderBy('date', 'desc').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord)));
        });
    },
    // NEW: Monthly Closures
    subscribeToMonthlyClosures: (onUpdate: (data: MonthlyClosure[]) => void) => {
        return db.collection('monthly_closures').onSnapshot((snapshot) => {
            onUpdate(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MonthlyClosure)));
        });
    },
    
    // Laundry Subscriptions
    subscribeToLaundryItems: (onUpdate: (data: LaundryItemDef[]) => void) => {
        return db.collection('laundry_items').onSnapshot((s) => onUpdate(s.docs.map(d => ({...d.data(), id: d.id} as LaundryItemDef))));
    },
    subscribeToLaundryEntries: (onUpdate: (data: LaundryEntry[]) => void) => {
        return db.collection('laundry_entries').orderBy('timestamp', 'desc').onSnapshot((s) => onUpdate(s.docs.map(d => ({...d.data(), id: d.id} as LaundryEntry))));
    },
    subscribeToLaundryShipments: (onUpdate: (data: LaundryShipment[]) => void) => {
        return db.collection('laundry_shipments').orderBy('timestamp', 'desc').onSnapshot((s) => onUpdate(s.docs.map(d => ({...d.data(), id: d.id} as LaundryShipment))));
    },

    // --- ACTIONS ---
    // Product
    addProduct: async (p: any) => db.collection('products').add(p),
    updateProduct: async (p: any) => db.collection('products').doc(p.id).update(p),
    deleteProduct: async (id: string) => db.collection('products').doc(id).delete(),
    
    // Staff
    addStaff: async (s: any) => db.collection('staff').add(s),
    updateStaff: async (s: any) => db.collection('staff').doc(s.id).update(s),
    deleteStaff: async (id: string) => db.collection('staff').doc(id).delete(),

    // Orders - Updated to handle stock reduction
    addOrder: async (o: any) => {
        const batch = db.batch();
        const orderRef = db.collection('orders').doc();
        batch.set(orderRef, o);

        // Update stock for each item
        if (o.items && Array.isArray(o.items)) {
            o.items.forEach((item: any) => {
                if (item.product && item.product.id) {
                    const productRef = db.collection('products').doc(item.product.id);
                    batch.update(productRef, {
                        stock: firebase.firestore.FieldValue.increment(-item.quantity)
                    });
                }
            });
        }

        await batch.commit();
    },
    updateOrder: async (o: any) => db.collection('orders').doc(o.id).update(o),
    deleteOrder: async (id: string, user: string) => db.collection('orders').doc(id).update({ isDeleted: true, deletedBy: user, deletedAt: new Date().toISOString() }),
    permanentDeleteOrder: async (id: string) => db.collection('orders').doc(id).delete(),

    // Cash
    addCashMovement: async (m: any) => db.collection('cash_movements').add(m),
    updateCashMovement: async (m: any) => db.collection('cash_movements').doc(m.id).update(m),
    deleteCashMovement: async (id: string, user: string) => db.collection('cash_movements').doc(id).update({ isDeleted: true, deletedBy: user, deletedAt: new Date().toISOString() }),
    permanentDeleteMovement: async (id: string) => db.collection('cash_movements').doc(id).delete(),
    
    // Admins
    addAdmin: async (email: string) => db.collection('admins').add({ email, timestamp: new Date().toISOString() }),
    removeAdmin: async (id: string) => db.collection('admins').doc(id).delete(),

    // Roles
    addCustomRole: async (role: Omit<CustomRole, 'id'>) => db.collection('custom_roles').add(role),
    deleteCustomRole: async (id: string) => db.collection('custom_roles').doc(id).delete(),

    // Settings
    updateTillColors: async (colors: TillColors) => db.collection('settings').doc('tillColors').set(colors),
    updateSeasonality: async (cfg: SeasonalityConfig) => db.collection('settings').doc('seasonality').set(cfg),
    updateShiftSettings: async (cfg: ShiftSettings) => db.collection('settings').doc('shifts').set(cfg),
    updateGeneralSettings: async (cfg: GeneralSettings) => db.collection('settings').doc('general').set(cfg),

    // Monthly Closure
    updateMonthlyClosure: async (id: string, data: Partial<MonthlyClosure>) => {
        // Use set with merge to create if not exists
        await db.collection('monthly_closures').doc(id).set(data, { merge: true });
    },

    // Attendance
    saveAttendance: async (record: any) => {
        if(record.id) {
            await db.collection('attendance').doc(record.id).set(record, { merge: true });
        } else {
            await db.collection('attendance').add(record);
        }
    },
    deleteAttendance: async (id: string) => db.collection('attendance').doc(id).delete(),
    reopenAttendance: async (id: string) => db.collection('attendance').doc(id).update({ closedAt: null, closedBy: null }),

    // Laundry
    addLaundryItem: async (item: any) => db.collection('laundry_items').add(item),
    updateLaundryItem: async (item: any) => db.collection('laundry_items').doc(item.id).update(item),
    deleteLaundryItem: async (id: string) => db.collection('laundry_items').doc(id).delete(),

    addLaundryEntry: async (entry: any) => db.collection('laundry_entries').add(entry),
    deleteLaundryEntry: async (id: string) => db.collection('laundry_entries').doc(id).delete(),

    createLaundryShipment: async (shipment: Omit<LaundryShipment, 'id'>, entryIds: string[]) => {
        const batch = db.batch();
        const shipRef = db.collection('laundry_shipments').doc();
        batch.set(shipRef, shipment);
        
        entryIds.forEach(id => {
            const entryRef = db.collection('laundry_entries').doc(id);
            batch.update(entryRef, { shipmentId: shipRef.id });
        });
        await batch.commit();
    },
    updateLaundryShipment: async (id: string, updates: Partial<LaundryShipment>) => db.collection('laundry_shipments').doc(id).update(updates),
    deleteLaundryShipment: async (id: string) => db.collection('laundry_shipments').doc(id).delete(),
};
