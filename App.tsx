import React, { useState, useCallback } from 'react';
import TillSelection from './components/TillSelection';
import TillView from './components/TillView';
import ReportsView from './components/ReportsView';
import { TILLS, INITIAL_MENU_ITEMS, INITIAL_STAFF_MEMBERS } from './constants';
import { Till, Product, StaffMember, Order } from './types';
import useLocalStorage from './hooks/useLocalStorage';

type View = 'selection' | 'till' | 'reports';

const App: React.FC = () => {
    const [view, setView] = useState<View>('selection');
    const [selectedTillId, setSelectedTillId] = useState<string | null>(null);
    
    const [products, setProducts] = useLocalStorage<Product[]>('bar_products', INITIAL_MENU_ITEMS);
    const [staff, setStaff] = useLocalStorage<StaffMember[]>('bar_staff', INITIAL_STAFF_MEMBERS);
    const [orders, setOrders] = useLocalStorage<Order[]>('bar_orders', []);


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

    const handleCompleteOrder = useCallback((newOrder: Order) => {
        setOrders(prevOrders => [newOrder, ...prevOrders]);
    }, [setOrders]);

    const selectedTill = TILLS.find(t => t.id === selectedTillId);

    const renderContent = () => {
        switch (view) {
            case 'till':
                return selectedTill ? <TillView 
                                        till={selectedTill} 
                                        onGoBack={handleGoBack} 
                                        products={products} 
                                        onUpdateProducts={setProducts} 
                                        allStaff={staff} 
                                        allOrders={orders}
                                        onCompleteOrder={handleCompleteOrder}
                                      /> : null;
            case 'reports':
                return <ReportsView 
                          onGoBack={handleGoBack} 
                          products={products} 
                          onUpdateProducts={setProducts} 
                          staff={staff} 
                          onUpdateStaff={setStaff}
                          orders={orders}
                          allProducts={products}
                          allStaff={staff}
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