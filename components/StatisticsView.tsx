import React, { useMemo } from 'react';
import { Order, Product, StaffMember, Shift } from '../types';
import BarChart from './BarChart';

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


    const handleExportCsv = () => {
        if (filteredOrders.length === 0) {
            alert("Nessun dato da esportare per i filtri selezionati.");
            return;
        }

        const headers = ['ID Ordine', 'Data', 'Ora', 'Cassa', 'Operatore', 'Turno', 'Totale', 'Prodotti'];
        const rows = filteredOrders.map(order => {
            const date = new Date(order.timestamp);
            const staffMember = allStaff.find(s => s.id === order.staffId);
            const productList = order.items.map(item => `${item.quantity}x ${item.product.name}`).join('; ');
            return [
                order.id.slice(-6),
                date.toLocaleDateString('it-IT'),
                date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                order.tillId,
                order.staffName || 'N/A',
                staffMember?.shift.toUpperCase() || 'N/A',
                `€${order.total.toFixed(2)}`,
                `"${productList}"`
            ].join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `report_vendite.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Filtri di Analisi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
                    {/* Filtri Data */}
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">Data Inizio</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">Data Fine</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary" />
                    </div>
                     {/* Filtri Turno, Personale, Prodotto */}
                    <div>
                         <label htmlFor="shift-filter" className="block text-sm font-medium text-slate-700 mb-1">Turno</label>
                        <select id="shift-filter" value={selectedShift} onChange={e => setSelectedShift(e.target.value as Shift | 'all')} className="w-full bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary">
                            <option value="all">Tutti i turni</option>
                            <option value="a">Turno A</option>
                            <option value="b">Turno B</option>
                            <option value="c">Turno C</option>
                            <option value="d">Turno D</option>
                        </select>
                    </div>
                     <div>
                         <label htmlFor="staff-filter" className="block text-sm font-medium text-slate-700 mb-1">Operatore</label>
                        <select id="staff-filter" value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} className="w-full bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary">
                            <option value="all">Tutti gli operatori</option>
                            {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div>
                         <label htmlFor="product-filter" className="block text-sm font-medium text-slate-700 mb-1">Prodotto</label>
                        <select id="product-filter" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary">
                            <option value="all">Tutti i prodotti</option>
                            {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Grafici */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Vendite per Operatore</h3>
                    {salesByStaff.length > 0 ? <BarChart data={salesByStaff} format="currency" /> : <p className="text-slate-500 text-center py-8">Nessun dato disponibile.</p>}
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Prodotti più Venduti (Quantità)</h3>
                    {salesByProduct.length > 0 ? <BarChart data={salesByProduct} format="integer" /> : <p className="text-slate-500 text-center py-8">Nessun dato disponibile.</p>}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-800">Storico Movimenti</h2>
                        <p className="text-slate-500">{filteredOrders.length} risultati trovati</p>
                     </div>
                     <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="text-right">
                             <p className="text-slate-500">Totale Incassato (filtrato)</p>
                             <p className="text-3xl font-bold text-primary">€{totalSales.toFixed(2)}</p>
                        </div>
                        <button onClick={handleExportCsv} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Esporta CSV
                        </button>
                     </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-600">
                        <thead className="bg-slate-100 text-slate-800">
                            <tr>
                                <th className="p-3">Data</th>
                                <th className="p-3">Cassa</th>
                                <th className="p-3">Operatore</th>
                                <th className="p-3">Prodotti</th>
                                <th className="p-3 text-right">Totale</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <tr key={order.id} className="border-b border-slate-200 hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-900">
                                        {new Date(order.timestamp).toLocaleDateString('it-IT')}
                                        <span className="text-sm text-slate-500 block">{new Date(order.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    <td className="p-3">{order.tillId}</td>
                                    <td className="p-3">{order.staffName}</td>
                                    <td className="p-3 text-sm">
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