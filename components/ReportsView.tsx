
import React, { useState, useMemo } from 'react';
import { Product, StaffMember, Order, Shift, GeneralSettings, TombolaConfig, AnalottoConfig, AttendanceRecord } from '../types';
import StatisticsView from './StatisticsView';
import InsightsView from './InsightsView';
import MonthlyClosureView from './MonthlyClosureView';
import { BackArrowIcon, StatsIcon, LightbulbIcon, WalletIcon } from './Icons';
import { useBar } from '../contexts/BarContext';

interface ReportsViewProps {
    onGoBack: () => void;
    products: Product[];
    staff: StaffMember[];
    orders: Order[];
    generalSettings?: GeneralSettings;
    tombolaConfig?: TombolaConfig;
    analottoConfig?: AnalottoConfig;
    attendanceRecords?: AttendanceRecord[];
}

type ReportTab = 'statistics' | 'monthly_closure' | 'insights';

const ReportsView: React.FC<ReportsViewProps> = ({ 
    onGoBack, 
    products, 
    staff, 
    orders,
    generalSettings,
    tombolaConfig,
    analottoConfig,
    attendanceRecords
}) => {
    const { getNow, monthlyClosures } = useBar();
    const [activeTab, setActiveTab] = useState<ReportTab>('statistics');
    
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
            const staffMember = staff.find(s => s.id === order.staffId);

            const dateMatch = orderTimestamp >= start && orderTimestamp <= end;
            const shiftMatch = selectedShift === 'all' || (staffMember && staffMember.shift === selectedShift);
            const staffMatch = selectedStaffId === 'all' || order.staffId === selectedStaffId;
            const productMatch = selectedProductId === 'all' || order.items.some(item => item.product.id === selectedProductId);

            return dateMatch && shiftMatch && staffMatch && productMatch;
        });
    }, [orders, startDate, endDate, selectedShift, selectedStaffId, selectedProductId, staff]);

    // CHECK MONTHLY CLOSURE ALERT
    const showClosureAlert = useMemo(() => {
        const now = getNow();
        const day = now.getDate();
        
        // Alert active only for the first 7 days of the month
        if (day > 7) return false;

        // Calculate target month key (Previous Month)
        const targetDate = new Date(now);
        targetDate.setMonth(targetDate.getMonth() - 1);
        const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;

        // Check if closed
        const closure = monthlyClosures.find(c => c.id === monthKey);
        if (!closure) return true; // Not even created -> Alert
        
        // Check if all shifts paid
        const allPaid = Object.values(closure.payments).every(p => p);
        return !allPaid;
    }, [getNow, monthlyClosures]);


    const TabButton = ({ tab, label, icon, alert }: { tab: ReportTab, label: string, icon: React.ReactNode, alert?: boolean }) => (
        <button 
            onClick={() => setActiveTab(tab)} 
            className={`
                flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap relative
                ${activeTab === tab 
                    ? 'border-primary text-primary bg-orange-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }
            `}
        >
            <div className={`
                p-1.5 rounded-lg 
                ${activeTab === tab ? 'bg-white shadow-sm text-primary' : 'bg-slate-100 text-slate-400'}
            `}>
                {icon}
            </div>
            {label}
            {alert && (
                <span className="absolute top-3 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-white"></span>
            )}
        </button>
    );

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 sticky top-0">
                <button
                    onClick={onGoBack}
                    className="flex items-center gap-2 font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                    <div className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                        <BackArrowIcon className="h-5 w-5" />
                    </div>
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">Report e Statistiche</h1>
                <div className="w-20"></div>
            </header>

            <main className="flex-grow flex flex-col">
                <div className="bg-white border-b border-slate-200 overflow-x-auto shadow-sm">
                   <div className="flex max-w-7xl mx-auto px-4">
                       <TabButton tab="statistics" label="Statistiche" icon={<StatsIcon className="h-5 w-5" />} />
                       <TabButton tab="monthly_closure" label="Chiusura Mensile" icon={<WalletIcon className="h-5 w-5" />} alert={showClosureAlert} />
                       <TabButton tab="insights" label="Analisi Intelligente" icon={<LightbulbIcon className="h-5 w-5" />} />
                   </div>
                </div>
                
                <div className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {activeTab === 'statistics' && (
                        <StatisticsView 
                            filteredOrders={filteredOrders}
                            allProducts={products}
                            allStaff={staff}
                            filters={{ startDate, endDate, selectedShift, selectedStaffId, selectedProductId }}
                            onSetFilters={{ setStartDate, setEndDate, setSelectedShift, setSelectedStaffId, setSelectedProductId }}
                            generalSettings={generalSettings}
                            tombolaConfig={tombolaConfig}
                            analottoConfig={analottoConfig}
                            attendanceRecords={attendanceRecords}
                        />
                    )}
                    {activeTab === 'monthly_closure' && (
                        <MonthlyClosureView />
                    )}
                    {activeTab === 'insights' && (
                        <InsightsView 
                            filteredOrders={filteredOrders}
                            products={products}
                            staff={staff}
                        />
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportsView;
