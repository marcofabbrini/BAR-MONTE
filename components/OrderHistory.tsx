
import React, { useState, useMemo } from 'react';
import { Order, StaffMember } from '../types';

interface OrderHistoryProps {
    orders: Order[];
    staff: StaffMember[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, staff }) => {
    // Stati per i filtri
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStaffId, setFilterStaffId] = useState('all');

    // Filtra gli ordini
    const filteredOrders = useMemo(() => {
        const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : 0;
        const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Date.now() + 86400000; // Default futuro per includere tutto se vuoto

        return orders.filter(order => {
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
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase tracking-wide">Filtra Storico</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                        <label className="text-xs text-slate-500 font-semibold block mb-1">Da:</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-semibold block mb-1">A:</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-semibold block mb-1">Utente:</label>
                        <select 
                            value={filterStaffId} 
                            onChange={(e) => setFilterStaffId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                            <option value="all">Tutti gli utenti</option>
                            {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {/* Totale del periodo selezionato */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-500">
                        {filteredOrders.length} movimenti trovati
                    </span>
                    <span className="text-lg font-bold text-slate-800">
                        Totale: <span className="text-primary">€{filteredTotal.toFixed(2)}</span>
                    </span>
                </div>
            </div>

            {/* Lista Ordini */}
            {filteredOrders.length === 0 ? (
                <div className="text-center text-slate-400 mt-10">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2 text-lg">Nessun ordine trovato per i filtri selezionati.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="bg-white rounded-lg p-4 shadow-md border border-slate-200">
                            <div className="flex justify-between items-start border-b border-slate-200 pb-2 mb-3">
                                <div>
                                    <p className="text-sm text-slate-500">Ordine #{order.id.slice(-6)}</p>
                                    <p className="text-sm text-slate-500">
                                        {new Date(order.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(order.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {order.staffName && <p className="text-sm text-slate-500">Utente: <span className="font-medium">{order.staffName}</span></p>}
                                </div>
                                <p className="text-xl font-bold text-primary">€{order.total.toFixed(2)}</p>
                            </div>
                            <ul className="space-y-1">
                                {order.items.map(item => (
                                    <li key={item.product.id} className="flex justify-between text-slate-700">
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