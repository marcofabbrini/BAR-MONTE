
import React, { useMemo } from 'react';
import { Order, Product, StaffMember, Shift } from '../types';
import BarChart from './BarChart';
import LineChart from './LineChart';
import { LogoIcon } from './Icons';

interface StatisticsViewProps {
    filteredOrders: Order[];
    allProducts: Product[];
    allStaff: StaffMember[];
    filters: {
        startDate: string;
        endDate: string;
        selectedShift: Shift | 'all';
        selectedStaffId: string;
        selectedProductId: string;
    };
    onSetFilters: {
        setStartDate: (date: string) => void;
        setEndDate: (date: string) => void;
        setSelectedShift: (shift: Shift | 'all') => void;
        setSelectedStaffId: (id: string) => void;
        setSelectedProductId: (id: string) => void;
    };
}

const StatisticsView: React.FC<StatisticsViewProps> = ({ 
    filteredOrders, 
    allProducts,
    allStaff,
    filters,
    onSetFilters
}) => {

    const { startDate, endDate, selectedShift, selectedStaffId, selectedProductId } = filters;
    const { setStartDate, setEndDate, setSelectedShift, setSelectedStaffId, setSelectedProductId } = onSetFilters;

    const totalSales = useMemo(() => {
        return filteredOrders.reduce((sum, order) => sum + order.total, 0);
    }, [filteredOrders]);

    const salesByStaff = useMemo(() => {
        const staffSales: { [key: string]: number } = {};
        filteredOrders.forEach(order => {
            const staffName = order.staffName || 'Sconosciuto';
            staffSales[staffName] = (staffSales[staffName] || 0) + order.total;
        });
        return Object.entries(staffSales)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredOrders]);

    const salesByProduct = useMemo(() => {
        const productSales: { [key: string]: { name: string, value: number } } = {};
        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                const { id, name } = item.product;
                const value = item.quantity;
                if (!productSales[id]) {
                    productSales[id] = { name, value: 0 };
                }
                productSales[id].value += value;
            });
        });
        return Object.values(productSales).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [filteredOrders]);

    // Trend Vendite Giornaliero
    const salesTrend = useMemo(() => {
        const trend: { [key: string]: number } = {};
        filteredOrders.forEach(order => {
            // Usa solo la data YYYY-MM-DD come chiave
            const dateKey = new Date(order.timestamp).toISOString().split('T')[0];
            trend[dateKey] = (trend[dateKey] || 0) + order.total;
        });
        
        // Ordina per data
        return Object.entries(trend)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, value]) => ({ 
                label: new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }), 
                value 
            }));
    }, [filteredOrders]);


    const handlePrintPdf = () => {
        window.print();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header di Stampa (Visibile solo quando si stampa) */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <LogoIcon className="h-8 w-8 text-slate-800" />
                    <h1 className="text-2xl font-bold">Report Gestionale Bar</h1>
                </div>
                <p className="text-slate-500 text-sm">
                    Periodo: {startDate ? new Date(startDate).toLocaleDateString('it-IT') : 'Inizio'} - {endDate ? new Date(endDate).toLocaleDateString('it-IT') : 'Oggi'}
                    {selectedShift !== 'all' && ` • Turno: ${selectedShift.toUpperCase()}`}
                </p>
                <p className="text-slate-500 text-xs mt-1">Generato il {new Date().toLocaleString('it-IT')}</p>
            </div>

            {/* Filtri di Analisi (Nascosti in stampa) */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Filtri di Analisi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                    {/* Filtri Data */}
                    <div>
                        <label htmlFor="start-date" className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Inizio</label>
                        <input 
                            type="date" 
                            id="start-date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Fine</label>
                        <input 
                            type="date" 
                            id="end-date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                        />
                    </div>
                     {/* Filtri Turno, Personale, Prodotto */}
                    <div>
                         <label htmlFor="shift-filter" className="block text-xs font-bold text-slate-500 uppercase mb-1">Turno</label>
                        <select id="shift-filter" value={selectedShift} onChange={e => setSelectedShift(e.target.value as Shift | 'all')} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                            <option value="all">Tutti i turni</option>
                            <option value="a">Turno A</option>
                            <option value="b">Turno B</option>
                            <option value="c">Turno C</option>
                            <option value="d">Turno D</option>
                        </select>
                    </div>
                     <div>
                         <label htmlFor="staff-filter" className="block text-xs font-bold text-slate-500 uppercase mb-1">Utente</label>
                        <select id="staff-filter" value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                            <option value="all">Tutti gli utenti</option>
                            {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div>
                         <label htmlFor="product-filter" className="block text-xs font-bold text-slate-500 uppercase mb-1">Prodotto</label>
                        <select id="product-filter" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
                            <option value="all">Tutti i prodotti</option>
                            {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Sezione Totali */}
            <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-xl shadow-lg text-white print:bg-none print:bg-white print:text-black print:border print:border-black print:shadow-none">
                 <div className="flex flex-col md:flex-row justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-black">Totale Incassato</h2>
                        <p className="opacity-90">{filteredOrders.length} transazioni nel periodo selezionato</p>
                    </div>
                    <div className="text-5xl font-black mt-4 md:mt-0">
                        €{totalSales.toFixed(2)}
                    </div>
                 </div>
            </div>

            {/* Grafico Trend Vendite */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none">
                 <h3 className="text-xl font-bold text-slate-800 mb-6">Andamento Vendite</h3>
                 <div className="h-64 w-full">
                     <LineChart data={salesTrend} height={250} />
                 </div>
            </div>

            {/* Grafici a Barre */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2">
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none break-inside-avoid">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Vendite per Utente</h3>
                    {salesByStaff.length > 0 ? <BarChart data={salesByStaff} format="currency" /> : <p className="text-slate-500 text-center py-8">Nessun dato disponibile.</p>}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 print:shadow-none print:border-none break-inside-avoid">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Prodotti più Venduti (Quantità)</h3>
                    {salesByProduct.length > 0 ? <BarChart data={salesByProduct} format="integer" /> : <p className="text-slate-500 text-center py-8">Nessun dato disponibile.</p>}
                </div>
            </div>

            {/* Tabella Dettagliata */}
            <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200 print:shadow-none print:border-none">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4 print:hidden">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-800">Dettaglio Ordini</h2>
                     </div>
                     <div className="flex flex-col md:flex-row items-center gap-4">
                        <button onClick={handlePrintPdf} className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded transition-colors flex items-center justify-center gap-2 shadow-md">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                            </svg>
                            Stampa Report PDF
                        </button>
                     </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-600 text-sm">
                        <thead className="bg-slate-100 text-slate-800 print:bg-slate-200">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Cassa</th>
                                <th className="p-3">Utente</th>
                                <th className="p-3">Prodotti</th>
                                <th className="p-3 text-right">Totale</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50 print:hover:bg-transparent">
                                    <td className="p-3 font-medium text-slate-900">
                                        {new Date(order.timestamp).toLocaleDateString('it-IT')}
                                        <span className="text-xs text-slate-500 block">{new Date(order.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    <td className="p-3">{order.tillId}</td>
                                    <td className="p-3">{order.staffName}</td>
                                    <td className="p-3">
                                        {order.items.map(item => (
                                            <div key={item.product.id}>{item.quantity} x {item.product.name}</div>
                                        ))}
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-800">€{order.total.toFixed(2)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-slate-400">Nessun ordine trovato per i filtri selezionati.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StatisticsView;
