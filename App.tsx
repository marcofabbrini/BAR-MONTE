
import React, { useState, useEffect, useCallback } from 'react';
import { db, auth, googleProvider } from './firebaseConfig';
import { collection, onSnapshot, doc, getDocs, writeBatch, runTransaction, addDoc, updateDoc, deleteDoc, setDoc, orderBy, query, getDoc, where } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView';
import TombolaView from './components/TombolaView';
import GamesHub from './components/GamesHub';
import AnalottoView from './components/AnalottoView';
import DiceGame from './components/DiceGame';
import ShiftCalendar from './components/ShiftCalendar';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order, TillColors, CashMovement, AdminUser, SeasonalityConfig, ShiftSettings, AttendanceRecord, GeneralSettings, AppNotification } from './types';
import { BellIcon } from './components/Icons';
import { AnalottoProvider, useAnalotto } from './contexts/AnalottoContext';
import { TombolaProvider, useTombola } from './contexts/TombolaContext'; // Import Tombola Context

type View = 'selection' | 'till' | 'reports' | 'admin' | 'tombola' | 'games' | 'calendar' | 'analotto' | 'dice';

// Componente Wrapper interno per usare gli hooks dei contesti
const AppContent: React.FC = () => {
    const [view, setView] = useState<View>('selection');
    const [selectedTillId, setSelectedTillId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminList, setAdminList] = useState<AdminUser[]>([]);

    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
    const [tillColors, setTillColors] = useState<TillColors>({});
    
    // Attendance State
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

    // --- CONTEXT HOOKS ---
    const { 
        config: analottoConfig, 
        bets: analottoBets, 
        extractions: analottoExtractions, 
        placeBet: handlePlaceAnalottoBet,
        confirmTicket: handleConfirmAnalottoTicket,
        runExtraction: handleAnalottoExtraction,
        updateConfig: handleUpdateAnalottoConfig,
        transferFunds: handleTransferAnalottoFunds
    } = useAnalotto();

    const {
        config: tombolaConfig,
        tickets: tombolaTickets,
        wins: tombolaWins,
        buyTicket: handleBuyTombolaTicketInternal,
        refundTicket: handleRefundTombolaTicket,
        startGame: handleTombolaStartInternal,
        manualExtraction: handleManualTombolaExtraction,
        updateConfig: handleUpdateTombolaConfig,
        transferFunds: handleTransferTombolaFunds
    } = useTombola();

    // Settings State
    const [seasonalityConfig, setSeasonalityConfig] = useState<SeasonalityConfig | undefined>(undefined);
    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({ waterQuotaPrice: 0 });

    // Shift Settings (Calibration)
    const [shiftSettings, setShiftSettings] = useState<ShiftSettings>({
        anchorDate: new Date().toISOString().split('T')[0],
        anchorShift: 'b',
        rcAnchorDate: '',
        rcAnchorShift: 'a',
        rcAnchorSubGroup: 1
    });

    // Notification State
    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

    // Calcolo Super Admin
    const isSuperAdmin = currentUser && adminList.length > 0 && currentUser.email === adminList.sort((a,b) => a.timestamp.localeCompare(b.timestamp))[0].email;

    // Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && user.email) {
                try {
                    const adminsRef = collection(db, 'admins');
                    const q = query(adminsRef, where("email", "==", user.email));
                    try {
                        const querySnapshot = await getDocs(q);
                        setIsAdmin(!querySnapshot.empty);
                    } catch (readError) {
                        console.log("Verifica admin: Permesso negato (utente normale).");
                        setIsAdmin(false);
                    }
                } catch (error) {
                    console.error("Errore generale auth check:", error);
                    setIsAdmin(false);
                }
            } else { 
                setIsAdmin(false); 
            }
        });
        return () => unsubscribe();
    }, []);

    // Notification Listener
    useEffect(() => {
        const sessionStart = new Date().toISOString();
        const q = query(collection(db, 'notifications'), where('timestamp', '>', sessionStart), orderBy('timestamp', 'desc'));
        
        const unsubNotifications = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notif = change.doc.data() as AppNotification;
                    setActiveToast(notif);
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.volume = 0.5;
                        audio.play().catch(e => console.log("Audio blocked"));
                    } catch(e) {}

                    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
                        new Notification(notif.title, { body: notif.body, icon: '/logo.png' });
                    }
                    setTimeout(() => setActiveToast(null), 5000);
                }
            });
        });
        return () => unsubNotifications();
    }, []);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
            new Notification("Notifiche Attivate!", { body: "Riceverai avvisi dal Bar VVF." });
        }
    };

    const handleSendNotification = async (title: string, body: string, target = 'all') => {
        await addDoc(collection(db, 'notifications'), {
            title, body, target, timestamp: new Date().toISOString(), sender: currentUser?.email || 'Sistema'
        });
    };

    // Main Data Listeners
    useEffect(() => {
        setIsLoading(true);
        const unsubProducts = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
        const unsubStaff = onSnapshot(collection(db, 'staff'), (s) => setStaff(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember))));
        const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (s) => { setOrders(s.docs.map(d => ({ ...d.data(), id: d.id } as Order))); setIsLoading(false); });
        const unsubCash = onSnapshot(query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc')), (s) => setCashMovements(s.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement))));
        const unsubAdmins = onSnapshot(collection(db, 'admins'), (s) => setAdminList(s.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser))));
        const unsubSettings = onSnapshot(doc(db, 'settings', 'tillColors'), (d) => { if(d.exists()) setTillColors(d.data() as TillColors); });
        const unsubAttendance = onSnapshot(collection(db, 'shift_attendance'), (s) => setAttendanceRecords(s.docs.map(d => ({ ...d.data(), id: d.id } as AttendanceRecord))));

        const unsubSeasonality = onSnapshot(doc(db, 'settings', 'seasonality'), (d) => { 
            if(d.exists()) setSeasonalityConfig(d.data() as SeasonalityConfig); 
            else setDoc(doc(db, 'settings', 'seasonality'), { startDate: '', endDate: '', preset: 'custom', animationType: 'none', emojis: [], opacity: 0.5, backgroundColor: '#f8fafc' }); 
        });

        const unsubShiftSettings = onSnapshot(doc(db, 'settings', 'shift'), (d) => {
            if(d.exists()) setShiftSettings(d.data() as ShiftSettings);
            else {
                const today = new Date().toISOString().split('T')[0];
                setDoc(doc(db, 'settings', 'shift'), { anchorDate: today, anchorShift: 'b', rcAnchorDate: '', rcAnchorShift: 'a', rcAnchorSubGroup: 1 });
            }
        });

        const unsubGeneralSettings = onSnapshot(doc(db, 'settings', 'general'), (d) => {
            if (d.exists()) setGeneralSettings(d.data() as GeneralSettings);
            else setDoc(doc(db, 'settings', 'general'), { waterQuotaPrice: 0 });
        });
        
        return () => { 
            unsubProducts(); unsubStaff(); unsubOrders(); unsubCash(); unsubAdmins(); unsubSettings(); unsubAttendance();
            unsubSeasonality(); unsubShiftSettings(); unsubGeneralSettings();
        };
    }, []);

    // Wrapper for buying tombola ticket to include staff name lookup
    const handleBuyTombolaTicket = async (staffId: string, quantity: number) => {
        const member = staff.find(s => s.id === staffId);
        if (!member) return;
        await handleBuyTombolaTicketInternal(staffId, member.name, quantity);
    };

    const handleTombolaStart = async () => {
        await handleTombolaStartInternal();
        await handleSendNotification("TOMBOLA INIZIATA! 🎟️", "L'estrazione è partita. Corri a controllare la tua cartella!", "all");
    };

    const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e: any) { alert("Login fallito: " + e.message); } };
    const handleLogout = async () => { try { await signOut(auth); setView('selection'); } catch (e) { console.error(e); } };

    const handleAddAdmin = async (email: string) => { if (isAdmin) await addDoc(collection(db, 'admins'), { email, addedBy: currentUser?.email, timestamp: new Date().toISOString() }); };
    const handleRemoveAdmin = async (id: string) => { if (isAdmin) await deleteDoc(doc(db, 'admins', id)); };

    const handleCompleteOrder = useCallback(async (newOrderData: Omit<Order, 'id'>) => {
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
        } catch (error) { console.error("Transazione Ordine Fallita:", error); throw error; }
    }, []);
    
    const handleSaveAttendance = useCallback(async (tillId: string, presentStaffIds: string[], dateOverride?: string) => {
        try {
            const dateToUse = dateOverride || new Date().toISOString().split('T')[0];
            const docId = `${dateToUse}_${tillId}`; 
            await setDoc(doc(db, 'shift_attendance', docId), { tillId, date: dateToUse, timestamp: new Date().toISOString(), presentStaffIds });
        } catch (error) { console.error(error); }
    }, []);

    const handleDeleteAttendance = useCallback(async (id: string) => { try { await deleteDoc(doc(db, 'shift_attendance', id)); } catch (e) { console.error(e); } }, []);

    // Actions
    const addProduct = async (d: any) => { await addDoc(collection(db, 'products'), { ...d, createdAt: new Date().toISOString(), createdBy: currentUser?.email || 'admin' }); };
    const updateProduct = async (p: any) => { const { id, ...d } = p; await updateDoc(doc(db, 'products', id), d); };
    const deleteProduct = async (id: string) => { await deleteDoc(doc(db, 'products', id)); };
    const addStaff = async (d: any) => { await addDoc(collection(db, 'staff'), d); };
    const updateStaff = async (s: any) => { const { id, ...d } = s; await updateDoc(doc(db, 'staff', id), d); };
    const deleteStaff = async (id: string) => { await deleteDoc(doc(db, 'staff', id)); };
    const addCashMovement = async (d: any) => { await addDoc(collection(db, 'cash_movements'), d); };
    const updateCashMovement = async (m: CashMovement) => { const { id, ...d } = m; await updateDoc(doc(db, 'cash_movements', id), d); };
    const deleteCashMovement = async (id: string, email: string) => { await updateDoc(doc(db, 'cash_movements', id), { isDeleted: true, deletedBy: email, deletedAt: new Date().toISOString() }); };
    const permanentDeleteMovement = async (id: string) => { await deleteDoc(doc(db, 'cash_movements', id)); };
    const updateTillColors = async (c: TillColors) => { await setDoc(doc(db, 'settings', 'tillColors'), c, { merge: true }); };
    const deleteOrders = async (ids: string[], email: string) => { const batch = writeBatch(db); ids.forEach(id => batch.update(doc(db, 'orders', id), { isDeleted: true, deletedBy: email, deletedAt: new Date().toISOString() })); await batch.commit(); };
    const permanentDeleteOrder = async (id: string) => { await deleteDoc(doc(db, 'orders', id)); };
    const updateOrder = async (o: Order) => { const { id, ...d } = o; await updateDoc(doc(db, 'orders', id), d); };
    const handleStockPurchase = async (pid: string, qty: number, cost: number) => { const pRef = doc(db, 'products', pid); const pSnap = await getDoc(pRef); if(pSnap.exists()) { await updateDoc(pRef, { stock: pSnap.data().stock + qty, costPrice: cost }); await addDoc(collection(db, 'cash_movements'), { amount: qty*cost, reason: `Acquisto Stock: ${pSnap.data().name}`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' }); } };
    const handleStockCorrection = async (pid: string, stock: number) => { await updateDoc(doc(db, 'products', pid), { stock }); };
    
    const handleResetCash = async (type: 'bar' | 'games') => { 
        try {
            const batch = writeBatch(db);
            const movementsToReset = cashMovements.filter(m => {
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
        } catch (e) { console.error("Errore reset cassa:", e); throw e; }
    };

    const handleMassDelete = async (date: string, type: 'orders'|'movements') => { const q = query(collection(db, type === 'orders' ? 'orders' : 'cash_movements'), where('timestamp', '<=', new Date(date).toISOString())); const s = await getDocs(q); const batch = writeBatch(db); s.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); };
    const handleUpdateSeasonality = async (cfg: SeasonalityConfig) => { await setDoc(doc(db, 'settings', 'seasonality'), cfg); };
    const handleUpdateShiftSettings = async (cfg: ShiftSettings) => { await setDoc(doc(db, 'settings', 'shift'), cfg); };
    const handleUpdateGeneralSettings = async (cfg: GeneralSettings) => { await setDoc(doc(db, 'settings', 'general'), cfg, { merge: true }); };

    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
        switch (view) {
            case 'till': return <TillView 
                till={TILLS.find(t=>t.id===selectedTillId)!} 
                onGoBack={() => { setSelectedTillId(null); setView('selection'); }} 
                products={products} 
                allStaff={staff} 
                allOrders={orders} 
                onCompleteOrder={handleCompleteOrder} 
                tillColors={tillColors} 
                onSaveAttendance={handleSaveAttendance} 
                onPlaceAnalottoBet={handlePlaceAnalottoBet} 
                tombolaConfig={tombolaConfig} 
                tombolaTickets={tombolaTickets} 
                onBuyTombolaTicket={handleBuyTombolaTicket} 
                attendanceRecords={attendanceRecords}
            />;
            case 'reports': return <ReportsView onGoBack={() => setView('selection')} products={products} staff={staff} orders={orders} />;
            case 'tombola': 
                if (!tombolaConfig) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
                return <TombolaView 
                onGoBack={() => setView('selection')} 
                config={tombolaConfig} 
                tickets={tombolaTickets} 
                wins={tombolaWins} 
                onBuyTicket={handleBuyTombolaTicket} 
                onRefundTicket={handleRefundTombolaTicket}
                staff={staff} 
                onStartGame={handleTombolaStart} 
                isSuperAdmin={isSuperAdmin} 
                onTransferFunds={(amount) => handleTransferTombolaFunds(amount)}
                onUpdateTombolaConfig={handleUpdateTombolaConfig}
                tillColors={tillColors}
                onManualExtraction={handleManualTombolaExtraction}
            />;
            case 'analotto': return <AnalottoView onGoBack={() => setView('selection')} config={analottoConfig} bets={analottoBets} extractions={analottoExtractions} staff={staff} onPlaceBet={handlePlaceAnalottoBet} onRunExtraction={handleAnalottoExtraction} isSuperAdmin={isSuperAdmin} onTransferFunds={(amount) => handleTransferAnalottoFunds(amount)} onUpdateConfig={handleUpdateAnalottoConfig} onConfirmTicket={handleConfirmAnalottoTicket} />;
            case 'dice': return <DiceGame onGoBack={() => setView('selection')} staff={staff} />;
            case 'games': return <GamesHub onGoBack={() => setView('selection')} onPlayTombola={() => setView('tombola')} onPlayAnalotto={() => setView('analotto')} onPlayDice={() => setView('dice')} tombolaConfig={tombolaConfig} analottoConfig={analottoConfig} />;
            case 'calendar': return <ShiftCalendar onGoBack={() => setView('selection')} tillColors={tillColors} shiftSettings={shiftSettings} />;
            case 'admin': return <AdminView 
                onGoBack={() => setView('selection')} orders={orders} tills={TILLS} tillColors={tillColors} products={products} staff={staff} cashMovements={cashMovements}
                onUpdateTillColors={updateTillColors} onDeleteOrders={deleteOrders} onPermanentDeleteOrder={permanentDeleteOrder} onUpdateOrder={updateOrder}
                onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct}
                onAddStaff={addStaff} onUpdateStaff={updateStaff} onDeleteStaff={deleteStaff}
                onAddCashMovement={addCashMovement} onUpdateMovement={updateCashMovement} onDeleteMovement={deleteCashMovement} onPermanentDeleteMovement={permanentDeleteMovement}
                onStockPurchase={handleStockPurchase} onStockCorrection={handleStockCorrection} onResetCash={handleResetCash} onMassDelete={handleMassDelete}
                isAuthenticated={isAdmin} currentUser={currentUser} onLogin={handleGoogleLogin} onLogout={handleLogout}
                adminList={adminList} onAddAdmin={handleAddAdmin} onRemoveAdmin={handleRemoveAdmin}
                tombolaConfig={tombolaConfig} onNavigateToTombola={() => setView('tombola')}
                seasonalityConfig={seasonalityConfig} onUpdateSeasonality={handleUpdateSeasonality}
                shiftSettings={shiftSettings} onUpdateShiftSettings={handleUpdateShiftSettings}
                attendanceRecords={attendanceRecords} onDeleteAttendance={handleDeleteAttendance} onSaveAttendance={handleSaveAttendance}
                generalSettings={generalSettings} onUpdateGeneralSettings={handleUpdateGeneralSettings}
                onSendNotification={handleSendNotification}
            />;
            case 'selection': default: return <TillSelection tills={TILLS} onSelectTill={(id) => { setSelectedTillId(id); setView('till'); }} onSelectReports={() => setView('reports')} onSelectAdmin={() => setView('admin')} onSelectGames={() => setView('games')} onSelectCalendar={() => setView('calendar')} tillColors={tillColors} seasonalityConfig={seasonalityConfig} shiftSettings={shiftSettings} tombolaConfig={tombolaConfig} isSuperAdmin={isSuperAdmin} notificationPermission={notificationPermission} onRequestNotification={requestNotificationPermission} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 relative">
            {activeToast && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-[90%] max-w-md animate-slide-up">
                    <div className="bg-white rounded-xl shadow-2xl border-l-8 border-yellow-400 p-4 flex items-start gap-4">
                        <div className="bg-yellow-100 p-2 rounded-full flex-shrink-0"><BellIcon className="h-6 w-6 text-yellow-600" /></div>
                        <div className="flex-grow">
                            <h4 className="font-black text-slate-800 uppercase text-sm mb-1">{activeToast.title}</h4>
                            <p className="text-slate-600 text-sm leading-snug">{activeToast.body}</p>
                            <span className="text-[10px] text-slate-400 mt-2 block">{new Date(activeToast.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <button onClick={() => setActiveToast(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
                    </div>
                </div>
            )}
            {renderContent()}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AnalottoProvider>
            <TombolaProvider>
                <AppContent />
            </TombolaProvider>
        </AnalottoProvider>
    );
};

export default App;
