
import React, { useState, useMemo } from 'react';
import { Order, StaffMember, AttendanceRecord } from '../types';
import { PrinterIcon } from './Icons';

interface OrderHistoryProps {
    orders: Order[];
    staff: StaffMember[];
    attendanceRecords?: AttendanceRecord[];
    tillId?: string;
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, staff, attendanceRecords, tillId }) => {
    
    // Helper per ottenere data locale YYYY-MM-DD
    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [startDate, setStartDate] = useState(getLocalDateString()); 
    const [endDate, setEndDate] = useState(getLocalDateString());     
    const [filterStaffId, setFilterStaffId] = useState('all');

    const setDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
        const today = new Date();
        const endStr = getLocalDateString();
        
        let startStr = '';

        if (range === 'today') {
            startStr = endStr;
        } else if (range === 'week') {
            const day = today.getDay() || 7; 
            const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            const monday = new Date(today.setDate(diff));
            startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        } else if (range === 'month') {
            startStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        } else {
            startStr = '';
            setEndDate('');
            setStartDate('');
            return;
        }
        setStartDate(startStr);
        setEndDate(endStr);
    };

    // Filtra gli ordini
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (order.isDeleted) return false;
            
            // Converti timestamp dell'ordine in data locale YYYY-MM-DD per confronto stringa
            const d = new Date(order.timestamp);
            const orderDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            
            const dateMatch = (!startDate || orderDateStr >= startDate) && (!endDate || orderDateStr <= endDate);
            const staffMatch = filterStaffId === 'all' || order.staffId === filterStaffId;
            
            return dateMatch && staffMatch;
        });
    }, [orders, startDate, endDate, filterStaffId]);

    const filteredTotal = useMemo(() => {
        return filteredOrders.reduce((acc, order) => acc + order.total, 0);
    }, [filteredOrders]);

    // Raggruppamento per dettaglio stampa
    const groupedOrders = useMemo(() => {
        const groups: Record<string, { orders: Order[], total: number, waterQuotas: number }> = {};
        
        filteredOrders.forEach(order => {
            const name = order.staffName || 'Sconosciuto';
            if (!groups[name]) {
                groups[name] = { orders: [], total: 0, waterQuotas: 0 };
            }
            groups[name].orders.push(order);
            groups[name].total += order.total;
        });

        // Add Water Quotas if applicable
        if (attendanceRecords && tillId && startDate) {
            staff.forEach(member => {
                if (filterStaffId !== 'all' && member.id !== filterStaffId) return;
                if (member.name.toLowerCase().includes('cassa')) return;

                // Calcola presenze nel range selezionato
                const count = attendanceRecords.filter(r => {
                    const rDate = r.date;
                    // Filtra per till se necessario (o globale se si vuole storico generale)
                    if (r.tillId !== tillId) return false;
                    
                    const inRange = (!startDate || rDate >= startDate) && (!endDate || rDate <= endDate);
                    return inRange && r.presentStaffIds.includes(member.id);
                }).length;

                if (count > 0) {
                    const name = member.name;
                    if (!groups[name]) {
                        groups[name] = { orders: [], total: 0, waterQuotas: 0 };
                    }
                    groups[name].waterQuotas = count;
                }
            });
        }

        return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredOrders, attendanceRecords, startDate, endDate, tillId, staff, filterStaffId]);

    const handlePrint = () => {
        window.print();
    };
    
    return (
        <div className="space-y-4">
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
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-800">Totale: <span className="text-primary">€{filteredTotal.toFixed(2)}</span></span>
                        <button 
                            onClick={handlePrint} 
                            className="bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full shadow-sm transition-colors"
                            title="Stampa Resoconto Versamenti"
                        >
                            <PrinterIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista Ordini (Vista a Schermo) */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {groupedOrders.length === 0 && <div className="text-center text-slate-400 mt-10"><p>Nessun ordine trovato.</p></div>}
                
                {groupedOrders.map(([name, data]) => (
                    <div key={name} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
                            <div>
                                <p className="text-sm font-bold text-slate-700">{name}</p>
                                <p className="text-xs text-slate-500">{data.orders.length} ordini</p>
                            </div>
                            <p className="text-lg font-bold text-primary">€{data.total.toFixed(2)}</p>
                        </div>
                        <ul className="space-y-1 mb-2">
                            {data.orders.map(order => (
                                <li key={order.id} className="flex justify-between text-xs text-slate-600">
                                    <span>{new Date(order.timestamp).toLocaleDateString()} - {order.items.length} art.</span>
                                    <span>€{order.total.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                        {data.waterQuotas > 0 && (
                            <div className="mt-2 pt-2 border-t border-blue-100 flex justify-between items-center bg-blue-50 px-2 py-1 rounded">
                                <span className="text-xs font-bold text-blue-700 flex items-center gap-1">🥛 Quote Acqua</span>
                                <span className="text-xs font-black text-blue-800">{data.waterQuotas}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* VISTA DI STAMPA DETTAGLIATA (Print Only) */}
            <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:h-auto print:min-h-screen print:z-[9999] print:bg-white print:overflow-visible font-sans text-black">
                <div className="max-w-[210mm] mx-auto p-8">
                    <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-widest text-black">Resoconto</h1>
                            <p className="text-sm font-bold text-gray-600 mt-1">Dettaglio Movimenti & Versamenti</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Periodo</p>
                            <p className="font-mono font-bold text-sm">{startDate || 'Inizio'} / {endDate || 'Oggi'}</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {groupedOrders.map(([name, data]) => (
                            <div key={name} className="break-inside-avoid">
                                <div className="flex justify-between items-center bg-gray-100 border-t border-b border-gray-300 py-2 px-2 mb-2">
                                    <h3 className="font-black text-lg uppercase">{name}</h3>
                                    <span className="font-mono font-bold text-lg">€{data.total.toFixed(2)}</span>
                                </div>
                                
                                <table className="w-full text-xs text-left mb-4">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="py-1 w-24">Data/Ora</th>
                                            <th className="py-1">Dettaglio Articoli</th>
                                            <th className="py-1 text-right w-16">Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.orders.map(order => (
                                            <tr key={order.id} className="border-b border-gray-100">
                                                <td className="py-1 align-top text-gray-500">
                                                    {new Date(order.timestamp).toLocaleDateString('it-IT')} <br/>
                                                    {new Date(order.timestamp).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                <td className="py-1 align-top">
                                                    {order.items.map(i => (
                                                        <span key={i.product.id} className="mr-3 inline-block">
                                                            <b>{i.quantity}</b> {i.product.name}
                                                        </span>
                                                    ))}
                                                </td>
                                                <td className="py-1 align-top text-right font-mono font-medium">
                                                    €{order.total.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Water Quota Row in Print */}
                                        {data.waterQuotas > 0 && (
                                            <tr className="border-b border-blue-200 bg-blue-50/30">
                                                <td className="py-2 align-top text-blue-500 font-bold">RIEPILOGO</td>
                                                <td className="py-2 align-top font-bold text-slate-700 flex items-center gap-2">
                                                    <span>🥛 Quote Acqua (Presenze nel periodo)</span>
                                                </td>
                                                <td className="py-2 align-top text-right font-black text-blue-700">
                                                    {data.waterQuotas}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 border-t-4 border-black pt-4 flex justify-between items-center break-inside-avoid">
                        <div className="text-xs text-gray-400">
                            Generato il {new Date().toLocaleString('it-IT')} <br/>
                            Gestione Bar VVF
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold uppercase text-gray-600">Totale Complessivo</p>
                            <p className="text-4xl font-black tracking-tight">€{filteredTotal.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default OrderHistory;
