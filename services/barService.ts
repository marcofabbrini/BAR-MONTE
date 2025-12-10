
import { db } from '../firebaseConfig';
import { Product, StaffMember, Order, CashMovement, TillColors, SeasonalityConfig, ShiftSettings, GeneralSettings, AttendanceRecord, AdminUser, AppNotification } from '../types';

export const BarService = {
    // --- LISTENERS ---

    subscribeToProducts: (onUpdate: (data: Product[]) => void) => {
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
    },

    subscribeToNotifications: (onUpdate: (data: AppNotification | null) => void) => {
        const sessionStart = new Date().toISOString();
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
    },

    // --- SETTINGS LISTENERS ---

    subscribeToTillColors: (onUpdate: (data: TillColors) => void) => {
        return db.collection('settings').doc('tillColors').onSnapshot((d) => { if(d.exists) onUpdate(d.data() as TillColors); });
    },

    subscribeToSeasonality: (onUpdate: (data: SeasonalityConfig) => void) => {
        return db.collection('settings').doc('seasonality').onSnapshot((d) => { 
            if(d.exists) onUpdate(d.data() as SeasonalityConfig);
            else db.collection('settings').doc('seasonality').set({ startDate: '', endDate: '', preset: 'custom', animationType: 'none', emojis: [], opacity: 0.5, backgroundColor: '#f8fafc' });
        });
    },

    subscribeToShiftSettings: (onUpdate: (data: ShiftSettings) => void) => {
        return db.collection('settings').doc('shift').onSnapshot((d) => {
            if(d.exists) onUpdate(d.data() as ShiftSettings);
            else {
                db.collection('settings').doc('shift').set({ anchorDate: '2025-12-10', anchorShift: 'd', rcAnchorDate: '', rcAnchorShift: 'a', rcAnchorSubGroup: 1 });
            }
        });
    },

    subscribeToGeneralSettings: (onUpdate: (data: GeneralSettings) => void) => {
        return db.collection('settings').doc('general').onSnapshot((d) => {
            if (d.exists) onUpdate(d.data() as GeneralSettings);
            else db.collection('settings').doc('general').set({ waterQuotaPrice: 0 });
        });
    },

    subscribeToAttendance: (onUpdate: (data: AttendanceRecord[]) => void) => {
        return db.collection('shift_attendance').onSnapshot((s) => onUpdate(s.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord))));
    },

    // --- OPERATIONS ---

    // Orders
    completeOrder: async (newOrderData: Omit<Order, 'id'>) => {
        try {
            await db.runTransaction(async (t) => {
                const productRefs = newOrderData.items.map(item => db.collection('products').doc(item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => t.get(ref)));
                
                productDocs.forEach((docSnap, index) => {
                    if (!docSnap.exists) throw new Error(`Prodotto non trovato.`);
                    const currentStock = Number(docSnap.data()?.stock) || 0;
                    t.update(productRefs[index], { stock: currentStock - newOrderData.items[index].quantity });
                });
                
                const orderRef = db.collection('orders').doc();
                t.set(orderRef, { ...newOrderData, id: orderRef.id });
            });
        } catch (error) { 
            console.error("BarService: Transazione Ordine Fallita:", error); 
            throw error; 
        }
    },

    updateOrder: async (order: Order) => {
        const { id, ...data } = order;
        await db.collection('orders').doc(id).update(data);
    },

    deleteOrders: async (ids: string[], userEmail: string) => {
        const batch = db.batch();
        ids.forEach(id => batch.update(db.collection('orders').doc(id), { isDeleted: true, deletedBy: userEmail, deletedAt: new Date().toISOString() }));
        await batch.commit();
    },

    permanentDeleteOrder: async (id: string) => {
        await db.collection('orders').doc(id).delete();
    },

    // Products
    addProduct: async (data: any, userEmail: string) => {
        await db.collection('products').add({ ...data, createdAt: new Date().toISOString(), createdBy: userEmail });
    },
    updateProduct: async (product: any) => {
        const { id, ...data } = product;
        await db.collection('products').doc(id).update(data);
    },
    deleteProduct: async (id: string) => {
        await db.collection('products').doc(id).delete();
    },

    // Stock
    stockPurchase: async (productId: string, quantity: number, cost: number) => {
        const pRef = db.collection('products').doc(productId);
        const pSnap = await pRef.get();
        if(pSnap.exists) {
            await pRef.update({ stock: pSnap.data()!.stock + quantity, costPrice: cost });
            await db.collection('cash_movements').add({ 
                amount: quantity * cost, 
                reason: `Acquisto Stock: ${pSnap.data()!.name}`, 
                timestamp: new Date().toISOString(), 
                type: 'withdrawal', 
                category: 'bar' 
            });
        }
    },
    
    stockCorrection: async (productId: string, stock: number) => {
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
        const movementsToReset = allMovements.filter(m => {
            if (type === 'bar') return (m.category === 'bar' || !m.category);
            if (type === 'games') return (m.category === 'tombola' || m.category === 'analotto');
            return false;
        });
        movementsToReset.forEach(m => batch.update(db.collection('cash_movements').doc(m.id), { amount: 0, reason: m.reason + ' (RESET)' }));
        if (type === 'games') {
            batch.update(db.collection('tombola').doc('config'), { jackpot: 0 });
            batch.update(db.collection('analotto').doc('config'), { jackpot: 0 });
        }
        await batch.commit();
    },

    // Admins
    addAdmin: async (email: string, addedBy: string) => { await db.collection('admins').add({ email, addedBy, timestamp: new Date().toISOString() }); },
    removeAdmin: async (id: string) => { await db.collection('admins').doc(id).delete(); },

    // Attendance
    saveAttendance: async (tillId: string, presentStaffIds: string[], dateOverride?: string) => {
        const dateToUse = dateOverride || new Date().toISOString().split('T')[0];
        const docId = `${dateToUse}_${tillId}`; 
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
    },

    // Utils
    massDelete: async (date: string, type: 'orders' | 'movements') => {
        const q = db.collection(type === 'orders' ? 'orders' : 'cash_movements').where('timestamp', '<=', new Date(date).toISOString());
        const s = await q.get();
        const batch = db.batch();
        s.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
};
