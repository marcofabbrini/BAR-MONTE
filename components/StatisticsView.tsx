
import React, { useMemo } from 'react';
import { Order, Product, StaffMember, Shift } from '../types';
import BarChart from './BarChart';
import LineChart from './LineChart';
import { LogoIcon, DropletIcon, LayersIcon, ChartBarIcon } from './Icons';

interface StatisticsViewProps {
    filteredOrders: Order[];
    allProducts: Product[];
    allStaff: StaffMember[];
    filters: { startDate: string; endDate: string; selectedShift: Shift | 'all'; selectedStaffId: string; selectedProductId: string; };
    onSetFilters: { setStartDate: (d: string) => void; setEndDate: (d: string) => void; setSelectedShift: (s: Shift | 'all') => void; setSelectedStaffId: (id: string) => void; setSelectedProductId: (id: string) => void; };
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ filteredOrders, allProducts, allStaff, filters, onSetFilters }) => {
    const { startDate, endDate, selectedShift, selectedStaffId, selectedProductId } = filters;
    const { setStartDate, setEndDate, setSelectedShift, setSelectedStaffId, setSelectedProductId } = onSetFilters;

    const activeOrders = useMemo(() => filteredOrders.filter(o => !o.isDeleted), [filteredOrders]);
    const totalSales = useMemo(() => activeOrders.reduce((sum, order) => sum + order.total, 0), [activeOrders]);

    // Vendite per Staff
    const salesByStaff = useMemo(() => {
        const staffSales: { [key: string]: number } = {};
        activeOrders.forEach(o => { staffSales[o.staffName || 'Sconosciuto'] = (staffSales[o.staffName || 'Sconosciuto'] || 0) + o.total; });
        
        return Object.entries(staffSales)
            .map(([name, value]) => {
                const member = allStaff.find(s => s.name === name);
                return { name, value, icon: member?.icon || '👤' };
            })
            .sort((a, b) => b.value - a.value);
    }, [activeOrders, allStaff]);

    // Top Prodotti (Quantità)
    const salesByProduct = useMemo(() => {
        const prodSales: { [key: string]: { name: string, value: number, icon: string } } = {};
        activeOrders.forEach(o => o.items.forEach(i => {
            if (!prodSales[i.product.id]) {
                const prod = allProducts.find(p => p.id === i.product.id);
                prodSales[i.product.id] = { name: i.product.name, value: 0, icon: prod?.icon || '📦' };
            }
            prodSales[i.product.id].value += i.quantity;
        }));
        return Object.values(prodSales).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [activeOrders, allProducts]);

    // Volumi Categorie (Quantità)
    const categoryVolumes = useMemo(() => {
        const catVols: { [key: string]: number } = {};
        activeOrders.forEach(o => o.items.forEach(i => {
            const cat = i.product.category || 'Altro';
            catVols[cat] = (catVols[cat] || 0) + i.quantity;
        }));
        return Object.entries(catVols).map(([name, value]) => ({ name, value, icon: '' })).sort((a,b) => b.value - a.value);
    }, [activeOrders]);

    // === TRENDS ===
    
    // Helper per trend giornalieri
    const getDailyTrend = (valueExtractor: (o: Order) => number, filter?: (o: Order) => boolean) => {
        const trend: { [key: string]: number } = {};
        const sortedOrders = [...activeOrders].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        sortedOrders.forEach(o => {
            if(filter && !filter(o)) return;
            const dateKey = new Date(o.timestamp).toISOString().split('T')[0];
            trend[dateKey] = (trend[dateKey] || 0) + valueExtractor(o);
        });
        
        return Object.entries(trend).map(([date, value]) => ({ 
            label: new Date(date).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), 
            value 
        }));
    };

    // 1. Trend Incassi (€)
    const salesTrend = useMemo(() => getDailyTrend(o => o.total), [activeOrders]);

    // 2. Trend Quantità Totali (Pezzi)
    const quantityTrend = useMemo(() => getDailyTrend(o => o.items.reduce((acc, i) => acc + i.quantity, 0)), [activeOrders]);

    // 3. Trend Consumo Acqua (Pezzi)
    const waterTrend = useMemo(() => {
        const waterIds = new Set(allProducts.filter(p => p.name.toLowerCase().includes('acqua')).map(p => p.id));
        return getDailyTrend(
            o => o.items.filter(i => waterIds.has(i.product.id)).reduce((acc, i) => acc + i.quantity, 0)
        );
    }, [activeOrders, allProducts]);

    const handlePrintPdf = () => window.print();

    const setDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
        const today = new Date();
        const end = today.toISOString().split('T')[0];
        let start = '';
        if (range === 'today') start = end;
        else if (range === 'week') { const day = today.getDay() || 7; if(day!==1) today.setHours(-24*(day-1)); start = today.toISOString().split('T')[0]; }
        else if (range === 'month') start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        else { start = ''; setEndDate(''); }
        setStartDate(start);
        if(range !== 'all') setEndDate(end);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <div className="flex items-center justify-center gap-2 mb-2"><LogoIcon className="h-8 w-8 text-slate-800" /><h1 className="text-2xl font-bold">Report Gestionale Bar</h1></div>
                <p className="text-slate-500 text-sm">Periodo: {startDate || 'Inizio'} - {endDate || 'Oggi'}</p>
            </div>

            {/* FILTRI */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:hidden">
                <div className="mb-4">
                     <h2 className="text-2xl font-bold text-slate-800">Filtri di Analisi</h2>
                </div>
                
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button onClick={() => setDateRange('today')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap">Oggi</button>
                    <button onClick={() => setDateRange('week')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap">Settimana</button>
                    <button onClick={() => setDateRange('month')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap">Mese</button>
                    <button onClick={() => setDateRange('all')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap">Tutto</button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase">Da</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-2 rounded-lg text-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase">A</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-2 rounded-lg text-sm" /></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase">Turno</label><select value={selectedShift} onChange={e => setSelectedShift(e.target.value as any)} className="w-full border p-2 rounded-lg text-sm"><option value="all">Tutti</option><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase">Utente</label><select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="w-full border p-2 rounded-lg text-sm"><option value="all">Tutti</option>{allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-slate-500 uppercase">Prodotto</label><select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full border p-2 rounded-lg text-sm"><option value="all">Tutti</option>{allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-l-4 border-orange-500 p-6 rounded-xl shadow-sm">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Incasso Totale</h2>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">€{totalSales.toFixed(2)}</h2>
                </div>
                <div className="bg-white border-l-4 border-green-500 p-6 rounded-xl shadow-sm">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Volumi Totali</h2>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">
                        {quantityTrend.reduce((acc, d) => acc + d.value, 0)} <span className="text-sm text-slate-400 font-medium">pezzi</span>
                    </h2>
                </div>
                <div className="bg-white border-l-4 border-blue-400 p-6 rounded-xl shadow-sm">
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Transazioni</h2>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight">{activeOrders.length}</h2>
                </div>
            </div>

            {/* GRAFICI TREND */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* 1. Incasso */}
                 <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                     <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <ChartBarIcon className="h-5 w-5 text-orange-500"/> Andamento Incassi (€)
                     </h3>
                     <div className="h-[250px] w-full"><LineChart data={salesTrend} height={250} color="text-orange-500" /></div>
                </div>

                {/* 2. Quantità Totali */}
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                     <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <LayersIcon className="h-5 w-5 text-green-500"/> Andamento Quantità (Pezzi)
                     </h3>
                     <div className="h-[250px] w-full"><LineChart data={quantityTrend} height={250} color="text-green-500" /></div>
                </div>

                {/* 3. Consumo Acqua */}
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                     <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <DropletIcon className="h-5 w-5 text-blue-400"/> Consumo Acqua (Pezzi)
                     </h3>
                     <div className="h-[250px] w-full"><LineChart data={waterTrend} height={250} color="text-blue-400" /></div>
                </div>

                {/* 4. Distribuzione Categorie */}
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 text-slate-700 flex items-center gap-2">
                        <LayersIcon className="h-5 w-5 text-purple-500"/> Volumi per Categoria
                    </h3>
                    <BarChart data={categoryVolumes.slice(0, 8)} format="integer" barColor="bg-purple-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 text-slate-700">Performance Staff (€)</h3>
                    <BarChart data={salesByStaff} format="currency" barColor="bg-blue-600" />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 text-slate-700">Top 10 Prodotti (Quantità)</h3>
                    <BarChart data={salesByProduct} format="integer" barColor="bg-orange-500" />
                </div>
            </div>

             <div className="text-center py-4 print:hidden">
                <button onClick={handlePrintPdf} className="bg-slate-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors shadow-lg">
                    Stampa Report Completo (PDF)
                </button>
            </div>
        </div>
    );
};
export default StatisticsView;
