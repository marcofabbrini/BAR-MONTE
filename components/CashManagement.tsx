
import React, { useState, useMemo } from 'react';
import { Order, CashMovement } from '../types';

interface CashManagementProps {
    orders: Order[];
    movements: CashMovement[];
    onAddMovement: (m: Omit<CashMovement, 'id'>) => Promise<void>;
}

const CashManagement: React.FC<CashManagementProps> = ({ orders, movements, onAddMovement }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    const totalSales = useMemo(() => orders.filter(o => !o.isDeleted).reduce((sum, o) => sum + o.total, 0), [orders]);
    const totalWithdrawals = useMemo(() => movements.reduce((sum, m) => sum + m.amount, 0), [movements]);
    const currentBalance = totalSales - totalWithdrawals;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || !reason.trim()) return;
        await onAddMovement({ amount: val, reason: reason.trim(), timestamp: new Date().toISOString(), type: 'withdrawal' });
        setAmount('');
        setReason('');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><p className="text-sm text-slate-500 uppercase font-bold">Totale Venduto</p><p className="text-3xl font-black text-green-600">€{totalSales.toFixed(2)}</p></div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200"><p className="text-sm text-slate-500 uppercase font-bold">Totale Prelievi</p><p className="text-3xl font-black text-red-500">€{totalWithdrawals.toFixed(2)}</p></div>
                <div className="bg-slate-800 p-6 rounded-xl shadow-lg text-white"><p className="text-sm text-slate-400 uppercase font-bold">Saldo in Cassa</p><p className="text-3xl font-black">€{currentBalance.toFixed(2)}</p></div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-4">Registra Prelievo / Spesa</h3>
                <form onSubmit={handleSubmit} className="flex gap-4">
                    <input type="number" placeholder="Importo (€)" value={amount} onChange={e => setAmount(e.target.value)} className="w-32 bg-slate-50 border rounded-lg p-3" step="0.01" required />
                    <input type="text" placeholder="Causale (es. Versamento Banca)" value={reason} onChange={e => setReason(e.target.value)} className="flex-grow bg-slate-50 border rounded-lg p-3" required />
                    <button type="submit" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg">Registra</button>
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="font-bold text-slate-800 p-4 bg-slate-50 border-b border-slate-200">Storico Movimenti</h3>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Data</th><th className="p-3">Causale</th><th className="p-3 text-right">Importo</th></tr></thead>
                    <tbody>
                        {movements.map(m => (
                            <tr key={m.id} className="border-b border-slate-100">
                                <td className="p-3">{new Date(m.timestamp).toLocaleString()}</td>
                                <td className="p-3">{m.reason}</td>
                                <td className="p-3 text-right font-bold text-red-500">-€{m.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default CashManagement;
