import React, { useState, useMemo } from 'react';
import { Product, StaffMember, Order, Shift } from '../types';
import ProductManagement from './ProductManagement';
import StaffManagement from './StaffManagement';
import StatisticsView from './StatisticsView';
import InsightsView from './InsightsView';
import { BackArrowIcon, InventoryIcon, StaffIcon, StatsIcon, LightbulbIcon } from './Icons';

interface ReportsViewProps {
    onGoBack: () => void;
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    staff: StaffMember[];
    onUpdateStaff: (staff: StaffMember[]) => void;
    orders: Order[];
    allProducts: Product[];
    allStaff: StaffMember[];
}

type ReportTab = 'inventory' | 'staff' | 'statistics' | 'insights';

const ReportsView: React.FC<ReportsViewProps> = ({ 
    onGoBack, 
    products, 
    onUpdateProducts, 
    staff, 
    onUpdateStaff, 
    orders,
    allProducts,
    allStaff
}) => {
    const [activeTab, setActiveTab] = useState<ReportTab>('statistics');
    
    // Filtri
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedShift, setSelectedShift] = useState<Shift | 'all'>('all');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
    const [selectedProductId, setSelectedProductId] = useState<string>('all');
    
    const filteredOrders = useMemo(() => {
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Date.now();

        return orders.filter(order => {
            const orderTimestamp = new Date(order.timestamp).getTime();
            const staffMember = allStaff.find(s => s.id === order.staffId);

            const dateMatch = orderTimestamp >= start && orderTimestamp <= end;
            const shiftMatch = selectedShift === 'all' || (staffMember && staffMember.shift === selectedShift);
            const staffMatch = selectedStaffId === 'all' || order.staffId === selectedStaffId;
            const productMatch = selectedProductId === 'all' || order.items.some(item => item.product.id === selectedProductId);

            return dateMatch && shiftMatch && staffMatch && productMatch;
        });
    }, [orders, startDate, endDate, selectedShift, selectedStaffId, selectedProductId, allStaff]);


    const TabButton = ({ tab, label, icon }: { tab: ReportTab, label: string, icon: React.ReactNode }) => (
        <button 
            onClick={() => setActiveTab(tab)} 
            className={`flex items-center gap-2 px-4 py-3 text-base font-medium transition-colors duration-200 ${activeTab === tab ? 'border-b-2 border-secondary text-secondary' : 'text-slate-500 hover:text-slate-800'}`}
        >
            {icon}
            {label}
        </button>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'inventory':
                return <ProductManagement products={products} onUpdateProducts={onUpdateProducts} />;
            case 'staff':
                return <StaffManagement staff={staff} onUpdateStaff={onUpdateStaff} />;
            case 'statistics':
                return <StatisticsView 
                            filteredOrders={filteredOrders}
                            allProducts={allProducts}
                            allStaff={allStaff}
                            filters={{ startDate, endDate, selectedShift, selectedStaffId, selectedProductId }}
                            onSetFilters={{ setStartDate, setEndDate, setSelectedShift, setSelectedStaffId, setSelectedProductId }}
                        />;
            case 'insights':
                return <InsightsView 
                            filteredOrders={filteredOrders}
                            products={allProducts}
                            staff={allStaff}
                        />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-white shadow-md p-4 flex justify-between items-center z-10 border-b border-slate-200 sticky top-0">
                <button
                    onClick={onGoBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 hover:text-primary transition-colors duration-200"
                    aria-label="Torna alla selezione"
                >
                    <BackArrowIcon className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">Report e Gestione</h1>
                <div className="w-10"></div>
            </header>
            <main className="flex-grow flex flex-col">
                <div className="flex items-center border-b border-slate-200 bg-white overflow-x-auto">
                   <TabButton tab="statistics" label="Statistiche" icon={<StatsIcon className="h-5 w-5" />} />
                   <TabButton tab="insights" label="Analisi Intelligente" icon={<LightbulbIcon className="h-5 w-5" />} />
                   <TabButton tab="inventory" label="Gestione Prodotti" icon={<InventoryIcon className="h-5 w-5" />} />
                   <TabButton tab="staff" label="Gestione Personale" icon={<StaffIcon className="h-5 w-5" />} />
                </div>
                <div className="flex-grow p-4 md:p-6">
                    {renderTabContent()}
                </div>
            </main>
        </div>
    );
};

export default ReportsView;