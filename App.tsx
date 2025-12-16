
import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
import AttendanceCalendar from './components/AttendanceCalendar';
import { TILLS } from './constants';
import { BellIcon } from './components/Icons';
import { AnalottoProvider, useAnalotto } from './contexts/AnalottoContext';
import { TombolaProvider, useTombola } from './contexts/TombolaContext';
import { BarProvider, useBar } from './contexts/BarContext';

type View = 'selection' | 'till' | 'reports' | 'admin' | 'tombola' | 'games' | 'calendar' | 'analotto' | 'dice' | 'attendance_view';

const AppContent: React.FC = () => {
    const [view, setView] = useState<View>('selection');
    const [selectedTillId, setSelectedTillId] = useState<string | null>(null);
    
    // Auth State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    // --- CONTEXT HOOKS ---
    const { 
        products, staff, orders, cashMovements, adminList, tillColors, seasonalityConfig, shiftSettings, generalSettings, attendanceRecords, activeToast, isLoading, setActiveToast,
        addProduct, updateProduct, deleteProduct, addStaff, updateStaff, deleteStaff, completeOrder, updateOrder, deleteOrders, permanentDeleteOrder,
        addCashMovement, updateCashMovement, deleteCashMovement, permanentDeleteMovement, resetCash, stockPurchase, stockCorrection,
        addAdmin, removeAdmin, saveAttendance, deleteAttendance, updateTillColors, updateSeasonality, updateShiftSettings, updateGeneralSettings, sendNotification, massDelete
    } = useBar();

    const { 
        config: analottoConfig, bets: analottoBets, extractions: analottoExtractions, 
        placeBet: handlePlaceAnalottoBet, confirmTicket: handleConfirmAnalottoTicket, 
        runExtraction: handleAnalottoExtraction, updateConfig: handleUpdateAnalottoConfig, 
        transferFunds: handleTransferAnalottoFunds
    } = useAnalotto();

    const {
        config: tombolaConfig, tickets: tombolaTickets, wins: tombolaWins,
        buyTicket: handleBuyTombolaTicketInternal, refundTicket: handleRefundTombolaTicket,
        startGame: handleTombolaStartInternal, manualExtraction: handleManualTombolaExtraction,
        updateConfig: handleUpdateTombolaConfig, transferFunds: handleTransferTombolaFunds
    } = useTombola();

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
                    const querySnapshot = await getDocs(q);
                    setIsAdmin(!querySnapshot.empty);
                } catch (error) {
                    console.error("Auth error:", error);
                    setIsAdmin(false);
                }
            } else { setIsAdmin(false); }
        });
        return () => unsubscribe();
    }, []);

    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') new Notification("Notifiche Attivate!", { body: "Riceverai avvisi dal Bar VVF." });
    };

    const handleBuyTombolaTicket = async (staffId: string, quantity: number) => {
        const member = staff.find(s => s.id === staffId);
        if (member) await handleBuyTombolaTicketInternal(staffId, member.name, quantity);
    };

    const handleTombolaStart = async () => {
        await handleTombolaStartInternal();
        await sendNotification("TOMBOLA INIZIATA! 🎟️", "L'estrazione è partita. Corri a controllare la tua cartella!", "Sistema");
    };

    const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e: any) { alert("Login fallito: " + e.message); } };
    const handleLogout = async () => { try { await signOut(auth); setView('selection'); } catch (e) { console.error(e); } };

    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-dvh"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
        switch (view) {
            case 'till': return <TillView 
                till={TILLS.find(t=>t.id===selectedTillId)!} 
                onGoBack={() => { setSelectedTillId(null); setView('selection'); }} 
                products={products} 
                allStaff={staff} 
                allOrders={orders} 
                onCompleteOrder={completeOrder} 
                tillColors={tillColors} 
                onSaveAttendance={(t, i, d, c) => saveAttendance(t, i, d, c)} 
                onPlaceAnalottoBet={handlePlaceAnalottoBet} 
                tombolaConfig={tombolaConfig} 
                tombolaTickets={tombolaTickets} 
                onBuyTombolaTicket={handleBuyTombolaTicket} 
                attendanceRecords={attendanceRecords}
                generalSettings={generalSettings}
            />;
            case 'reports': return <ReportsView onGoBack={() => setView('selection')} products={products} staff={staff} orders={orders} />;
            case 'tombola': 
                if (!tombolaConfig) return <div className="flex items-center justify-center min-h-dvh"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
                return <TombolaView 
                onGoBack={() => setView('selection')} 
                config={tombolaConfig} tickets={tombolaTickets} wins={tombolaWins} 
                onBuyTicket={handleBuyTombolaTicket} onRefundTicket={handleRefundTombolaTicket}
                staff={staff} onStartGame={handleTombolaStart} isSuperAdmin={isSuperAdmin} 
                onTransferFunds={(amount) => handleTransferTombolaFunds(amount)}
                onUpdateTombolaConfig={handleUpdateTombolaConfig} tillColors={tillColors} onManualExtraction={handleManualTombolaExtraction}
            />;
            case 'analotto': return <AnalottoView onGoBack={() => setView('selection')} config={analottoConfig} bets={analottoBets} extractions={analottoExtractions} staff={staff} onPlaceBet={handlePlaceAnalottoBet} onRunExtraction={handleAnalottoExtraction} isSuperAdmin={isSuperAdmin} onTransferFunds={(amount) => handleTransferAnalottoFunds(amount)} onUpdateConfig={handleUpdateAnalottoConfig} onConfirmTicket={handleConfirmAnalottoTicket} />;
            case 'dice': return <DiceGame onGoBack={() => setView('selection')} staff={staff} shiftSettings={shiftSettings} />;
            case 'games': return <GamesHub onGoBack={() => setView('selection')} onPlayTombola={() => setView('tombola')} onPlayAnalotto={() => setView('analotto')} onPlayDice={() => setView('dice')} tombolaConfig={tombolaConfig} analottoConfig={analottoConfig} />;
            case 'calendar': return <ShiftCalendar onGoBack={() => setView('selection')} tillColors={tillColors} shiftSettings={shiftSettings} />;
            case 'attendance_view': return <AttendanceCalendar onGoBack={() => setView('selection')} attendanceRecords={attendanceRecords} staff={staff} tillColors={tillColors} isSuperAdmin={false} shiftSettings={shiftSettings} readOnly={true} />;
            case 'admin': return <AdminView 
                onGoBack={() => setView('selection')} orders={orders} tills={TILLS} tillColors={tillColors} products={products} staff={staff} cashMovements={cashMovements}
                onUpdateTillColors={updateTillColors} onDeleteOrders={(ids, em) => deleteOrders(ids, em)} onPermanentDeleteOrder={permanentDeleteOrder} onUpdateOrder={updateOrder}
                onAddProduct={(p) => addProduct(p, currentUser?.email || 'admin')} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct}
                onAddStaff={addStaff} onUpdateStaff={updateStaff} onDeleteStaff={deleteStaff}
                onAddCashMovement={addCashMovement} onUpdateMovement={updateCashMovement} onDeleteMovement={deleteCashMovement} onPermanentDeleteMovement={permanentDeleteMovement}
                onStockPurchase={stockPurchase} onStockCorrection={stockCorrection} onResetCash={resetCash} onMassDelete={massDelete}
                isAuthenticated={isAdmin} currentUser={currentUser} onLogin={handleGoogleLogin} onLogout={handleLogout}
                adminList={adminList} onAddAdmin={(e) => addAdmin(e, currentUser?.email||'')} onRemoveAdmin={removeAdmin}
                tombolaConfig={tombolaConfig} onNavigateToTombola={() => setView('tombola')}
                seasonalityConfig={seasonalityConfig} onUpdateSeasonality={updateSeasonality}
                shiftSettings={shiftSettings} onUpdateShiftSettings={updateShiftSettings}
                attendanceRecords={attendanceRecords} onDeleteAttendance={deleteAttendance} onSaveAttendance={(t, i, d) => saveAttendance(t, i, d)}
                generalSettings={generalSettings} onUpdateGeneralSettings={updateGeneralSettings}
                onSendNotification={(t,b,tg) => sendNotification(t, b, currentUser?.email || 'Sistema')}
            />;
            case 'selection': default: return <TillSelection tills={TILLS} onSelectTill={(id) => { setSelectedTillId(id); setView('till'); }} onSelectReports={() => setView('reports')} onSelectAdmin={() => setView('admin')} onSelectGames={() => setView('games')} onSelectCalendar={() => setView('calendar')} onSelectAttendance={() => setView('attendance_view')} tillColors={tillColors} seasonalityConfig={seasonalityConfig} shiftSettings={shiftSettings} tombolaConfig={tombolaConfig} isSuperAdmin={isSuperAdmin} notificationPermission={notificationPermission} onRequestNotification={requestNotificationPermission} />;
        }
    };

    return (
        <div className="min-h-dvh bg-slate-100 text-slate-800 relative safe-area-padding">
            {activeToast && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-[90%] max-w-md animate-slide-up mt-[env(safe-area-inset-top)]">
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
        <BarProvider>
            <AnalottoProvider>
                <TombolaProvider>
                    <AppContent />
                </TombolaProvider>
            </AnalottoProvider>
        </BarProvider>
    );
};

export default App;
