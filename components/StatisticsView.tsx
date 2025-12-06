
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

    const totalSales = useMemo(() => filteredOrders.reduce((sum, order) => sum + order.total, 0), [filteredOrders]);

    const salesByStaff = useMemo(() => {
        const staffSales: { [key: string]: number } = {};
        filteredOrders.forEach(o => { staffSales[o.staffName || 'Sconosciuto'] = (staffSales[o.staffName || 'Sconosciuto'] || 0) + o.total; });
        return Object.entries(staffSales).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredOrders]);

    const salesByProduct = useMemo(() => {
        const prodSales: { [key: string]: { name: string, value: number } } = {};
        filteredOrders.forEach(o => o.items.forEach(i => {
            if (!prodSales[i.product.id]) prodSales[i.product.id] = { name: i.product.name, value: 0 };
            prodSales[i.product.id].value += i.quantity;
        }));
        return Object.values(prodSales).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [filteredOrders]);

    const salesTrend = useMemo(() => {
        const trend: { [key: string]: number } = {};
        filteredOrders.forEach(o => {
            const dateKey = new Date(o.timestamp).toISOString().split('T')[0];
            trend[dateKey] = (trend[dateKey] || 0) + o.total;
        });
        return Object.entries(trend).sort().map(([date, value]) => ({ label: new Date(date).toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'}), value }));
    }, [filteredOrders]);

    const handlePrintPdf = () => window.print();

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Stampa */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <div className="flex items-center justify-center gap-2 mb-2"><LogoIcon className="h-8 w-8 text-slate-800" /><h1 className="text-2xl font-bold">Report Gestionale Bar</h1></div>
                <p className="text-slate-500 text-sm">Periodo: {startDate || 'Inizio'} - {endDate || 'Oggi'}</p>
            </div>

            {/* Filtri */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Filtri di Analisi</h2>
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
                    <div><h2 className="text-3xl font-black">Totale: €{totalSales.toFixed(2)}</h2><p>{filteredOrders.length} transazioni</p></div>
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
                        {filteredOrders.map(o => (
                            <tr key={o.id} className="border-b"><td className="p-3">{new Date(o.timestamp).toLocaleString()}</td><td className="p-3">{o.staffName}</td><td className="p-3">{o.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}</td><td className="p-3 text-right font-bold">€{o.total.toFixed(2)}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default StatisticsView;
