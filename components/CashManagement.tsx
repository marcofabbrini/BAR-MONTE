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

    // CALCOLI SEPARATI PER CATEGORIA
    // 1. BAR: Vendite + (Versamenti Tombola in entrata se categorizzati) - Uscite Bar
    const activeOrders = useMemo(() => orders.filter(o => !o.isDeleted), [orders]);
    const salesRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0);
    
    // Filtra movimenti "BAR" (default o esplicito bar)
    const cashMovementsBar = useMemo(() => movements.filter(m => m.category !== 'tombola'), [movements]);
    
    const deposits = cashMovementsBar.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
    const withdrawals = cashMovementsBar.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);
    
    const operationalBalance = salesRevenue + deposits - withdrawals;

    const handleSubmitWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || !reason.trim()) return;
        await onAddMovement({ amount: val, reason: reason.trim(), timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' });
        setAmount(''); setReason('');
    };

    const handleSubmitMisc = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(miscAmount);
        if (!val || !miscReason.trim()) return;
        await onAddMovement({ amount: val, reason: `SPESA VARIA: ${miscReason.trim()}`, timestamp: new Date().toISOString(), type: 'withdrawal', category: 'bar' });
        setMiscAmount(''); setMiscReason('');
    };

    const handleReset = async () => {
        if(window.confirm("SEI SICURO? Questo azzererà il conteggio della cassa.")) {
            await onResetCash();
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* DASHBOARD SALDI */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-6 rounded-xl text-white relative overflow-hidden shadow-lg">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Saldo Operativo Bar</p>
                    <p className="text-4xl font-black mt-1">€{operationalBalance.toFixed(2)}</p>
                    <div className="mt-4 flex gap-4 text-xs opacity-80">
                        <span>Vendite: +€{salesRevenue.toFixed(2)}</span>
                        <span>Spese: -€{withdrawals.toFixed(2)}</span>
                    </div>
                    {isSuperAdmin && (
                        <button onClick={handleReset} className="absolute top-4 right-4 text-[10px] bg-red-600 px-2 py-1 rounded hover:bg-red-500 font-bold">RESET</button>
                    )}
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <h4 className="font-bold text-slate-700 mb-2">Ultimi Movimenti (Entrate/Uscite)</h4>
                    <div className="space-y-2 text-sm text-slate-600">
                        {cashMovementsBar.slice(0, 3).map(m => (
                            <div key={m.id} className="flex justify-between border-b pb-1 last:border-0">
                                <span className="truncate w-2/3">{m.reason}</span>
                                <span className={m.type === 'withdrawal' ? 'text-red-500 font-bold' : 'text-green-500 font-bold'}>
                                    {m.type === 'withdrawal' ? '-' : '+'}€{m.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Prelievo Banca/Cassa */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><span className="text-red-500">▼</span> Prelievo / Versamento</h3>
                    <form onSubmit={handleSubmitWithdrawal} className="flex flex-col gap-3">
                        <input type="number" placeholder="Importo (€)" value={amount} onChange={e => setAmount(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-200" step="0.01" required />
                        <input type="text" placeholder="Causale (es. Versamento Banca)" value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-200" required />
                        <button type="submit" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">Registra Operazione</button>
                    </form>
                </div>

                {/* Acquisti Vari */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><span className="text-orange-500">▼</span> Acquisti Vari</h3>
                    <form onSubmit={handleSubmitMisc} className="flex flex-col gap-3">
                        <input type="number" placeholder="Costo (€)" value={miscAmount} onChange={e => setMiscAmount(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-200" step="0.01" required />
                        <input type="text" placeholder="Descrizione (es. Cancelleria, Ghiaccio)" value={miscReason} onChange={e => setMiscReason(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-200" required />
                        <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors">Registra Spesa</button>
                    </form>
                </div>
            </div>

            {/* Storico Completo */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="font-bold text-slate-800 p-4 bg-slate-50 border-b border-slate-200">Storico Movimenti Completo</h3>
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 text-xs uppercase"><tr><th className="p-3">Data</th><th className="p-3">Causale</th><th className="p-3 text-right">Importo</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {movements.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50">
                                    <td className="p-3 text-xs text-slate-400 whitespace-nowrap">{new Date(m.timestamp).toLocaleString()}</td>
                                    <td className="p-3 font-medium text-slate-700">{m.reason}</td>
                                    <td className={`p-3 text-right font-bold ${m.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                                        {m.type === 'withdrawal' ? '-' : '+'}€{m.amount.toFixed(2)}
                                    </td>
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