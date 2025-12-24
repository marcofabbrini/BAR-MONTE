
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
    where, 
    writeBatch, 
    runTransaction,
    getDoc,
    getDocs,
    limit,
    deleteField,
    DocumentSnapshot,
    QuerySnapshot
} from 'firebase/firestore';
import { Product, StaffMember, Order, CashMovement, TillColors, SeasonalityConfig, ShiftSettings, GeneralSettings, AttendanceRecord, AdminUser, AppNotification, AttendanceStatus } from '../types';

export const BarService = {
    // --- LISTENERS ---

    subscribeToProducts: (onUpdate: (data: Product[]) => void) => {
        return onSnapshot(collection(db, 'products'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
    },

    subscribeToStaff: (onUpdate: (data: StaffMember[]) => void) => {
        return onSnapshot(collection(db, 'staff'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember))));
    },

    subscribeToOrders: (onUpdate: (data: Order[]) => void) => {
        // FIX IPHONE: Limite ridotto a 500 per stabilità massima della memoria
        return onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc'), limit(500)), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Order))));
    },

    subscribeToCashMovements: (onUpdate: (data: CashMovement[]) => void) => {
        // FIX IPHONE: Limite ridotto a 500 per evitare Quota Exceeded
        return onSnapshot(query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc'), limit(500)), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement))));
    },

    subscribeToAdmins: (onUpdate: (data: AdminUser[]) => void) => {
        return onSnapshot(collection(db, 'admins'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser))));
    },

    subscribeToNotifications: (onUpdate: (data: AppNotification | null) => void) => {
        const sessionStart = new Date().toISOString();
        const q = query(collection(db, 'notifications'), where('timestamp', '>', sessionStart), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    onUpdate(change.doc.data() as AppNotification);
                }
            });
        });
    },

    // --- SETTINGS LISTENERS ---

    subscribeToTillColors: (onUpdate: (data: TillColors) => void) => {
        return onSnapshot(doc(db, 'settings', 'tillColors'), (d) => { if(d.exists()) onUpdate(d.data() as TillColors); });
    },

    subscribeToSeasonality: (onUpdate: (data: SeasonalityConfig) => void) => {
        return onSnapshot(doc(db, 'settings', 'seasonality'), (d) => { 
            if(d.exists()) onUpdate(d.data() as SeasonalityConfig);
            else setDoc(doc(db, 'settings', 'seasonality'), { startDate: '', endDate: '', preset: 'custom', animationType: 'none', emojis: [], opacity: 0.5, backgroundColor: '#f8fafc' });
        });
    },

    subscribeToShiftSettings: (onUpdate: (data: ShiftSettings) => void) => {
        return onSnapshot(doc(db, 'settings', 'shift'), (d) => {
            if(d.exists()) {
                onUpdate(d.data() as ShiftSettings);
            } else {
                // DEFAULT STABILE: 1 Gennaio 2025 = Turno B
                setDoc(doc(db, 'settings', 'shift'), { 
                    anchorDate: '2025-01-01', 
                    anchorShift: 'b', 
                    rcAnchorDate: '', 
                    rcAnchorShift: 'a', 
                    rcAnchorSubGroup: 1 
                });
            }
        });
    },

    subscribeToGeneralSettings: (onUpdate: (data: GeneralSettings) => void) => {
        return onSnapshot(doc(db, 'settings', 'general'), (d) => {
            if (d.exists()) onUpdate(d.data() as GeneralSettings);
            else setDoc(doc(db, 'settings', 'general'), { waterQuotaPrice: 0 });
        });
    },

    subscribeToAttendance: (onUpdate: (data: AttendanceRecord[]) => void) => {
        return onSnapshot(collection(db, 'shift_attendance'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord))));
    },

    // --- OPERATIONS ---

    // Orders
    completeOrder: async (newOrderData: Omit<Order, 'id'>) => {
        try {
            await runTransaction(db, async (t) => {
                const productRefs = newOrderData.items.map(item => doc(db, 'products', item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => t.get(ref)));
                
                productDocs.forEach((docSnap, index) => {
                    if (!docSnap.exists()) throw new Error(`Prodotto non trovato.`);
                    const currentStock = Number(docSnap.data().stock) || 0;
                    t.update(productRefs[index], { stock: currentStock - newOrderData.items[index].quantity });
                });
                
                const orderRef = doc(collection(db, 'orders'));
                t.set(orderRef, { ...newOrderData, id: orderRef.id });
            });
        } catch (error) { 
            console.error("BarService: Transazione Ordine Fallita:", error); 
            throw error; 
        }
    },

    updateOrder: async (order: Order) => {
        const { id, ...data } = order;
        await updateDoc(doc(db, 'orders', id), data);
    },

    deleteOrders: async (ids: string[], userEmail: string) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.update(doc(db, 'orders', id), { isDeleted: true, deletedBy: userEmail, deletedAt: new Date().toISOString() }));
        await batch.commit();
    },

    permanentDeleteOrder: async (id: string) => {
        await deleteDoc(doc(db, 'orders', id));
    },

    // Products
    addProduct: async (data: any, userEmail: string) => {
        await addDoc(collection(db, 'products'), { ...data, createdAt: new Date().toISOString(), createdBy: userEmail });
    },
    updateProduct: async (product: any) => {
        const { id, ...data } = product;
        await updateDoc(doc(db, 'products', id), data);
    },
    deleteProduct: async (id: string) => {
        await deleteDoc(doc(db, 'products', id));
    },

    // Stock
    stockPurchase: async (productId: string, quantity: number, cost: number) => {
        const pRef = doc(db, 'products', productId);
        const pSnap = await getDoc(pRef);
        if(pSnap.exists()) {
            await updateDoc(pRef, { stock: pSnap.data().stock + quantity, costPrice: cost });
            await addDoc(collection(db, 'cash_movements'), { 
                amount: quantity * cost, 
                reason: `Acquisto Stock: ${pSnap.data().name}`, 
                timestamp: new Date().toISOString(), 
                type: 'withdrawal', 
                category: 'bar' 
            });
        }
    },
    
    stockCorrection: async (productId: string, stock: number) => {
        await updateDoc(doc(db, 'products', productId), { stock });
    },

    // Staff
    addStaff: async (data: any) => { await addDoc(collection(db, 'staff'), data); },
    updateStaff: async (staff: any) => { const { id, ...data } = staff; await updateDoc(doc(db, 'staff', id), data); },
    deleteStaff: async (id: string) => { await deleteDoc(doc(db, 'staff', id)); },

    // Cash
    addCashMovement: async (data: any) => { await addDoc(collection(db, 'cash_movements'), data); },
    updateCashMovement: async (movement: any) => { const { id, ...data } = movement; await updateDoc(doc(db, 'cash_movements', id), data); },
    deleteCashMovement: async (id: string, email: string) => { await updateDoc(doc(db, 'cash_movements', id), { isDeleted: true, deletedBy: email, deletedAt: new Date().toISOString() }); },
    permanentDeleteMovement: async (id: string) => { await deleteDoc(doc(db, 'cash_movements', id)); },
    
    resetCash: async (type: 'bar' | 'games', allMovements: CashMovement[]) => {
        const batch = writeBatch(db);
        const movementsToReset = allMovements.filter(m => {
            if (type === 'bar') return (m.category === 'bar' || !m.category);
            if (type === 'games') return (m.category === 'tombola' || m.category === 'analotto');
            return false;
        });
        movementsToReset.forEach(m => batch.update(doc(db, 'cash_movements', m.id), { amount: 0, reason: m.reason + ' (RESET)' }));
        if (type === 'games') {
            batch.update(doc(db, 'tombola', 'config'), { jackpot: 0 });
            batch.update(doc(db, 'analotto', 'config'), { jackpot: 0 });
        }
        await batch.commit();
    },

    // Admins
    addAdmin: async (email: string, addedBy: string) => { await addDoc(collection(db, 'admins'), { email, addedBy, timestamp: new Date().toISOString() }); },
    removeAdmin: async (id: string) => { await deleteDoc(doc(db, 'admins', id)); },

    // Attendance
    saveAttendance: async (
        tillId: string, 
        presentStaffIds: string[], 
        dateOverride?: string, 
        closedBy?: string, 
        attendanceDetails?: Record<string, AttendanceStatus>,
        substitutionNames?: Record<string, string>
    ) => {
        const dateToUse = dateOverride || new Date().toISOString().split('T')[0];
        const docId = `${dateToUse}_${tillId}`; 
        
        const dataToSave: any = { 
            tillId, 
            date: dateToUse, 
            timestamp: new Date().toISOString(), 
            presentStaffIds 
        };

        if (attendanceDetails) {
            dataToSave.attendanceDetails = attendanceDetails;
        }

        if (substitutionNames) {
            dataToSave.substitutionNames = substitutionNames;
        }

        if (closedBy) {
            dataToSave.closedBy = closedBy;
            dataToSave.closedAt = new Date().toISOString();
        }

        await setDoc(doc(db, 'shift_attendance', docId), dataToSave, { merge: true });
    },
    
    reopenAttendance: async (id: string) => {
        await updateDoc(doc(db, 'shift_attendance', id), {
            closedAt: deleteField(),
            closedBy: deleteField()
        });
    },

    deleteAttendance: async (id: string) => { await deleteDoc(doc(db, 'shift_attendance', id)); },

    // Settings & Notifications
    updateTillColors: async (c: TillColors) => { await setDoc(doc(db, 'settings', 'tillColors'), c, { merge: true }); },
    updateSeasonality: async (cfg: SeasonalityConfig) => { await setDoc(doc(db, 'settings', 'seasonality'), cfg); },
    updateShiftSettings: async (cfg: ShiftSettings) => { await setDoc(doc(db, 'settings', 'shift'), cfg); },
    updateGeneralSettings: async (cfg: GeneralSettings) => { await setDoc(doc(db, 'settings', 'general'), cfg, { merge: true }); },
    
    sendNotification: async (title: string, body: string, sender: string) => {
        await addDoc(collection(db, 'notifications'), { title, body, target: 'all', timestamp: new Date().toISOString(), sender });
    },

    // Utils
    massDelete: async (date: string, type: 'orders' | 'movements') => {
        const q = query(collection(db, type === 'orders' ? 'orders' : 'cash_movements'), where('timestamp', '<=', new Date(date).toISOString()));
        const s = await getDocs(q);
        const batch = writeBatch(db);
        s.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
};
