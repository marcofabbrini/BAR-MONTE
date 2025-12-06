
import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebaseConfig';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order } from './types';

type View = 'selection' | 'till' | 'reports';

const App: React.FC = () => {
    const [view, setView] = useState<View>('selection');
    const [selectedTillId, setSelectedTillId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [products, setProducts] = useState<Product[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);

    // Load data from Firestore
    useEffect(() => {
        setIsLoading(true);
        
        // Listen to Products
        const unsubProducts = db.collection('products').onSnapshot((snapshot: any) => {
            const productsData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Product));
            setProducts(productsData);
        }, (error: any) => console.error("Error fetching products:", error));

        // Listen to Staff
        const unsubStaff = db.collection('staff').onSnapshot((snapshot: any) => {
            const staffData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as StaffMember));
            setStaff(staffData);
        }, (error: any) => console.error("Error fetching staff:", error));

        // Listen to Orders
        const unsubOrders = db.collection('orders').orderBy('timestamp', 'desc').onSnapshot((snapshot: any) => {
            const ordersData = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Order));
            setOrders(ordersData);
            setIsLoading(false); 
        }, (error: any) => {
            console.error("Error fetching orders:", error);
            setIsLoading(false);
        });

        return () => {
            unsubProducts();
            unsubStaff();
            unsubOrders();
        };
    }, []);

    // Seed Database if empty
    useEffect(() => {
        const seedDatabase = async () => {
            try {
                const productsSnap = await db.collection('products').get();
                if (productsSnap.empty) {
                    console.log("Seeding products...");
                    const batch = db.batch();
                    INITIAL_MENU_ITEMS.forEach(item => {
                        const docRef = db.collection('products').doc(item.id);
                        batch.set(docRef, item);
                    });
                    await batch.commit();
                }

                const staffSnap = await db.collection('staff').get();
                if (staffSnap.empty) {
                    console.log("Seeding staff...");
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
    
    const handleSelectReports = useCallback(() => {
        setView('reports');
    }, []);

    const handleGoBack = useCallback(() => {
        setSelectedTillId(null);
        setView('selection');
    }, []);

    const handleCompleteOrder = useCallback(async (newOrderData: Omit<Order, 'id'>) => {
        try {
            // Usiamo una transazione per garantire che lo stock sia aggiornato correttamente
            // e che non ci siano conflitti se due casse vendono lo stesso prodotto contemporaneamente.
            await db.runTransaction(async (transaction: any) => {
                // 1. Riferimenti ai documenti dei prodotti
                const productRefs = newOrderData.items.map(item => db.collection('products').doc(item.product.id));
                
                // 2. Leggi lo stato ATTUALE di tutti i prodotti dal database
                const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                // 3. Controlli di validità
                productDocs.forEach((doc, index) => {
                    const item = newOrderData.items[index];
                    
                    if (!doc.exists) {
                        throw new Error(`Il prodotto "${item.product.name}" non esiste più nel database.`);
                    }

                    const currentStock = doc.data().stock;
                    if (currentStock < item.quantity) {
                        throw new Error(`Stock insufficiente per "${item.product.name}". Disponibili: ${currentStock}, Richiesti: ${item.quantity}`);
                    }
                });

                // 4. Se tutto ok, procedi con le scritture
                
                // A. Crea l'ordine
                const orderRef = db.collection('orders').doc();
                const newOrder: Order = {
                    ...newOrderData,
                    id: orderRef.id
                };
                transaction.set(orderRef, newOrder);

                // B. Aggiorna lo stock per ogni prodotto
                productDocs.forEach((doc, index) => {
                    const item = newOrderData.items[index];
                    const currentStock = doc.data().stock;
                    const newStock = currentStock - item.quantity;
                    transaction.update(doc.ref, { stock: newStock });
                });
            });

        } catch (error) {
            console.error("Error completing order:", error);
            // Rilanciamo l'errore per gestirlo nel componente UI (mostrare alert)
            throw error; 
        }
    }, []);
    
    const addProduct = async (productData: Omit<Product, 'id'>) => {
        await db.collection('products').add(productData);
    };

    const updateProduct = async (product: Product) => {
        const { id, ...data } = product;
        await db.collection('products').doc(id).update(data);
    };

    const deleteProduct = async (productId: string) => {
        await db.collection('products').doc(productId).delete();
    };
    
    const addStaff = async (staffData: Omit<StaffMember, 'id'>) => {
        await db.collection('staff').add(staffData);
    };
    
    const updateStaff = async (staffMember: StaffMember) => {
        const { id, ...data } = staffMember;
        await db.collection('staff').doc(id).update(data);
    };
    
    const deleteStaff = async (staffId: string) => {
        await db.collection('staff').doc(staffId).delete();
    };


    const selectedTill = TILLS.find(t => t.id === selectedTillId);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
                </div>
            );
        }

        switch (view) {
            case 'till':
                return selectedTill ? <TillView 
                                        till={selectedTill} 
                                        onGoBack={handleGoBack} 
                                        products={products}
                                        allStaff={staff} 
                                        allOrders={orders}
                                        onCompleteOrder={handleCompleteOrder}
                                      /> : null;
            case 'reports':
                return <ReportsView 
                          onGoBack={handleGoBack} 
                          products={products} 
                          staff={staff} 
                          orders={orders}
                          onAddProduct={addProduct}
                          onUpdateProduct={updateProduct}
                          onDeleteProduct={deleteProduct}
                          onAddStaff={addStaff}
                          onUpdateStaff={updateStaff}
                          onDeleteStaff={deleteStaff}
                        />;
            case 'selection':
            default:
                return <TillSelection tills={TILLS} onSelectTill={handleSelectTill} onSelectReports={handleSelectReports} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
            {renderContent()}
        </div>
    );
};

export default App;