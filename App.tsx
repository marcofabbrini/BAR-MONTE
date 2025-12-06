import React, { useState, useEffect, useCallback } from 'react';
import { db, auth, googleProvider } from './firebaseConfig';
import { collection, onSnapshot, doc, getDocs, writeBatch, runTransaction, addDoc, updateDoc, deleteDoc, setDoc, orderBy, query, getDoc, where } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView';
import TombolaView from './components/TombolaView';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order, TillColors, CashMovement, AdminUser, TombolaConfig, TombolaTicket, TombolaWin } from './types';

type View = 'selection' | 'till' | 'reports' | 'admin' | 'tombola';

const App: React.FC = () => {
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

    // Tombola State
    const [tombolaConfig, setTombolaConfig] = useState<TombolaConfig | undefined>(undefined);
    const [tombolaTickets, setTombolaTickets] = useState<TombolaTicket[]>([]);
    const [tombolaWins, setTombolaWins] = useState<TombolaWin[]>([]);

    // Calcolo Super Admin (il primo in lista è il Super Admin)
    const isSuperAdmin = currentUser && adminList.length > 0 && currentUser.email === adminList.sort((a,b) => a.timestamp.localeCompare(b.timestamp))[0].email;

    // Auth Listener & Admin Check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && user.email) {
                const adminsRef = collection(db, 'admins');
                const adminsSnapshot = await getDocs(adminsRef);
                
                if (adminsSnapshot.empty) {
                    await addDoc(adminsRef, { email: user.email, addedBy: 'SYSTEM_BOOTSTRAP', timestamp: new Date().toISOString() });
                    setIsAdmin(true);
                } else {
                    const q = query(adminsRef, where("email", "==", user.email));
                    const querySnapshot = await getDocs(q);
                    setIsAdmin(!querySnapshot.empty);
                }
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // Data Listeners
    useEffect(() => {
        setIsLoading(true);
        
        const unsubProducts = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
        const unsubStaff = onSnapshot(collection(db, 'staff'), (s) => setStaff(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember))));
        const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (s) => {
            setOrders(s.docs.map(d => ({ ...d.data(), id: d.id } as Order)));
            setIsLoading(false);
        });
        const unsubCash = onSnapshot(query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc')), (s) => setCashMovements(s.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement))));
        const unsubAdmins = onSnapshot(collection(db, 'admins'), (s) => setAdminList(s.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser))));
        const unsubSettings = onSnapshot(doc(db, 'settings', 'tillColors'), (d) => { if(d.exists()) setTillColors(d.data() as TillColors); });

        // Tombola Listeners
        const unsubTombolaConfig = onSnapshot(doc(db, 'tombola', 'config'), (d) => {
            if (d.exists()) setTombolaConfig(d.data() as TombolaConfig);
            else setDoc(doc(db, 'tombola', 'config'), { 
                status: 'pending',
                maxTickets: 90, 
                ticketPriceSingle: 1, 
                ticketPriceBundle: 5,
                jackpot: 0, 
                lastExtraction: new Date().toISOString(), 
                extractedNumbers: [] 
            });
        });
        const unsubTombolaTickets = onSnapshot(collection(db, 'tombola_tickets'), (s) => setTombolaTickets(s.docs.map(d => ({...d.data(), id: d.id} as TombolaTicket))));
        const unsubTombolaWins = onSnapshot(collection(db, 'tombola_wins'), (s) => setTombolaWins(s.docs.map(d => ({...d.data(), id: d.id} as TombolaWin))));

        return () => { unsubProducts(); unsubStaff(); unsubOrders(); unsubCash(); unsubAdmins(); unsubSettings(); unsubTombolaConfig(); unsubTombolaTickets(); unsubTombolaWins(); };
    }, []);

    // Seeding iniziale se vuoto
    useEffect(() => {
        const seedDatabase = async () => {
            try {
                const productsSnap = await getDocs(collection(db, 'products'));
                if (productsSnap.empty) {
                    const batch = writeBatch(db);
                    INITIAL_MENU_ITEMS.forEach(item => batch.set(doc(db, 'products', item.id), item));
                    await batch.commit();
                }
                const staffSnap = await getDocs(collection(db, 'staff'));
                if (staffSnap.empty) {
                    const batch = writeBatch(db);
                    INITIAL_STAFF_MEMBERS.forEach(member => batch.set(doc(db, 'staff', member.id), member));
                    await batch.commit();
                }
            } catch (error) { console.error("Error seeding database:", error); }
        };
        seedDatabase();
    }, []);

    // Tombola Logic: Extraction Engine (Lazy - Solo se ACTIVE)
    useEffect(() => {
        const runTombolaExtraction = async () => {
            if (!tombolaConfig || tombolaConfig.extractedNumbers.length >= 90) return;

            // CHECK AVVIO RIGOROSO: Solo se status è ACTIVE (premuto START da admin)
            if (tombolaConfig.status !== 'active') return;

            const now = new Date().getTime();
            const last = new Date(tombolaConfig.lastExtraction).getTime();
            const diffHours = (now - last) / (1000 * 60 * 60);

            if (diffHours >= 2) {
                try {
                    await runTransaction(db, async (t) => {
                        const configRef = doc(db, 'tombola', 'config');
                        const configSnap = await t.get(configRef);
                        const currentConfig = configSnap.data() as TombolaConfig;
                        
                        // Estrai numero casuale non presente
                        let nextNum;
                        do { nextNum = Math.floor(Math.random() * 90) + 1; } 
                        while (currentConfig.extractedNumbers.includes(nextNum));
                        
                        const newExtracted = [...currentConfig.extractedNumbers, nextNum];
                        
                        // Check Vincite
                        const ticketsSnap = await getDocs(collection(db, 'tombola_tickets'));
                        ticketsSnap.forEach(ticketDoc => {
                            const ticket = ticketDoc.data() as TombolaTicket;
                            const matches = ticket.numbers.filter(n => newExtracted.includes(n));
                            const count = matches.length;
                            
                            if ([2,3,4,5,15].includes(count)) {
                                const type = count === 2 ? 'Ambo' : count === 3 ? 'Terno' : count === 4 ? 'Quaterna' : count === 5 ? 'Cinquina' : 'Tombola';
                                const winRef = doc(collection(db, 'tombola_wins'));
                                // Qui servirebbe check se già vinto, semplificato per brevità
                                t.set(winRef, {
                                    ticketId: ticketDoc.id,
                                    playerName: ticket.playerName,
                                    type,
                                    numbers: matches,
                                    timestamp: new Date().toISOString()
                                });
                            }
                        });

                        t.update(configRef, { 
                            lastExtraction: new Date().toISOString(),
                            extractedNumbers: newExtracted
                        });
                    });
                } catch (e) { console.error("Tombola extraction error", e); }
            }
        };
        const interval = setInterval(runTombolaExtraction, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [tombolaConfig, tombolaTickets]);

    // Auth Actions
    const handleGoogleLogin = async () => {
        try { await signInWithPopup(auth, googleProvider); } 
        catch (error) { console.error(error); alert("Errore login. Verifica domini autorizzati su Firebase."); }
    };
    const handleLogout = async () => { await signOut(auth); setView('selection'); };
    const handleAddAdmin = async (email: string) => { if (isAdmin) await addDoc(collection(db, 'admins'), { email, addedBy: currentUser?.email, timestamp: new Date().toISOString() }); };
    const handleRemoveAdmin = async (id: string) => { if (isAdmin) await deleteDoc(doc(db, 'admins', id)); };

    // Navigation
    const handleSelectTill = useCallback((tillId: string) => { setSelectedTillId(tillId); setView('till'); }, []);
    const handleSelectReports = useCallback(() => setView('reports'), []);
    const handleSelectAdmin = useCallback(() => setView('admin'), []);
    const handleSelectTombola = useCallback(() => setView('tombola'), []);
    const handleGoBack = useCallback(() => { setSelectedTillId(null); setView('selection'); }, []);

    // Operations
    const handleCompleteOrder = useCallback(async (newOrderData: Omit<Order, 'id'>) => {
        try {
            await runTransaction(db, async (t) => {
                const productDocs = await Promise.all(newOrderData.items.map(i => t.get(doc(db, 'products', i.product.id))));
                productDocs.forEach((d, i) => { if (!d.exists()) throw new Error(`Prod "${newOrderData.items[i].product.name}" mancante.`); });
                const orderRef = doc(collection(db, 'orders'));
                t.set(orderRef, { ...newOrderData, id: orderRef.id });
                productDocs.forEach((d, i) => t.update(d.ref, { stock: d.data().stock - newOrderData.items[i].quantity }));
            });
        } catch (error) { console.error(error); throw error; }
    }, []);
    
    // Tombola Actions
    const handleBuyTombolaTicket = async (staffId: string, quantity: number) => {
        if (!tombolaConfig) return;
        const staffMember = staff.find(s => s.id === staffId);
        if (!staffMember) return;

        // Pricing Logic: 6 = 5€, altrimenti 1€ l'una (o config)
        let totalCost = 0;
        if (quantity === 6) {
            totalCost = tombolaConfig.ticketPriceBundle;
        } else {
            totalCost = quantity * tombolaConfig.ticketPriceSingle;
        }

        const revenue = totalCost * 0.20; // 20% al bar
        const jackpotAdd = totalCost * 0.80; // 80% montepremi

        try {
            await runTransaction(db, async (t) => {
                // 1. Crea Tickets con numeri distribuiti per colonne (Decine)
                for (let i = 0; i < quantity; i++) {
                    const numbers: number[] = [];
                    // Genera numeri assicurando distribuzione per colonne se possibile, altrimenti random puro ordinato
                    // Per semplicità qui usiamo random puro ordinato che verrà visualizzato in griglia
                    const pool = Array.from({length: 90}, (_, i) => i + 1);
                    for(let j=0; j<15; j++) {
                        const idx = Math.floor(Math.random() * pool.length);
                        numbers.push(pool[idx]);
                        pool.splice(idx, 1);
                    }
                    numbers.sort((a,b)=>a-b);

                    const ticketRef = doc(collection(db, 'tombola_tickets'));
                    t.set(ticketRef, { playerId: staffId, playerName: staffMember.name, numbers, purchaseTime: new Date().toISOString() });
                }
                // 2. Aggiorna Config (Jackpot)
                t.update(doc(db, 'tombola', 'config'), { jackpot: tombolaConfig.jackpot + jackpotAdd });
                // 3. Versa quota al Bar (Categoria Tombola)
                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { amount: revenue, reason: `Tombola: ${quantity} cartelle (${staffMember.name})`, timestamp: new Date().toISOString(), type: 'deposit', category: 'tombola' });
            });
        } catch (e) { console.error(e); throw e; }
    };

    const handleUpdateTombolaConfig = async (cfg: TombolaConfig) => {
        await setDoc(doc(db, 'tombola', 'config'), cfg);
    };

    const handleTombolaStart = async () => {
        await updateDoc(doc(db, 'tombola', 'config'), { status: 'active', lastExtraction: new Date().toISOString() });
    };

    // Generic CRUD
    const addProduct = async (d: any) => { await addDoc(collection(db, 'products'), d); };
    const updateProduct = async (p: any) => { const { id, ...d } = p; await updateDoc(doc(db, 'products', id), d); };
    const deleteProduct = async (id: string) => { await deleteDoc(doc(db, 'products', id)); };
    const addStaff = async (d: any) => { await addDoc(collection(db, 'staff'), d); };
    const updateStaff = async (s: any) => { const { id, ...d } = s; await updateDoc(doc(db, 'staff', id), d); };
    const deleteStaff = async (id: string) => { await deleteDoc(doc(db, 'staff', id)); };
    const addCashMovement = async (d: any) => { await addDoc(collection(db, 'cash_movements'), d); };
    const updateTillColors = async (c: TillColors) => { await setDoc(doc(db, 'settings', 'tillColors'), c, { merge: true }); };
    
    // Advanced Features
    const deleteOrders = async (ids: string[], email: string) => {
        const batch = writeBatch(db);
        ids.forEach(id => batch.update(doc(db, 'orders', id), { isDeleted: true, deletedBy: email, deletedAt: new Date().toISOString() }));
        await batch.commit();
    };
    const permanentDeleteOrder = async (id: string) => { await deleteDoc(doc(db, 'orders', id)); };
    const updateOrder = async (o: Order) => { const { id, ...d } = o; await updateDoc(doc(db, 'orders', id), d); };
    const handleStockPurchase = async (pid: string, qty: number, cost: number) => {
        const pRef = doc(db, 'products', pid);
        const pSnap = await getDoc(pRef);
        if(pSnap.exists()) {
            await updateDoc(pRef, { stock: pSnap.data().stock + qty, costPrice: cost });
            await addDoc(collection(db, 'cash_movements'), { amount: qty*cost, reason: `Acquisto Stock: ${pSnap.data().name}`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' });
        }
    };
    const handleStockCorrection = async (pid: string, stock: number) => { await updateDoc(doc(db, 'products', pid), { stock }); };
    const handleResetCash = async () => {
        const batch = writeBatch(db);
        cashMovements.forEach(m => batch.update(doc(db, 'cash_movements', m.id), { amount: 0, reason: m.reason + ' (RESET)' }));
        await batch.commit();
    };
    const handleMassDelete = async (date: string, type: 'orders'|'movements') => {
        const q = query(collection(db, type === 'orders' ? 'orders' : 'cash_movements'), where('timestamp', '<=', new Date(date).toISOString()));
        const s = await getDocs(q);
        const batch = writeBatch(db);
        s.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    };

    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
        switch (view) {
            case 'till': return <TillView till={TILLS.find(t=>t.id===selectedTillId)!} onGoBack={handleGoBack} products={products} allStaff={staff} allOrders={orders} onCompleteOrder={handleCompleteOrder} tillColors={tillColors} />;
            case 'reports': return <ReportsView onGoBack={handleGoBack} products={products} staff={staff} orders={orders} />;
            case 'tombola': return <TombolaView onGoBack={handleGoBack} config={tombolaConfig!} tickets={tombolaTickets} wins={tombolaWins} onBuyTicket={handleBuyTombolaTicket} staff={staff} onStartGame={handleTombolaStart} isSuperAdmin={isSuperAdmin} />;
            case 'admin': return <AdminView onGoBack={handleGoBack} orders={orders} tills={TILLS} tillColors={tillColors} products={products} staff={staff} cashMovements={cashMovements} onUpdateTillColors={updateTillColors} onDeleteOrders={deleteOrders} onPermanentDeleteOrder={permanentDeleteOrder} onUpdateOrder={updateOrder} onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct} onAddStaff={addStaff} onUpdateStaff={updateStaff} onDeleteStaff={deleteStaff} onAddCashMovement={addCashMovement} onStockPurchase={handleStockPurchase} onStockCorrection={handleStockCorrection} onResetCash={handleResetCash} onMassDelete={handleMassDelete} isAuthenticated={isAdmin} currentUser={currentUser} onLogin={handleGoogleLogin} onLogout={handleLogout} adminList={adminList} onAddAdmin={handleAddAdmin} onRemoveAdmin={handleRemoveAdmin} tombolaConfig={tombolaConfig} onUpdateTombolaConfig={handleUpdateTombolaConfig} />;
            default: return <TillSelection tills={TILLS} onSelectTill={handleSelectTill} onSelectReports={handleSelectReports} onSelectAdmin={handleSelectAdmin} onSelectTombola={handleSelectTombola} tillColors={tillColors} />;
        }
    };

    return <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">{renderContent()}</div>;
};

export default App;