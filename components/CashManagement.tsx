
import React, { useState, useMemo } from 'react';
import { Order, CashMovement } from '../types';
import { User } from 'firebase/auth';
import { TrashIcon } from './Icons';

interface CashManagementProps {
    orders: Order[];
    movements: CashMovement[];
    onAddMovement: (m: Omit<CashMovement, 'id'>) => Promise<void>;
    onUpdateMovement: (m: CashMovement) => Promise<void>;
    onDeleteMovement: (id: string, email: string) => Promise<void>;
    onResetCash: () => Promise<void>;
    isSuperAdmin: boolean;
    currentUser: User | null;
}

const CashManagement: React.FC<CashManagementProps> = ({ orders, movements, onAddMovement, onUpdateMovement, onDeleteMovement, onResetCash, isSuperAdmin, currentUser }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [miscAmount, setMiscAmount] = useState('');
    const [miscReason, setMiscReason] = useState('');

    const activeOrders = useMemo(() => orders.filter(o => !o.isDeleted), [orders]);
    const salesRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0) || 0;
    
    // Filtra movimenti "BAR" e non cancellati
    const activeMovements = useMemo(() => movements.filter(m => !m.isDeleted), [movements]);
    const cashMovementsBar = useMemo(() => activeMovements.filter(m => m.category === 'bar' || !m.category), [activeMovements]);
    const deposits = cashMovementsBar.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0) || 0;
    const withdrawals = cashMovementsBar.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0) || 0;
    const operationalBalance = salesRevenue + deposits - withdrawals;

    // FONDO GIOCO
    const cashMovementsTombola = useMemo(() => activeMovements.filter(m => m.category === 'tombola'), [activeMovements]);
    const depositsTombola = cashMovementsTombola.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0) || 0;
    const jackpotFund = depositsTombola * 0.8; 

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

    const handleReset = async () => { if(window.confirm("SEI SICURO? Questo azzererà il conteggio della cassa.")) await onResetCash(); };

    const handleDelete = async (id: string) => {
        if (!currentUser?.email) return alert("Devi essere loggato per eliminare.");
        if (window.confirm("Sei sicuro di voler eliminare questo movimento?")) {
            await onDeleteMovement(id, currentUser.email);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-6 rounded-xl text-white relative overflow-hidden shadow-lg">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Saldo Operativo Bar</p>
                    <p className="text-4xl font-black mt-1">€{(operationalBalance || 0).toFixed(2)}</p>
                    <div className="mt-4 flex gap-4 text-xs opacity-80">
                        <span>Vendite: +€{(salesRevenue || 0).toFixed(2)}</span>
                        <span>Spese: -€{(withdrawals || 0).toFixed(2)}</span>
                    </div>
                    {isSuperAdmin && <button onClick={handleReset} className="absolute top-4 right-4 text-[10px] bg-red-600 px-2 py-1 rounded hover:bg-red-500 font-bold">RESET</button>}
                </div>
                
                <div className="bg-indigo-700 p-6 rounded-xl text-white shadow-lg">
                    <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Fondo Gioco (Montepremi)</p>
                    <p className="text-4xl font-black mt-1">€{(jackpotFund || 0).toFixed(2)}</p>
                    <p className="mt-4 text-xs opacity-80">Incassi totali Tombola: €{(depositsTombola || 0).toFixed(2)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><span className="text-red-500">▼</span> Prelievo / Versamento</h3>
                    <form onSubmit={handleSubmitWithdrawal} className="flex flex-col gap-3">
                        <input type="number" placeholder="Importo (€)" value={amount} onChange={e => setAmount(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-200" step="0.01" required />
                        <input type="text" placeholder="Causale (es. Versamento Banca)" value={reason} onChange={e => setReason(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-200" required />
                        <button type="submit" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition-colors">Registra Operazione</button>
                    </form>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><span className="text-orange-500">▼</span> Acquisti Vari</h3>
                    <form onSubmit={handleSubmitMisc} className="flex flex-col gap-3">
                        <input type="number" placeholder="Costo (€)" value={miscAmount} onChange={e => setMiscAmount(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-200" step="0.01" required />
                        <input type="text" placeholder="Descrizione (es. Cancelleria, Ghiaccio)" value={miscReason} onChange={e => setMiscReason(e.target.value)} className="bg-slate-50 border rounded-lg p-3 outline-none focus:ring-2 focus:ring-orange-200" required />
                        <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg transition-colors">Registra Spesa</button>
                    </form>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <h3 className="font-bold text-slate-800 p-4 bg-slate-50 border-b border-slate-200">Storico Movimenti Completo</h3>
                <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 text-xs uppercase"><tr><th className="p-3">Data</th><th className="p-3">Causale</th><th className="p-3">Cat.</th><th className="p-3 text-right">Importo</th><th className="p-3"></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {movements.map(m => (
                                <tr key={m.id} className={`hover:bg-slate-50 ${m.isDeleted ? 'bg-red-50 opacity-50' : ''}`}>
                                    <td className="p-3 text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(m.timestamp).toLocaleString()}
                                        {m.isDeleted && <div className="text-[9px] text-red-500">DEL: {m.deletedBy}</div>}
                                    </td>
                                    <td className="p-3 font-medium text-slate-700">{m.reason}</td>
                                    <td className="p-3 text-xs uppercase font-bold text-slate-400">{m.category || 'BAR'}</td>
                                    <td className={`p-3 text-right font-bold ${m.type === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                                        {m.type === 'withdrawal' ? '-' : '+'}€{m.amount.toFixed(2)}
                                    </td>
                                    <td className="p-3 text-right">
                                        {!m.isDeleted && isSuperAdmin && (
                                            <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-600">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
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
