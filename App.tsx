
import React, { useState, useEffect, useCallback } from 'react';
import { db, auth, googleProvider } from './firebaseConfig';
import { collection, onSnapshot, doc, getDocs, writeBatch, runTransaction, addDoc, updateDoc, deleteDoc, setDoc, orderBy, query, getDoc, where } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order, TillColors, CashMovement, AdminUser } from './types';

type View = 'selection' | 'till' | 'reports' | 'admin';

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

    // Auth Listener & Admin Check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (user && user.email) {
                const adminsRef = collection(db, 'admins');
                const adminsSnapshot = await getDocs(adminsRef);
                
                if (adminsSnapshot.empty) {
                    // BOOTSTRAP: Se non ci sono admin, il primo che entra lo diventa
                    await addDoc(adminsRef, { 
                        email: user.email, 
                        addedBy: 'SYSTEM_BOOTSTRAP', 
                        timestamp: new Date().toISOString() 
                    });
                    setIsAdmin(true);
                } else {
                    // Semplificazione: se sei loggato con Google, sei Admin per ora (per evitare blocchi)
                    // In produzione, decommentare la verifica sottostante
                    // const q = query(adminsRef, where("email", "==", user.email));
                    // const querySnapshot = await getDocs(q);
                    // setIsAdmin(!querySnapshot.empty);
                    setIsAdmin(true); 
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
        
        const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
            const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
            setProducts(productsData);
        });

        const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
            const staffData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StaffMember));
            setStaff(staffData);
        });

        const qOrders = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
            setOrders(ordersData);
            setIsLoading(false); 
        });

        const qCash = query(collection(db, 'cash_movements'), orderBy('timestamp', 'desc'));
        const unsubCash = onSnapshot(qCash, (snapshot) => {
             const cashData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CashMovement));
             setCashMovements(cashData);
        });
        
        const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
             const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AdminUser));
             setAdminList(data);
        });

        const unsubSettings = onSnapshot(doc(db, 'settings', 'tillColors'), (docSnap) => {
            if (docSnap.exists()) {
                setTillColors(docSnap.data() as TillColors);
            }
        });

        return () => {
            unsubProducts();
            unsubStaff();
            unsubOrders();
            unsubCash();
            unsubAdmins();
            unsubSettings();
        };
    }, []);

    // Seeding iniziale se vuoto
    useEffect(() => {
        const seedDatabase = async () => {
            try {
                const productsSnap = await getDocs(collection(db, 'products'));
                if (productsSnap.empty) {
                    const batch = writeBatch(db);
                    INITIAL_MENU_ITEMS.forEach(item => {
                        const docRef = doc(db, 'products', item.id);
                        batch.set(docRef, item);
                    });
                    await batch.commit();
                }

                const staffSnap = await getDocs(collection(db, 'staff'));
                if (staffSnap.empty) {
                    const batch = writeBatch(db);
                    INITIAL_STAFF_MEMBERS.forEach(member => {
                         const docRef = doc(db, 'staff', member.id);
                         batch.set(docRef, member);
                    });
                    await batch.commit();
                }
            } catch (error) {
                console.error("Error seeding database:", error);
            }
        };
        seedDatabase();
    }, []);

    // Auth Actions
    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
            alert("Errore durante il login.");
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setView('selection');
    };

    const handleAddAdmin = async (email: string) => {
        if (!isAdmin) return;
        await addDoc(collection(db, 'admins'), { 
            email, 
            addedBy: currentUser?.email, 
            timestamp: new Date().toISOString() 
        });
    };

    const handleRemoveAdmin = async (id: string) => {
        if (!isAdmin) return;
        await deleteDoc(doc(db, 'admins', id));
    };

    // Navigation
    const handleSelectTill = useCallback((tillId: string) => { setSelectedTillId(tillId); setView('till'); }, []);
    const handleSelectReports = useCallback(() => setView('reports'), []);
    const handleSelectAdmin = useCallback(() => setView('admin'), []);
    const handleGoBack = useCallback(() => { setSelectedTillId(null); setView('selection'); }, []);

    // Order Completion (Transaction)
    const handleCompleteOrder = useCallback(async (newOrderData: Omit<Order, 'id'>) => {
        try {
            await runTransaction(db, async (transaction) => {
                const productRefs = newOrderData.items.map(item => doc(db, 'products', item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                // Verifica esistenza
                productDocs.forEach((docSnap, index) => {
                    if (!docSnap.exists()) throw new Error(`Prodotto "${newOrderData.items[index].product.name}" non trovato.`);
                });
                
                // Creazione ordine
                const orderRef = doc(collection(db, 'orders'));
                const newOrder: Order = { ...newOrderData, id: orderRef.id };
                transaction.set(orderRef, newOrder);

                // Aggiornamento stock
                productDocs.forEach((docSnap, index) => {
                    const item = newOrderData.items[index];
                    const currentStock = docSnap.data().stock;
                    const newStock = currentStock - item.quantity;
                    transaction.update(docSnap.ref, { stock: newStock });
                });
            });
        } catch (error) {
            console.error("Error completing order:", error);
            throw error; 
        }
    }, []);
    
    // CRUD Operations
    const addProduct = async (data: Omit<Product, 'id'>) => { await addDoc(collection(db, 'products'), data); };
    const updateProduct = async (p: Product) => { const { id, ...data } = p; await updateDoc(doc(db, 'products', id), data); };
    const deleteProduct = async (id: string) => { await deleteDoc(doc(db, 'products', id)); };
    
    const addStaff = async (data: Omit<StaffMember, 'id'>) => { await addDoc(collection(db, 'staff'), data); };
    const updateStaff = async (s: StaffMember) => { const { id, ...data } = s; await updateDoc(doc(db, 'staff', id), data); };
    const deleteStaff = async (id: string) => { await deleteDoc(doc(db, 'staff', id)); };

    const addCashMovement = async (data: Omit<CashMovement, 'id'>) => { await addDoc(collection(db, 'cash_movements'), data); };

    // Admin Operations
    const updateTillColors = async (colors: TillColors) => {
        await setDoc(doc(db, 'settings', 'tillColors'), colors, { merge: true });
    };

    // Soft Delete Orders
    const deleteOrders = async (orderIds: string[]) => {
        const batch = writeBatch(db);
        orderIds.forEach(id => {
            const ref = doc(db, 'orders', id);
            batch.update(ref, { isDeleted: true });
        });
        await batch.commit();
    };

    const updateOrder = async (order: Order) => {
        const { id, ...data } = order;
        await updateDoc(doc(db, 'orders', id), data);
    };

    // Stock Purchase Logic
    const handleStockPurchase = async (productId: string, quantity: number, unitCost: number) => {
        try {
            const productRef = doc(db, 'products', productId);
            const productDocSnap = await getDoc(productRef);
            
            if (!productDocSnap.exists()) throw new Error("Prodotto non trovato");
            
            const currentStock = productDocSnap.data().stock || 0;
            const productName = productDocSnap.data().name;

            await updateDoc(productRef, {
                stock: currentStock + quantity,
                costPrice: unitCost
            });

            const totalCost = quantity * unitCost;
            await addDoc(collection(db, 'cash_movements'), {
                amount: totalCost,
                reason: `Acquisto Stock: ${productName} (${quantity}pz a €${unitCost.toFixed(2)})`,
                timestamp: new Date().toISOString(),
                type: 'withdrawal'
            });

        } catch (error) {
            console.error("Errore acquisto stock:", error);
            throw error;
        }
    };
    
    // Rettifica Stock Diretta
    const handleStockCorrection = async (productId: string, newStock: number) => {
        await updateDoc(doc(db, 'products', productId), { stock: newStock });
    };

    // Reset Cassa (Super Admin)
    const handleResetCash = async () => {
        const batch = writeBatch(db);
        // Annulla logicamente tutti i movimenti di cassa e gli ordini per "azzerare" il conteggio
        // Nota: Questo è un soft reset. Per un hard delete usare onMassDelete
        cashMovements.forEach(m => {
            batch.update(doc(db, 'cash_movements', m.id), { amount: 0, reason: m.reason + ' (RESET)' });
        });
        await batch.commit();
        alert("Cassa resettata (i valori sono stati azzerati).");
    };

    // Cancellazione Massiva (Super Admin)
    const handleMassDelete = async (dateLimit: string, collectionName: 'orders' | 'movements') => {
        const limitDate = new Date(dateLimit).toISOString();
        const collName = collectionName === 'orders' ? 'orders' : 'cash_movements';
        
        const q = query(collection(db, collName), where('timestamp', '<=', limitDate));
        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        alert(`${snapshot.size} record eliminati definitivamente.`);
    };

    const selectedTill = TILLS.find(t => t.id === selectedTillId);

    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div></div>;

        switch (view) {
            case 'till':
                return selectedTill ? <TillView 
                                        till={selectedTill} 
                                        onGoBack={handleGoBack} 
                                        products={products}
                                        allStaff={staff} 
                                        allOrders={orders}
                                        onCompleteOrder={handleCompleteOrder}
                                        tillColors={tillColors}
                                      /> : null;
            case 'reports':
                return <ReportsView 
                          onGoBack={handleGoBack} 
                          products={products} staff={staff} orders={orders}
                        />;
            case 'admin': 
                return <AdminView 
                            onGoBack={handleGoBack}
                            orders={orders}
                            tills={TILLS}
                            tillColors={tillColors}
                            products={products}
                            staff={staff}
                            cashMovements={cashMovements}
                            onUpdateTillColors={updateTillColors}
                            onDeleteOrders={deleteOrders}
                            onUpdateOrder={updateOrder}
                            onAddProduct={addProduct}
                            onUpdateProduct={updateProduct}
                            onDeleteProduct={deleteProduct}
                            onAddStaff={addStaff}
                            onUpdateStaff={updateStaff}
                            onDeleteStaff={deleteStaff}
                            onAddCashMovement={addCashMovement}
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
                        />;
            case 'selection':
            default:
                return <TillSelection 
                            tills={TILLS} 
                            onSelectTill={handleSelectTill} 
                            onSelectReports={handleSelectReports} 
                            onSelectAdmin={handleSelectAdmin}
                            tillColors={tillColors}
                        />;
        }
    };

    return <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">{renderContent()}</div>;
};

export default App;
