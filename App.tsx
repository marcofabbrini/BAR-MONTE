
import React, { useState, useEffect, useCallback } from 'react';
import { db, auth, googleProvider } from './firebaseConfig';
import { collection, onSnapshot, doc, getDocs, writeBatch, runTransaction, addDoc, updateDoc, deleteDoc, setDoc, orderBy, query, getDoc, where } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView';
import TombolaView from './components/TombolaView';
import GamesHub from './components/GamesHub';
import AnalottoView from './components/AnalottoView'; // Nuovo componente
import ShiftCalendar from './components/ShiftCalendar';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order, TillColors, CashMovement, AdminUser, TombolaConfig, TombolaTicket, TombolaWin, SeasonalityConfig, ShiftSettings, AnalottoConfig, AnalottoBet, AnalottoExtraction, AnalottoWheel } from './types';

type View = 'selection' | 'till' | 'reports' | 'admin' | 'tombola' | 'games' | 'calendar' | 'analotto';

// Helper per mescolare un array
const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

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

    // Analotto State
    const [analottoConfig, setAnalottoConfig] = useState<AnalottoConfig | undefined>(undefined);
    const [analottoBets, setAnalottoBets] = useState<AnalottoBet[]>([]);
    const [analottoExtractions, setAnalottoExtractions] = useState<AnalottoExtraction[]>([]);

    // Seasonality State
    const [seasonalityConfig, setSeasonalityConfig] = useState<SeasonalityConfig | undefined>(undefined);

    // Shift Settings (Calibration)
    const [shiftSettings, setShiftSettings] = useState<ShiftSettings>({
        anchorDate: new Date().toISOString().split('T')[0], // Default provvisorio
        anchorShift: 'b', // Default richiesto
        rcAnchorDate: '',
        rcAnchorShift: 'a',
        rcAnchorSubGroup: 1
    });

    // Calcolo Super Admin
    const isSuperAdmin = currentUser && adminList.length > 0 && currentUser.email === adminList.sort((a,b) => a.timestamp.localeCompare(b.timestamp))[0].email;

    // Auth Listener Robusto
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && user.email) {
                try {
                    const adminsRef = collection(db, 'admins');
                    const q = query(adminsRef, where("email", "==", user.email));
                    
                    try {
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            setIsAdmin(true);
                        } else {
                            setIsAdmin(false);
                        }
                    } catch (readError) {
                        console.log("Verifica admin: Permesso negato o errore lettura (utente normale).");
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

    // Data Listeners
    useEffect(() => {
        setIsLoading(true);
        const unsubProducts = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ ...d.data(), id: d.id } as Product))));
        const unsubStaff = onSnapshot(collection(db, 'staff'), (s) => setStaff(s.docs.map(d => ({ ...d.data(), id: d.id } as StaffMember))));
        const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('timestamp', 'desc')), (s) => { setOrders(s.docs.map(d => ({ ...d.data(), id: d.id } as Order))); setIsLoading(false); });
        const unsubCash = onSnapshot(query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc')), (s) => setCashMovements(s.docs.map(d => ({ ...d.data(), id: d.id } as CashMovement))));
        
        const unsubAdmins = onSnapshot(collection(db, 'admins'), 
            (s) => setAdminList(s.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser))),
            (error) => console.log("Admin list sync paused (permission denied)")
        );

        const unsubSettings = onSnapshot(doc(db, 'settings', 'tillColors'), (d) => { if(d.exists()) setTillColors(d.data() as TillColors); });
        
        // TOMBOLA
        const unsubTombolaConfig = onSnapshot(doc(db, 'tombola', 'config'), (d) => { 
            if (d.exists()) setTombolaConfig(d.data() as TombolaConfig); 
            else setDoc(doc(db, 'tombola', 'config'), { 
                status: 'pending',
                maxTickets: 168,
                minTicketsToStart: 84,
                ticketPriceSingle: 1, 
                ticketPriceBundle: 5,
                jackpot: 0, 
                lastExtraction: new Date().toISOString(), 
                extractedNumbers: [] 
            }); 
        });
        const unsubTombolaTickets = onSnapshot(collection(db, 'tombola_tickets'), (s) => setTombolaTickets(s.docs.map(d => ({...d.data(), id: d.id} as TombolaTicket))));
        const unsubTombolaWins = onSnapshot(collection(db, 'tombola_wins'), (s) => setTombolaWins(s.docs.map(d => ({...d.data(), id: d.id} as TombolaWin))));

        // ANALOTTO LISTENERS
        const unsubAnalottoConfig = onSnapshot(doc(db, 'analotto', 'config'), (d) => {
            if (d.exists()) setAnalottoConfig(d.data() as AnalottoConfig);
            else setDoc(doc(db, 'analotto', 'config'), { jackpot: 0, lastExtraction: '' });
        });
        const unsubAnalottoBets = onSnapshot(query(collection(db, 'analotto_bets'), orderBy('timestamp', 'desc')), (s) => setAnalottoBets(s.docs.map(d => ({...d.data(), id: d.id} as AnalottoBet))));
        const unsubAnalottoExtractions = onSnapshot(query(collection(db, 'analotto_extractions'), orderBy('timestamp', 'desc')), (s) => setAnalottoExtractions(s.docs.map(d => ({...d.data(), id: d.id} as AnalottoExtraction))));
        
        const unsubSeasonality = onSnapshot(doc(db, 'settings', 'seasonality'), (d) => { 
            if(d.exists()) {
                setSeasonalityConfig(d.data() as SeasonalityConfig); 
            } else { 
                setDoc(doc(db, 'settings', 'seasonality'), { 
                    startDate: '', 
                    endDate: '', 
                    preset: 'custom',
                    animationType: 'none',
                    emojis: [],
                    opacity: 0.5,
                    backgroundColor: '#f8fafc' 
                }); 
            }
        });

        const unsubShiftSettings = onSnapshot(doc(db, 'settings', 'shift'), (d) => {
            if(d.exists()) {
                setShiftSettings(d.data() as ShiftSettings);
            } else {
                const today = new Date().toISOString().split('T')[0];
                setDoc(doc(db, 'settings', 'shift'), {
                    anchorDate: today,
                    anchorShift: 'b',
                    rcAnchorDate: '',
                    rcAnchorShift: 'a',
                    rcAnchorSubGroup: 1
                });
            }
        });
        
        return () => { 
            unsubProducts(); unsubStaff(); unsubOrders(); unsubCash(); unsubAdmins(); unsubSettings(); 
            unsubTombolaConfig(); unsubTombolaTickets(); unsubTombolaWins(); 
            unsubAnalottoConfig(); unsubAnalottoBets(); unsubAnalottoExtractions();
            unsubSeasonality(); unsubShiftSettings(); 
        };
    }, []);

    // Seeding
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

    // Tombola Extraction Logic (kept same)
    useEffect(() => {
        const runTombolaExtraction = async () => {
            if (!tombolaConfig || !tombolaConfig.extractedNumbers || tombolaConfig.extractedNumbers.length >= 90) return;
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
                        if (!currentConfig.extractedNumbers) currentConfig.extractedNumbers = [];

                        let nextNum;
                        do { nextNum = Math.floor(Math.random() * 90) + 1; } while (currentConfig.extractedNumbers.includes(nextNum));
                        const newExtracted = [...currentConfig.extractedNumbers, nextNum];
                        
                        const ticketsSnap = await getDocs(collection(db, 'tombola_tickets'));
                        ticketsSnap.forEach(ticketDoc => {
                            const ticket = ticketDoc.data() as TombolaTicket;
                            if (!ticket.numbers) return;
                            const matches = ticket.numbers.filter(n => newExtracted.includes(n));
                            const count = matches.length;
                            if ([2,3,4,5,15].includes(count)) {
                                const type = count === 2 ? 'Ambo' : count === 3 ? 'Terno' : count === 4 ? 'Quaterna' : count === 5 ? 'Cinquina' : 'Tombola';
                                const winRef = doc(collection(db, 'tombola_wins'));
                                t.set(winRef, { ticketId: ticketDoc.id, playerName: ticket.playerName, type, numbers: matches, timestamp: new Date().toISOString() });
                            }
                        });
                        t.update(configRef, { lastExtraction: new Date().toISOString(), extractedNumbers: newExtracted });
                    });
                } catch (e) { console.error(e); }
            }
        };
        const interval = setInterval(runTombolaExtraction, 60000);
        return () => clearInterval(interval);
    }, [tombolaConfig]);

    const handleGoogleLogin = async () => { 
        try { 
            await signInWithPopup(auth, googleProvider); 
        } catch (error: any) { 
            console.error("Login Error:", error);
            let msg = "Errore sconosciuto.";
            if (error.code === 'auth/popup-closed-by-user') msg = "Popup chiuso prima del completamento.";
            else if (error.code === 'auth/popup-blocked') msg = "Popup bloccato dal browser. Abilita i popup.";
            else if (error.message) msg = error.message;
            alert(`Login fallito: ${msg}`); 
        } 
    };

    const handleLogout = async () => { 
        try {
            await signOut(auth); 
            setView('selection'); 
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const handleAddAdmin = async (email: string) => { if (isAdmin) await addDoc(collection(db, 'admins'), { email, addedBy: currentUser?.email, timestamp: new Date().toISOString() }); };
    const handleRemoveAdmin = async (id: string) => { if (isAdmin) await deleteDoc(doc(db, 'admins', id)); };

    const handleSelectTill = useCallback((tillId: string) => { setSelectedTillId(tillId); setView('till'); }, []);
    const handleSelectReports = useCallback(() => setView('reports'), []);
    const handleSelectAdmin = useCallback(() => setView('admin'), []);
    const handleSelectGames = useCallback(() => setView('games'), []);
    const handleSelectTombola = useCallback(() => setView('tombola'), []);
    const handleSelectAnalotto = useCallback(() => setView('analotto'), []);
    const handleSelectCalendar = useCallback(() => setView('calendar'), []);
    const handleGoBack = useCallback(() => { setSelectedTillId(null); setView('selection'); }, []);

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
    
    const handleSaveAttendance = useCallback(async (tillId: string, presentStaffIds: string[]) => {
        try {
            await addDoc(collection(db, 'shift_attendance'), {
                tillId,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                presentStaffIds
            });
        } catch (error) {
            console.error("Errore salvataggio presenze:", error);
        }
    }, []);
    
    const handleBuyTombolaTicket = async (staffId: string, quantity: number) => {
        const staffMember = staff.find(s => s.id === staffId);
        if (!staffMember) return;

        try {
            await runTransaction(db, async (t) => {
                const configRef = doc(db, 'tombola', 'config');
                const configSnap = await t.get(configRef);
                if (!configSnap.exists()) throw new Error("Configurazione Tombola mancante");
                const currentConfig = configSnap.data() as TombolaConfig;

                let totalCost = 0;
                let pricePerTicket = 0;

                if (quantity === 6) {
                    totalCost = currentConfig.ticketPriceBundle;
                    pricePerTicket = totalCost / 6;
                } else {
                    totalCost = quantity * currentConfig.ticketPriceSingle;
                    pricePerTicket = currentConfig.ticketPriceSingle;
                }

                const revenue = totalCost * 0.20;
                const jackpotAdd = totalCost * 0.80;

                if (quantity === 6) {
                    const allNumbers = shuffleArray(Array.from({ length: 90 }, (_, i) => i + 1));
                    for (let i = 0; i < 6; i++) {
                        const ticketNumbers = allNumbers.slice(i * 15, (i + 1) * 15).sort((a: number, b: number) => a - b);
                        const ticketRef = doc(collection(db, 'tombola_tickets'));
                        t.set(ticketRef, { 
                            playerId: staffId, 
                            playerName: staffMember.name, 
                            numbers: ticketNumbers, 
                            purchaseTime: new Date().toISOString(),
                            pricePaid: pricePerTicket 
                        });
                    }
                } else {
                    for (let i = 0; i < quantity; i++) {
                        const ticketNumbers = generateSingleTicket();
                        const ticketRef = doc(collection(db, 'tombola_tickets'));
                        t.set(ticketRef, { 
                            playerId: staffId, 
                            playerName: staffMember.name, 
                            numbers: ticketNumbers, 
                            purchaseTime: new Date().toISOString(),
                            pricePaid: pricePerTicket
                        });
                    }
                }
                
                t.update(configRef, { jackpot: (currentConfig.jackpot || 0) + jackpotAdd });
                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { amount: totalCost, reason: `Tombola: ${quantity} cartelle (${staffMember.name})`, timestamp: new Date().toISOString(), type: 'deposit', category: 'tombola' });
                const barCashRef = doc(collection(db, 'cash_movements'));
                t.set(barCashRef, { amount: revenue, reason: `Utile Tombola (20%)`, timestamp: new Date().toISOString(), type: 'deposit', category: 'bar' });
            });
        } catch (e) { console.error(e); throw e; }
    };
    
    // === ANALOTTO LOGIC ===
    const handlePlaceAnalottoBet = async (betData: Omit<AnalottoBet, 'id' | 'timestamp'>) => {
        try {
            await runTransaction(db, async (t) => {
                // 1. Aggiungi Schedina
                const betRef = doc(collection(db, 'analotto_bets'));
                t.set(betRef, {
                    ...betData,
                    timestamp: new Date().toISOString()
                });

                // 2. Aggiorna Montepremi Analotto (separato)
                const configRef = doc(db, 'analotto', 'config');
                const configSnap = await t.get(configRef);
                const currentJackpot = configSnap.exists() ? (configSnap.data().jackpot || 0) : 0;
                
                // Tutto l'incasso va nel montepremi? O tratteniamo una %? 
                // Per ora assumiamo 100% nel montepremi come da richiesta "incasso nel fondo gioco"
                // Se serve, possiamo dividere come nella tombola (80/20).
                // Mettiamo 80/20 anche qui per coerenza con la Tombola.
                const jackpotPart = betData.amount * 0.8;
                const barPart = betData.amount * 0.2;

                t.set(configRef, { jackpot: currentJackpot + jackpotPart }, { merge: true });

                // 3. Registra Movimento Cassa
                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, {
                    amount: betData.amount,
                    reason: `Analotto: Giocata (${betData.playerName})`,
                    timestamp: new Date().toISOString(),
                    type: 'deposit',
                    category: 'analotto'
                });
                
                // Utile Bar
                const barCashRef = doc(collection(db, 'cash_movements'));
                t.set(barCashRef, { 
                    amount: barPart, 
                    reason: `Utile Analotto (20%)`, 
                    timestamp: new Date().toISOString(), 
                    type: 'deposit', 
                    category: 'bar' 
                });
            });
        } catch (e) {
            console.error("Errore giocata analotto:", e);
            throw e;
        }
    };

    const handleAnalottoExtraction = async () => {
        if (!isSuperAdmin) return;
        try {
            const wheels: AnalottoWheel[] = ['APS', 'Campagnola', 'Autoscala', 'Autobotte', 'Direttivo'];
            const extractionData: Record<string, number[]> = {};

            wheels.forEach(wheel => {
                const nums = new Set<number>();
                while(nums.size < 5) {
                    nums.add(Math.floor(Math.random() * 90) + 1);
                }
                extractionData[wheel] = Array.from(nums);
            });

            await addDoc(collection(db, 'analotto_extractions'), {
                timestamp: new Date().toISOString(),
                numbers: extractionData
            });

            await updateDoc(doc(db, 'analotto', 'config'), {
                lastExtraction: new Date().toISOString()
            });

        } catch (e) {
            console.error(e);
            throw e;
        }
    };
    // ======================

    const handleRefundTombolaTicket = async (ticketId: string) => {
        try {
            await runTransaction(db, async (t) => {
                const configRef = doc(db, 'tombola', 'config');
                const configSnap = await t.get(configRef);
                if (!configSnap.exists()) throw new Error("Configurazione Tombola mancante");
                const currentConfig = configSnap.data() as TombolaConfig;

                if (currentConfig.status === 'active' || currentConfig.status === 'completed') {
                    throw new Error("Impossibile annullare cartelle a gioco iniziato.");
                }

                const ticketRef = doc(db, 'tombola_tickets', ticketId);
                const ticketSnap = await t.get(ticketRef);
                if (!ticketSnap.exists()) throw new Error("Cartella non trovata");

                const ticketData = ticketSnap.data() as TombolaTicket;
                
                // Rimborso sicuro basato sul prezzo pagato
                const refundAmount = ticketData.pricePaid !== undefined ? ticketData.pricePaid : currentConfig.ticketPriceSingle;
                const jackpotDeduction = refundAmount * 0.80;
                const revenueDeduction = refundAmount * 0.20;

                t.delete(ticketRef);
                
                t.update(configRef, { 
                    jackpot: Math.max(0, (currentConfig.jackpot || 0) - jackpotDeduction) 
                });

                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, { 
                    amount: refundAmount, 
                    reason: "Rimborso Cartella (Annullamento)", 
                    timestamp: new Date().toISOString(), 
                    type: 'withdrawal', 
                    category: 'tombola' 
                });

                const barCashRef = doc(collection(db, 'cash_movements'));
                t.set(barCashRef, { 
                    amount: revenueDeduction, 
                    reason: "Storno Utile Tombola (Rimborso)", 
                    timestamp: new Date().toISOString(), 
                    type: 'withdrawal', 
                    category: 'bar' 
                });
            });
        } catch (e) {
            console.error(e);
            throw e;
        }
    };

    const generateSingleTicket = () => {
        const ticket: number[] = [];
        const cols: number[][] = Array.from({ length: 9 }, () => []);
        for (let i = 0; i < 9; i++) {
            const start = i * 10 + 1;
            const end = i === 8 ? 90 : (i + 1) * 10;
            for(let n=start; n <= end; n++) if(i===0 && n>9) continue; else cols[i].push(n);
        }
        let numbersCount = 0;
        while(numbersCount < 15) {
            const colIdx = Math.floor(Math.random() * 9);
            if(cols[colIdx].length > 0) {
                const numIdx = Math.floor(Math.random() * cols[colIdx].length);
                const num = cols[colIdx][numIdx];
                if(!ticket.includes(num)) {
                    ticket.push(num);
                    cols[colIdx].splice(numIdx, 1);
                    numbersCount++;
                }
            }
        }
        return ticket.sort((a,b) => a-b);
    };

    const handleUpdateTombolaConfig = async (cfg: Partial<TombolaConfig>) => { await setDoc(doc(db, 'tombola', 'config'), cfg, { merge: true }); };
    const handleTombolaStart = async () => { await updateDoc(doc(db, 'tombola', 'config'), { status: 'active', lastExtraction: new Date().toISOString() }); };

    const handleTransferGameFunds = async (amount: number, gameName: string) => {
        if (amount <= 0) return;
        try {
            await runTransaction(db, async (t) => {
                if (gameName.toLowerCase().includes('tombola')) {
                    t.update(doc(db, 'tombola', 'config'), { jackpot: 0 });
                } else if (gameName.toLowerCase().includes('analotto')) {
                    t.update(doc(db, 'analotto', 'config'), { jackpot: 0 });
                }
                const cashRef = doc(collection(db, 'cash_movements'));
                t.set(cashRef, {
                    amount: amount,
                    reason: `Versamento utile ${gameName}`,
                    timestamp: new Date().toISOString(),
                    type: 'deposit',
                    category: 'bar',
                    isDeleted: false
                });
            });
        } catch (error) { console.error("Error transferring funds:", error); }
    };

    const addProduct = async (d: any) => { await addDoc(collection(db, 'products'), { ...d, createdAt: new Date().toISOString(), createdBy: currentUser?.email || 'admin' }); };
    const updateProduct = async (p: any) => { const { id, ...d } = p; await updateDoc(doc(db, 'products', id), d); };
    const deleteProduct = async (id: string) => { await deleteDoc(doc(db, 'products', id)); };
    const addStaff = async (d: any) => { await addDoc(collection(db, 'staff'), d); };
    const updateStaff = async (s: any) => { const { id, ...d } = s; await updateDoc(doc(db, 'staff', id), d); };
    const deleteStaff = async (id: string) => { await deleteDoc(doc(db, 'staff', id)); };
    const addCashMovement = async (d: any) => { await addDoc(collection(db, 'cash_movements'), d); };
    const updateCashMovement = async (m: CashMovement) => { const { id, ...d } = m; await updateDoc(doc(db, 'cash_movements', id), d); };
    const deleteCashMovement = async (id: string, email: string) => { await updateDoc(doc(db, 'cash_movements', id), { isDeleted: true, deletedBy: email, deletedAt: new Date().toISOString() }); };
    const updateTillColors = async (c: TillColors) => { await setDoc(doc(db, 'settings', 'tillColors'), c, { merge: true }); };
    const deleteOrders = async (ids: string[], email: string) => { const batch = writeBatch(db); ids.forEach(id => batch.update(doc(db, 'orders', id), { isDeleted: true, deletedBy: email, deletedAt: new Date().toISOString() })); await batch.commit(); };
    const permanentDeleteOrder = async (id: string) => { await deleteDoc(doc(db, 'orders', id)); };
    const updateOrder = async (o: Order) => { const { id, ...d } = o; await updateDoc(doc(db, 'orders', id), d); };
    const handleStockPurchase = async (pid: string, qty: number, cost: number) => { const pRef = doc(db, 'products', pid); const pSnap = await getDoc(pRef); if(pSnap.exists()) { await updateDoc(pRef, { stock: pSnap.data().stock + qty, costPrice: cost }); await addDoc(collection(db, 'cash_movements'), { amount: qty*cost, reason: `Acquisto Stock: ${pSnap.data().name}`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' }); } };
    const handleStockCorrection = async (pid: string, stock: number) => { await updateDoc(doc(db, 'products', pid), { stock }); };
    const handleResetCash = async () => { const batch = writeBatch(db); cashMovements.forEach(m => batch.update(doc(db, 'cash_movements', m.id), { amount: 0, reason: m.reason + ' (RESET)' })); await batch.commit(); };
    const handleMassDelete = async (date: string, type: 'orders'|'movements') => { const q = query(collection(db, type === 'orders' ? 'orders' : 'cash_movements'), where('timestamp', '<=', new Date(date).toISOString())); const s = await getDocs(q); const batch = writeBatch(db); s.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); };
    const handleUpdateSeasonality = async (cfg: SeasonalityConfig) => { await setDoc(doc(db, 'settings', 'seasonality'), cfg); };
    const handleUpdateShiftSettings = async (cfg: ShiftSettings) => { await setDoc(doc(db, 'settings', 'shift'), cfg); };

    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
        switch (view) {
            case 'till': return <TillView till={TILLS.find(t=>t.id===selectedTillId)!} onGoBack={handleGoBack} products={products} allStaff={staff} allOrders={orders} onCompleteOrder={handleCompleteOrder} tillColors={tillColors} onSaveAttendance={handleSaveAttendance} onPlayAnalotto={handleSelectAnalotto} />;
            case 'reports': return <ReportsView onGoBack={handleGoBack} products={products} staff={staff} orders={orders} />;
            case 'tombola': 
                if (!tombolaConfig) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;
                return <TombolaView 
                onGoBack={handleGoBack} 
                config={tombolaConfig} 
                tickets={tombolaTickets} 
                wins={tombolaWins} 
                onBuyTicket={handleBuyTombolaTicket} 
                onRefundTicket={handleRefundTombolaTicket}
                staff={staff} 
                onStartGame={handleTombolaStart} 
                isSuperAdmin={isSuperAdmin} 
                onTransferFunds={handleTransferGameFunds}
                onUpdateTombolaConfig={handleUpdateTombolaConfig}
            />;
            case 'analotto':
                return <AnalottoView 
                    onGoBack={handleGoBack}
                    config={analottoConfig}
                    bets={analottoBets}
                    extractions={analottoExtractions}
                    staff={staff}
                    onPlaceBet={handlePlaceAnalottoBet}
                    onRunExtraction={handleAnalottoExtraction}
                    isSuperAdmin={isSuperAdmin}
                    onTransferFunds={handleTransferGameFunds}
                />;
            case 'games':
                return <GamesHub onGoBack={handleGoBack} onPlayTombola={handleSelectTombola} onPlayAnalotto={handleSelectAnalotto} tombolaConfig={tombolaConfig} analottoConfig={analottoConfig} />;
            case 'calendar':
                return <ShiftCalendar onGoBack={handleGoBack} tillColors={tillColors} shiftSettings={shiftSettings} />;
            case 'admin': return <AdminView 
                onGoBack={handleGoBack} 
                orders={orders} 
                tills={TILLS} 
                tillColors={tillColors} 
                products={products} 
                staff={staff} 
                cashMovements={cashMovements} 
                onUpdateTillColors={updateTillColors} 
                onDeleteOrders={deleteOrders} 
                onPermanentDeleteOrder={permanentDeleteOrder} 
                onUpdateOrder={updateOrder} 
                onAddProduct={addProduct} 
                onUpdateProduct={updateProduct} 
                onDeleteProduct={deleteProduct} 
                onAddStaff={addStaff} 
                onUpdateStaff={updateStaff} 
                onDeleteStaff={deleteStaff} 
                onAddCashMovement={addCashMovement} 
                onUpdateMovement={updateCashMovement} 
                onDeleteMovement={deleteCashMovement} 
                onStockPurchase={handleStockPurchase} 
                onStockCorrection={handleStockCorrection} 
                onResetCash={handleResetCash} 
                onMassDelete={handleMassDelete} 
                isAuthenticated={isAdmin} 
                currentUser={currentUser} 
                onLogin={handleGoogleLogin} 
                onLogout={handleLogout} 
                adminList={adminList} 
                onAddAdmin={handleAddAdmin} 
                onRemoveAdmin={handleRemoveAdmin} 
                tombolaConfig={tombolaConfig} 
                onNavigateToTombola={handleSelectTombola}
                seasonalityConfig={seasonalityConfig}
                onUpdateSeasonality={handleUpdateSeasonality}
                shiftSettings={shiftSettings}
                onUpdateShiftSettings={handleUpdateShiftSettings}
            />;
            default: return <TillSelection tills={TILLS} onSelectTill={handleSelectTill} onSelectReports={handleSelectReports} onSelectAdmin={handleSelectAdmin} onSelectGames={handleSelectGames} onSelectCalendar={handleSelectCalendar} tillColors={tillColors} seasonalityConfig={seasonalityConfig} shiftSettings={shiftSettings} />;
        }
    };

    return <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">{renderContent()}</div>;
};

export default App;
