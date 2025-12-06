
import React, { useState, useMemo } from 'react';
import { Order, StaffMember } from '../types';

interface OrderHistoryProps {
    orders: Order[];
    staff: StaffMember[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, staff }) => {
    // Stati per i filtri
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default Oggi
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);     // Default Oggi
    const [filterStaffId, setFilterStaffId] = useState('all');

    const setDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
        const today = new Date();
        const end = today.toISOString().split('T')[0];
        let start = '';

        if (range === 'today') {
            start = end;
        } else if (range === 'week') {
            const day = today.getDay() || 7; // Lunedì=1, Domenica=7
            if (day !== 1) today.setHours(-24 * (day - 1));
            start = today.toISOString().split('T')[0];
        } else if (range === 'month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        } else {
            start = '';
            setEndDate('');
        }
        setStartDate(start);
        if (range !== 'all') setEndDate(end);
    };

    // Filtra gli ordini
    const filteredOrders = useMemo(() => {
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Date.now() + 86400000;

        return orders.filter(order => {
            // Nascondi ordini cancellati nella vista cassa
            if (order.isDeleted) return false;

            const orderTimestamp = new Date(order.timestamp).getTime();
            const dateMatch = orderTimestamp >= start && orderTimestamp <= end;
            const staffMatch = filterStaffId === 'all' || order.staffId === filterStaffId;
            return dateMatch && staffMatch;
        });
    }, [orders, startDate, endDate, filterStaffId]);

    // Calcola il totale degli ordini filtrati
    const filteredTotal = useMemo(() => {
        return filteredOrders.reduce((acc, order) => acc + order.total, 0);
    }, [filteredOrders]);
    
    return (
        <div className="space-y-4">
            {/* Sezione Filtri */}
            <div className="space-y-4 mb-6">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button onClick={() => setDateRange('today')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold whitespace-nowrap">Oggi</button>
                    <button onClick={() => setDateRange('week')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold whitespace-nowrap">Questa Settimana</button>
                    <button onClick={() => setDateRange('month')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold whitespace-nowrap">Questo Mese</button>
                    <button onClick={() => setDateRange('all')} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold whitespace-nowrap">Totale</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs text-slate-500 font-semibold block mb-1">Da:</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-semibold block mb-1">A:</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-semibold block mb-1">Utente:</label>
                        <select value={filterStaffId} onChange={(e) => setFilterStaffId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none">
                            <option value="all">Tutti</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">{filteredOrders.length} movimenti</span>
                    <span className="text-lg font-bold text-slate-800">Totale: <span className="text-primary">€{filteredTotal.toFixed(2)}</span></span>
                </div>
            </div>

            {/* Lista Ordini */}
            {filteredOrders.length === 0 ? (
                <div className="text-center text-slate-400 mt-10"><p>Nessun ordine trovato.</p></div>
            ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                                <div>
                                    <p className="text-xs text-slate-500">{new Date(order.timestamp).toLocaleString()}</p>
                                    <p className="text-sm font-bold text-slate-700">{order.staffName}</p>
                                </div>
                                <p className="text-lg font-bold text-primary">€{order.total.toFixed(2)}</p>
                            </div>
                            <ul className="space-y-1">
                                {order.items.map(item => (
                                    <li key={item.product.id} className="flex justify-between text-xs text-slate-600">
                                        <span>{item.quantity} x {item.product.name}</span>
                                        <span>€{(item.product.price * item.quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
export default OrderHistory;
