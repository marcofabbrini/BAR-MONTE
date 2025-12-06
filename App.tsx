
import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebaseConfig';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView'; // Importa la nuova vista
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order, TillColors } from './types';

type View = 'selection' | 'till' | 'reports' | 'admin';

const App: React.FC = () => {
    const [view, setView] = useState<View>('selection');
    const [selectedTillId, setSelectedTillId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [tillColors, setTillColors] = useState<TillColors>({}); // Stato per i colori

    // Load data from Firestore
    useEffect(() => {
        setIsLoading(true);
        
        const unsubProducts = db.collection('products').onSnapshot((snapshot: any) => {
            const productsData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Product));
            setProducts(productsData);
        });

        const unsubStaff = db.collection('staff').onSnapshot((snapshot: any) => {
            const staffData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as StaffMember));
            setStaff(staffData);
        });

        const unsubOrders = db.collection('orders').orderBy('timestamp', 'desc').onSnapshot((snapshot: any) => {
            const ordersData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Order));
            setOrders(ordersData);
            setIsLoading(false); 
        });

        // Load Settings (Colors)
        const unsubSettings = db.collection('settings').doc('tillColors').onSnapshot((doc: any) => {
            if (doc.exists) {
                setTillColors(doc.data());
            }
        });

        return () => {
            unsubProducts();
            unsubStaff();
            unsubOrders();
            unsubSettings();
        };
    }, []);

    // Seed Database
    useEffect(() => {
        const seedDatabase = async () => {
            try {
                const productsSnap = await db.collection('products').get();
                if (productsSnap.empty) {
                    const batch = db.batch();
                    INITIAL_MENU_ITEMS.forEach(item => {
                        const docRef = db.collection('products').doc(item.id);
                        batch.set(docRef, item);
                    });
                    await batch.commit();
                }

                const staffSnap = await db.collection('staff').get();
                if (staffSnap.empty) {
                    const batch = db.batch();
                    INITIAL_STAFF_MEMBERS.forEach(member => {
                         const docRef = db.collection('staff').doc(member.id);
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
    const handleSelectAdmin = useCallback(() => setView('admin'), []); // Nuovo handler
    const handleGoBack = useCallback(() => {
        setSelectedTillId(null);
        setView('selection');
    }, []);

    const handleCompleteOrder = useCallback(async (newOrderData: Omit<Order, 'id'>) => {
        try {
            await db.runTransaction(async (transaction: any) => {
                const productRefs = newOrderData.items.map(item => db.collection('products').doc(item.product.id));
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                productDocs.forEach((doc, index) => {
                    const item = newOrderData.items[index];
                    if (!doc.exists) throw new Error(`Prodotto "${item.product.name}" non trovato.`);
                    const currentStock = doc.data().stock;
                    if (currentStock < item.quantity) throw new Error(`Stock insufficiente per "${item.product.name}".`);
                });
                
                const orderRef = db.collection('orders').doc();
                const newOrder: Order = { ...newOrderData, id: orderRef.id };
                transaction.set(orderRef, newOrder);

                productDocs.forEach((doc, index) => {
                    const item = newOrderData.items[index];
                    const newStock = doc.data().stock - item.quantity;
                    transaction.update(doc.ref, { stock: newStock });
                });
            });
        } catch (error) {
            console.error("Error completing order:", error);
            throw error; 
        }
    }, []);
    
    // CRUD Operations
    // NOTA: Avvolgiamo le chiamate in { } per assicurarci che ritornino Promise<void> e non Promise<DocumentReference>
    const addProduct = async (data: Omit<Product, 'id'>) => { await db.collection('products').add(data); };
    const updateProduct = async (p: Product) => { const { id, ...data } = p; await db.collection('products').doc(id).update(data); };
    const deleteProduct = async (id: string) => { await db.collection('products').doc(id).delete(); };
    
    const addStaff = async (data: Omit<StaffMember, 'id'>) => { await db.collection('staff').add(data); };
    const updateStaff = async (s: StaffMember) => { const { id, ...data } = s; await db.collection('staff').doc(id).update(data); };
    const deleteStaff = async (id: string) => { await db.collection('staff').doc(id).delete(); };

    // Admin Operations
    const updateTillColors = async (colors: TillColors) => {
        await db.collection('settings').doc('tillColors').set(colors, { merge: true });
    };

    const deleteOrders = async (orderIds: string[]) => {
        const batch = db.batch();
        orderIds.forEach(id => {
            const ref = db.collection('orders').doc(id);
            batch.delete(ref);
        });
        await batch.commit();
    };

    const updateOrder = async (order: Order) => {
        const { id, ...data } = order;
        await db.collection('orders').doc(id).update(data);
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
                                        tillColors={tillColors} // Pass colors
                                      /> : null;
            case 'reports':
                return <ReportsView 
                          onGoBack={handleGoBack} 
                          products={products} staff={staff} orders={orders}
                          onAddProduct={addProduct} onUpdateProduct={updateProduct} onDeleteProduct={deleteProduct}
                          onAddStaff={addStaff} onUpdateStaff={updateStaff} onDeleteStaff={deleteStaff}
                        />;
            case 'admin': // Render AdminView
                return <AdminView 
                            onGoBack={handleGoBack}
                            orders={orders}
                            tills={TILLS}
                            tillColors={tillColors}
                            onUpdateTillColors={updateTillColors}
                            onDeleteOrders={deleteOrders}
                            onUpdateOrder={updateOrder}
                        />;
            case 'selection':
            default:
                return <TillSelection 
                            tills={TILLS} 
                            onSelectTill={handleSelectTill} 
                            onSelectReports={handleSelectReports} 
                            onSelectAdmin={handleSelectAdmin} // Pass new handler
                            tillColors={tillColors} // Pass colors
                        />;
        }
    };

    return <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">{renderContent()}</div>;
};

export default App;

