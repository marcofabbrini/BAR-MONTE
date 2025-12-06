
import React, { useState, useMemo } from 'react';
import { Order, CashMovement } from '../types';

interface CashManagementProps {
    orders: Order[];
    movements: CashMovement[];
    onAddMovement: (m: Omit<CashMovement, 'id'>) => Promise<void>;
    onResetCash: () => Promise<void>;
    isSuperAdmin: boolean;
}

const CashManagement: React.FC<CashManagementProps> = ({ orders, movements, onAddMovement, onResetCash, isSuperAdmin }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [miscAmount, setMiscAmount] = useState('');
    const [miscReason, setMiscReason] = useState('');

    const totalSales = useMemo(() => orders.filter(o => !o.isDeleted).reduce((sum, o) => sum + o.total, 0), [orders]);
    const totalWithdrawals = useMemo(() => movements.reduce((sum, m) => sum + m.amount, 0), [movements]);
    const currentBalance = totalSales - totalWithdrawals;

    const handleSubmitWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || !reason.trim()) return;
        await onAddMovement({ amount: val, reason: reason.trim(), timestamp: new Date().toISOString(), type: 'withdrawal' });
        setAmount('');
        setReason('');
    };

    const handleSubmitMisc = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(miscAmount);
        if (!val || !miscReason.trim()) return;
        await onAddMovement({ amount: val, reason: `SPESA VARIA: ${miscReason.trim()}`, timestamp: new Date().toISOString(), type: 'withdrawal' });
        setMiscAmount('');
        setMiscReason('');
    };

    const handleReset = async () => {
        if(window.confirm("SEI SICURO? Questo azzererà il conteggio della cassa.")) {
            await onResetCash();
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Totali */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-xs text-slate-500 uppercase font-bold">Totale Venduto</p><p className="text-2xl font-black text-green-600">€{totalSales.toFixed(2)}</p></div>
                <div className="bg-white p-4 rounded-xl border border-slate-200"><p className="text-xs text-slate-500 uppercase font-bold">Totale Uscite</p><p className="text-2xl font-black text-red-500">€{totalWithdrawals.toFixed(2)}</p></div>
                <div className="bg-slate-800 p-4 rounded-xl text-white relative overflow-hidden">
                    <p className="text-xs text-slate-400 uppercase font-bold">Saldo in Cassa</p>
                    <p className="text-3xl font-black">€{currentBalance.toFixed(2)}</p>
                    {isSuperAdmin && (
                        <button onClick={handleReset} className="absolute top-4 right-4 text-[10px] bg-red-600 px-2 py-1 rounded hover:bg-red-500">RESET</button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prelievo Banca/Cassa */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Prelievo / Versamento</h3>
                    <form onSubmit={handleSubmitWithdrawal} className="flex flex-col gap-3">
                        <input type="number" placeholder="Importo (€)" value={amount} onChange={e => setAmount(e.target.value)} className="bg-slate-50 border rounded-lg p-3" step="0.01" required />
                        <input type="text" placeholder="Causale (es. Versamento Banca)" value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-50 border rounded-lg p-3" required />
                        <button type="submit" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg">Registra Prelievo</button>
                    </form>
                </div>

                {/* Acquisti Vari */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Acquisti Vari (Uscita Cassa)</h3>
                    <form onSubmit={handleSubmitMisc} className="flex flex-col gap-3">
                        <input type="number" placeholder="Costo (€)" value={miscAmount} onChange={e => setMiscAmount(e.target.value)} className="bg-slate-50 border rounded-lg p-3" step="0.01" required />
                        <input type="text" placeholder="Descrizione (es. Cancelleria, Ghiaccio)" value={miscReason} onChange={e => setMiscReason(e.target.value)} className="bg-slate-50 border rounded-lg p-3" required />
                        <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg">Registra Spesa</button>
                    </form>
                </div>
            </div>

            {/* Storico */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="font-bold text-slate-800 p-4 bg-slate-50 border-b border-slate-200">Storico Movimenti Cassa</h3>
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0"><tr><th className="p-3">Data</th><th className="p-3">Causale</th><th className="p-3 text-right">Importo</th></tr></thead>
                        <tbody>
                            {movements.map(m => (
                                <tr key={m.id} className="border-b border-slate-100 last:border-0">
                                    <td className="p-3 text-xs">{new Date(m.timestamp).toLocaleString()}</td>
                                    <td className="p-3">{m.reason}</td>
                                    <td className="p-3 text-right font-bold text-red-500">-€{m.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default CashManagement;
