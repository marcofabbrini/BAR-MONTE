
import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebaseConfig';
import { collection, onSnapshot, doc, getDocs, writeBatch, runTransaction, addDoc, updateDoc, deleteDoc, setDoc, orderBy, query } from 'firebase/firestore';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order, TillColors, CashMovement } from './types';

type View = 'selection' | 'till' | 'reports' | 'admin';

const App: React.FC = () => {
    const [view, setView] = useState<View>('selection');
    const [selectedTillId, setSelectedTillId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [cashMovements, setCashMovements] = useState<CashMovement[]>([]);
    const [tillColors, setTillColors] = useState<TillColors>({});

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
            unsubSettings();
        };
    }, []);

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

    const handleSelectTill = useCallback((tillId: string) => {
        setSelectedTillId(tillId);
        setView('till');
    }, []);
    
    const handleSelectReports = useCallback(() => setView('reports'), []);
    const handleSelectAdmin = useCallback(() => setView('admin'), []);
    const handleGoBack = useCallback(() => {
        setSelectedTillId(null);
        setView('selection');
    }, []);

    const handleCompleteOrder = useCallback(async (newOrderData: Omit<Order, 'id'>) => {
        try {
            await runTransaction(db, async (transaction) => {
                const productRefs = newOrderData.items.map(item => doc(db, 'products', item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                productDocs.forEach((docSnap, index) => {
                    const item = newOrderData.items[index];
                    if (!docSnap.exists()) throw new Error(`Prodotto "${item.product.name}" non trovato.`);
                    const currentStock = docSnap.data().stock;
                    if (currentStock < item.quantity) throw new Error(`Stock insufficiente per "${item.product.name}".`);
                });
                
                const orderRef = doc(collection(db, 'orders'));
                const newOrder: Order = { ...newOrderData, id: orderRef.id };
                transaction.set(orderRef, newOrder);

                productDocs.forEach((docSnap, index) => {
                    const item = newOrderData.items[index];
                    const newStock = docSnap.data().stock - item.quantity;
                    transaction.update(docSnap.ref, { stock: newStock });
                });
            });
        } catch (error) {
            console.error("Error completing order:", error);
            throw error; 
        }
    }, []);
    
    // CRUD Operations (Wrapped to return Promise<void>)
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

    const deleteOrders = async (orderIds: string[]) => {
        const batch = writeBatch(db);
        orderIds.forEach(id => {
            const ref = doc(db, 'orders', id);
            batch.delete(ref);
        });
        await batch.commit();
    };

    const updateOrder = async (order: Order) => {
        const { id, ...data } = order;
        await updateDoc(doc(db, 'orders', id), data);
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
                // ReportsView ora ha solo Statistiche e Analisi. Le CRUD sono rimosse da qui.
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
