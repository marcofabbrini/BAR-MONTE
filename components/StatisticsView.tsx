
import React, { useMemo } from 'react';
import { Order, Product, StaffMember, Shift } from '../types';
import BarChart from './BarChart';
import LineChart from './LineChart';
import { LogoIcon } from './Icons';

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

    // Filtra via gli ordini cancellati per le statistiche
    const activeOrders = useMemo(() => filteredOrders.filter(o => !o.isDeleted), [filteredOrders]);

    const totalSales = useMemo(() => activeOrders.reduce((sum, order) => sum + order.total, 0), [activeOrders]);

    const salesByStaff = useMemo(() => {
        const staffSales: { [key: string]: number } = {};
        activeOrders.forEach(o => { staffSales[o.staffName || 'Sconosciuto'] = (staffSales[o.staffName || 'Sconosciuto'] || 0) + o.total; });
        return Object.entries(staffSales).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [activeOrders]);

    const salesByProduct = useMemo(() => {
        const prodSales: { [key: string]: { name: string, value: number } } = {};
        activeOrders.forEach(o => o.items.forEach(i => {
            if (!prodSales[i.product.id]) prodSales[i.product.id] = { name: i.product.name, value: 0 };
            prodSales[i.product.id].value += i.quantity;
        }));
        return Object.values(prodSales).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [activeOrders]);

    const salesTrend = useMemo(() => {
        const trend: { [key: string]: number } = {};
        activeOrders.forEach(o => {
            const dateKey = new Date(o.timestamp).toISOString().split('T')[0];
            trend[dateKey] = (trend[dateKey] || 0) + o.total;
        });
        return Object.entries(trend).sort().map(([date, value]) => ({ label: new Date(date).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value }));
    }, [activeOrders]);

    const handlePrintPdf = () => window.print();

    // Pulsanti rapidi per le date
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
            {/* Header Stampa */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <div className="flex items-center justify-center gap-2 mb-2"><LogoIcon className="h-8 w-8 text-slate-800" /><h1 className="text-2xl font-bold">Report Gestionale Bar</h1></div>
                <p className="text-slate-500 text-sm">Periodo: {startDate || 'Inizio'} - {endDate || 'Oggi'}</p>
            </div>

            {/* Filtri */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:hidden">
                <div className="flex justify-between items-center mb-4">
                     <h2 className="text-2xl font-bold text-slate-800">Filtri di Analisi</h2>
                     <div className="flex gap-2">
                        <button onClick={() => setDateRange('today')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold">Oggi</button>
                        <button onClick={() => setDateRange('week')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold">Settimana</button>
                        <button onClick={() => setDateRange('month')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold">Mese</button>
                        <button onClick={() => setDateRange('all')} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold">Tutto</button>
                     </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Da</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">A</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border p-2 rounded-lg" /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Turno</label><select value={selectedShift} onChange={e => setSelectedShift(e.target.value as any)} className="w-full border p-2 rounded-lg"><option value="all">Tutti</option><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Utente</label><select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="w-full border p-2 rounded-lg"><option value="all">Tutti</option>{allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Prodotto</label><select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full border p-2 rounded-lg"><option value="all">Tutti</option>{allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                </div>
            </div>

            {/* Totali */}
            <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-xl shadow-lg text-white print:bg-white print:text-black print:border">
                 <div className="flex justify-between items-center">
                    <div><h2 className="text-3xl font-black">Totale: €{totalSales.toFixed(2)}</h2><p>{activeOrders.length} transazioni valide</p></div>
                 </div>
            </div>

            {/* Grafici */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none">
                 <h3 className="text-xl font-bold text-slate-800 mb-6">Trend Vendite</h3>
                 <div className="h-64 w-full"><LineChart data={salesTrend} height={250} /></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none"><h3 className="text-xl font-bold mb-4">Vendite per Utente</h3><BarChart data={salesByStaff} format="currency" /></div>
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none"><h3 className="text-xl font-bold mb-4">Prodotti Top</h3><BarChart data={salesByProduct} format="integer" /></div>
            </div>

            {/* Tabella */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200 print:shadow-none print:border-none">
                <div className="flex justify-between items-center mb-4 print:hidden">
                     <h2 className="text-2xl font-bold text-slate-800">Dettaglio Ordini</h2>
                     <button onClick={handlePrintPdf} className="bg-slate-800 text-white font-bold py-2 px-6 rounded shadow-md">Stampa PDF</button>
                </div>
                <table className="w-full text-left text-slate-600 text-sm">
                    <thead className="bg-slate-100 text-slate-800"><tr><th className="p-3">Data</th><th className="p-3">Utente</th><th className="p-3">Prodotti</th><th className="p-3 text-right">Totale</th></tr></thead>
                    <tbody>
                        {activeOrders.map(o => (
                            <tr key={o.id} className="border-b"><td className="p-3">{new Date(o.timestamp).toLocaleString()}</td><td className="p-3">{o.staffName}</td><td className="p-3">{o.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}</td><td className="p-3 text-right font-bold">€{o.total.toFixed(2)}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default StatisticsView;
