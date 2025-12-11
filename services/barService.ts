import { db } from '../firebaseConfig';
<<<<<<< HEAD
=======
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
    DocumentSnapshot,
    QuerySnapshot
} from 'firebase/firestore';
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
import { Product, StaffMember, Order, CashMovement, TillColors, SeasonalityConfig, ShiftSettings, GeneralSettings, AttendanceRecord, AdminUser, AppNotification } from '../types';

export const BarService = {
    // --- LISTENERS ---

    subscribeToProducts: (onUpdate: (data: Product[]) => void) => {
<<<<<<< HEAD
        return db.collection('products').onSnapshot((s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
    },

    subscribeToStaff: (onUpdate: (data: StaffMember[]) => void) => {
        return db.collection('staff').onSnapshot((s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember))));
    },

    subscribeToOrders: (onUpdate: (data: Order[]) => void) => {
        return db.collection('orders').orderBy('timestamp', 'desc').onSnapshot((s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Order))));
    },

    subscribeToCashMovements: (onUpdate: (data: CashMovement[]) => void) => {
        return db.collection('cash_movements').orderBy('timestamp', 'desc').onSnapshot((s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement))));
    },

    subscribeToAdmins: (onUpdate: (data: AdminUser[]) => void) => {
        return db.collection('admins').onSnapshot((s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser))));
=======
        return onSnapshot(collection(db, 'products'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
    },

    subscribeToStaff: (onUpdate: (data: StaffMember[]) => void) => {
        return onSnapshot(collection(db, 'staff'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember))));
    },

    subscribeToOrders: (onUpdate: (data: Order[]) => void) => {
        return onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as Order))));
    },

    subscribeToCashMovements: (onUpdate: (data: CashMovement[]) => void) => {
        return onSnapshot(query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc')), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement))));
    },

    subscribeToAdmins: (onUpdate: (data: AdminUser[]) => void) => {
        return onSnapshot(collection(db, 'admins'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser))));
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
    },

    subscribeToNotifications: (onUpdate: (data: AppNotification | null) => void) => {
        const sessionStart = new Date().toISOString();
<<<<<<< HEAD
        return db.collection('notifications')
            .where('timestamp', '>', sessionStart)
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        onUpdate(change.doc.data() as AppNotification);
                    }
                });
            });
=======
        const q = query(collection(db, 'notifications'), where('timestamp', '>', sessionStart), orderBy('timestamp', 'desc'));
        return onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    onUpdate(change.doc.data() as AppNotification);
                }
            });
        });
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
    },

    // --- SETTINGS LISTENERS ---

    subscribeToTillColors: (onUpdate: (data: TillColors) => void) => {
<<<<<<< HEAD
        return db.collection('settings').doc('tillColors').onSnapshot((d) => { if(d.exists) onUpdate(d.data() as TillColors); });
    },

    subscribeToSeasonality: (onUpdate: (data: SeasonalityConfig) => void) => {
        return db.collection('settings').doc('seasonality').onSnapshot((d) => { 
            if(d.exists) onUpdate(d.data() as SeasonalityConfig);
            else db.collection('settings').doc('seasonality').set({ startDate: '', endDate: '', preset: 'custom', animationType: 'none', emojis: [], opacity: 0.5, backgroundColor: '#f8fafc' });
=======
        return onSnapshot(doc(db, 'settings', 'tillColors'), (d) => { if(d.exists()) onUpdate(d.data() as TillColors); });
    },

    subscribeToSeasonality: (onUpdate: (data: SeasonalityConfig) => void) => {
        return onSnapshot(doc(db, 'settings', 'seasonality'), (d) => { 
            if(d.exists()) onUpdate(d.data() as SeasonalityConfig);
            else setDoc(doc(db, 'settings', 'seasonality'), { startDate: '', endDate: '', preset: 'custom', animationType: 'none', emojis: [], opacity: 0.5, backgroundColor: '#f8fafc' });
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
        });
    },

    subscribeToShiftSettings: (onUpdate: (data: ShiftSettings) => void) => {
<<<<<<< HEAD
        return db.collection('settings').doc('shift').onSnapshot((d) => {
            if(d.exists) onUpdate(d.data() as ShiftSettings);
            else {
                db.collection('settings').doc('shift').set({ anchorDate: '2025-12-10', anchorShift: 'd', rcAnchorDate: '', rcAnchorShift: 'a', rcAnchorSubGroup: 1 });
=======
        return onSnapshot(doc(db, 'settings', 'shift'), (d) => {
            if(d.exists()) onUpdate(d.data() as ShiftSettings);
            else {
                // Default: 10 Dicembre 2025 era Turno D (Giorno)
                // Sequenza: B (Smontante) -> D (Giorno) -> C (Notte)
                setDoc(doc(db, 'settings', 'shift'), { anchorDate: '2025-12-10', anchorShift: 'd', rcAnchorDate: '', rcAnchorShift: 'a', rcAnchorSubGroup: 1 });
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
            }
        });
    },

    subscribeToGeneralSettings: (onUpdate: (data: GeneralSettings) => void) => {
<<<<<<< HEAD
        return db.collection('settings').doc('general').onSnapshot((d) => {
            if (d.exists) onUpdate(d.data() as GeneralSettings);
            else db.collection('settings').doc('general').set({ waterQuotaPrice: 0 });
=======
        return onSnapshot(doc(db, 'settings', 'general'), (d) => {
            if (d.exists()) onUpdate(d.data() as GeneralSettings);
            else setDoc(doc(db, 'settings', 'general'), { waterQuotaPrice: 0 });
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
        });
    },

    subscribeToAttendance: (onUpdate: (data: AttendanceRecord[]) => void) => {
<<<<<<< HEAD
        return db.collection('shift_attendance').onSnapshot((s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord))));
=======
        return onSnapshot(collection(db, 'shift_attendance'), (s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord))));
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
    },

    // --- OPERATIONS ---

    // Orders
    completeOrder: async (newOrderData: Omit<Order, 'id'>) => {
        try {
<<<<<<< HEAD
            await db.runTransaction(async (t) => {
                const productRefs = newOrderData.items.map(item => db.collection('products').doc(item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => t.get(ref)));
                
                productDocs.forEach((docSnap, index) => {
                    if (!docSnap.exists) throw new Error(`Prodotto non trovato.`);
                    const currentStock = Number(docSnap.data()?.stock) || 0;
                    t.update(productRefs[index], { stock: currentStock - newOrderData.items[index].quantity });
                });
                
                const orderRef = db.collection('orders').doc();
=======
            await runTransaction(db, async (t) => {
                const productRefs = newOrderData.items.map(item => doc(db, 'products', item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => t.get(ref)));
                
                productDocs.forEach((docSnap, index) => {
                    if (!docSnap.exists()) throw new Error(`Prodotto non trovato.`);
                    const currentStock = Number(docSnap.data().stock) || 0;
                    t.update(productRefs[index], { stock: currentStock - newOrderData.items[index].quantity });
                });
                
                const orderRef = doc(collection(db, 'orders'));
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
                t.set(orderRef, { ...newOrderData, id: orderRef.id });
            });
        } catch (error) { 
            console.error("BarService: Transazione Ordine Fallita:", error); 
            throw error; 
        }
    },

    updateOrder: async (order: Order) => {
        const { id, ...data } = order;
<<<<<<< HEAD
        await db.collection('orders').doc(id).update(data);
    },

    deleteOrders: async (ids: string[], userEmail: string) => {
        const batch = db.batch();
        ids.forEach(id => batch.update(db.collection('orders').doc(id), { isDeleted: true, deletedBy: userEmail, deletedAt: new Date().toISOString() }));
=======
        await updateDoc(doc(db, 'orders', id), data);
    },

    deleteOrders: async (ids: string[], userEmail: string) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.update(doc(db, 'orders', id), { isDeleted: true, deletedBy: userEmail, deletedAt: new Date().toISOString() }));
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
        await batch.commit();
    },

    permanentDeleteOrder: async (id: string) => {
<<<<<<< HEAD
        await db.collection('orders').doc(id).delete();
=======
        await deleteDoc(doc(db, 'orders', id));
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
    },

    // Products
    addProduct: async (data: any, userEmail: string) => {
<<<<<<< HEAD
        await db.collection('products').add({ ...data, createdAt: new Date().toISOString(), createdBy: userEmail });
    },
    updateProduct: async (product: any) => {
        const { id, ...data } = product;
        await db.collection('products').doc(id).update(data);
    },
    deleteProduct: async (id: string) => {
        await db.collection('products').doc(id).delete();
=======
        await addDoc(collection(db, 'products'), { ...data, createdAt: new Date().toISOString(), createdBy: userEmail });
    },
    updateProduct: async (product: any) => {
        const { id, ...data } = product;
        await updateDoc(doc(db, 'products', id), data);
    },
    deleteProduct: async (id: string) => {
        await deleteDoc(doc(db, 'products', id));
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
    },

    // Stock
    stockPurchase: async (productId: string, quantity: number, cost: number) => {
<<<<<<< HEAD
        const pRef = db.collection('products').doc(productId);
        const pSnap = await pRef.get();
        if(pSnap.exists) {
            await pRef.update({ stock: pSnap.data()!.stock + quantity, costPrice: cost });
            await db.collection('cash_movements').add({ 
                amount: quantity * cost, 
                reason: `Acquisto Stock: ${pSnap.data()!.name}`, 
=======
        const pRef = doc(db, 'products', productId);
        const pSnap = await getDoc(pRef);
        if(pSnap.exists()) {
            await updateDoc(pRef, { stock: pSnap.data().stock + quantity, costPrice: cost });
            await addDoc(collection(db, 'cash_movements'), { 
                amount: quantity * cost, 
                reason: `Acquisto Stock: ${pSnap.data().name}`, 
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
                timestamp: new Date().toISOString(), 
                type: 'withdrawal', 
                category: 'bar' 
            });
        }
    },
    
    stockCorrection: async (productId: string, stock: number) => {
<<<<<<< HEAD
        await db.collection('products').doc(productId).update({ stock });
    },

    // Staff
    addStaff: async (data: any) => { await db.collection('staff').add(data); },
    updateStaff: async (staff: any) => { const { id, ...data } = staff; await db.collection('staff').doc(id).update(data); },
    deleteStaff: async (id: string) => { await db.collection('staff').doc(id).delete(); },

    // Cash
    addCashMovement: async (data: any) => { await db.collection('cash_movements').add(data); },
    updateCashMovement: async (movement: any) => { const { id, ...data } = movement; await db.collection('cash_movements').doc(id).update(data); },
    deleteCashMovement: async (id: string, email: string) => { await db.collection('cash_movements').doc(id).update({ isDeleted: true, deletedBy: email, deletedAt: new Date().toISOString() }); },
    permanentDeleteMovement: async (id: string) => { await db.collection('cash_movements').doc(id).delete(); },
    
    resetCash: async (type: 'bar' | 'games', allMovements: CashMovement[]) => {
        const batch = db.batch();
=======
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
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
        const movementsToReset = allMovements.filter(m => {
            if (type === 'bar') return (m.category === 'bar' || !m.category);
            if (type === 'games') return (m.category === 'tombola' || m.category === 'analotto');
            return false;
        });
<<<<<<< HEAD
        movementsToReset.forEach(m => batch.update(db.collection('cash_movements').doc(m.id), { amount: 0, reason: m.reason + ' (RESET)' }));
        if (type === 'games') {
            batch.update(db.collection('tombola').doc('config'), { jackpot: 0 });
            batch.update(db.collection('analotto').doc('config'), { jackpot: 0 });
=======
        movementsToReset.forEach(m => batch.update(doc(db, 'cash_movements', m.id), { amount: 0, reason: m.reason + ' (RESET)' }));
        if (type === 'games') {
            batch.update(doc(db, 'tombola', 'config'), { jackpot: 0 });
            batch.update(doc(db, 'analotto', 'config'), { jackpot: 0 });
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
        }
        await batch.commit();
    },

    // Admins
<<<<<<< HEAD
    addAdmin: async (email: string, addedBy: string) => { await db.collection('admins').add({ email, addedBy, timestamp: new Date().toISOString() }); },
    removeAdmin: async (id: string) => { await db.collection('admins').doc(id).delete(); },
=======
    addAdmin: async (email: string, addedBy: string) => { await addDoc(collection(db, 'admins'), { email, addedBy, timestamp: new Date().toISOString() }); },
    removeAdmin: async (id: string) => { await deleteDoc(doc(db, 'admins', id)); },
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894

    // Attendance
    saveAttendance: async (tillId: string, presentStaffIds: string[], dateOverride?: string) => {
        const dateToUse = dateOverride || new Date().toISOString().split('T')[0];
        const docId = `${dateToUse}_${tillId}`; 
<<<<<<< HEAD
        await db.collection('shift_attendance').doc(docId).set({ tillId, date: dateToUse, timestamp: new Date().toISOString(), presentStaffIds });
    },
    deleteAttendance: async (id: string) => { await db.collection('shift_attendance').doc(id).delete(); },

    // Settings & Notifications
    updateTillColors: async (c: TillColors) => { await db.collection('settings').doc('tillColors').set(c, { merge: true }); },
    updateSeasonality: async (cfg: SeasonalityConfig) => { await db.collection('settings').doc('seasonality').set(cfg); },
    updateShiftSettings: async (cfg: ShiftSettings) => { await db.collection('settings').doc('shift').set(cfg); },
    updateGeneralSettings: async (cfg: GeneralSettings) => { await db.collection('settings').doc('general').set(cfg, { merge: true }); },
    
    sendNotification: async (title: string, body: string, sender: string) => {
        await db.collection('notifications').add({ title, body, target: 'all', timestamp: new Date().toISOString(), sender });
=======
        await setDoc(doc(db, 'shift_attendance', docId), { tillId, date: dateToUse, timestamp: new Date().toISOString(), presentStaffIds });
    },
    deleteAttendance: async (id: string) => { await deleteDoc(doc(db, 'shift_attendance', id)); },

    // Settings & Notifications
    updateTillColors: async (c: TillColors) => { await setDoc(doc(db, 'settings', 'tillColors'), c, { merge: true }); },
    updateSeasonality: async (cfg: SeasonalityConfig) => { await setDoc(doc(db, 'settings', 'seasonality'), cfg); },
    updateShiftSettings: async (cfg: ShiftSettings) => { await setDoc(doc(db, 'settings', 'shift'), cfg); },
    updateGeneralSettings: async (cfg: GeneralSettings) => { await setDoc(doc(db, 'settings', 'general'), cfg, { merge: true }); },
    
    sendNotification: async (title: string, body: string, sender: string) => {
        await addDoc(collection(db, 'notifications'), { title, body, target: 'all', timestamp: new Date().toISOString(), sender });
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
    },

    // Utils
    massDelete: async (date: string, type: 'orders' | 'movements') => {
<<<<<<< HEAD
        const q = db.collection(type === 'orders' ? 'orders' : 'cash_movements').where('timestamp', '<=', new Date(date).toISOString());
        const s = await q.get();
        const batch = db.batch();
=======
        const q = query(collection(db, type === 'orders' ? 'orders' : 'cash_movements'), where('timestamp', '<=', new Date(date).toISOString()));
        const s = await getDocs(q);
        const batch = writeBatch(db);
>>>>>>> 471617c4899509b5a2bd71d3a2dc177d503cb894
        s.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
};