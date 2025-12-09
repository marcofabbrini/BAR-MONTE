
import React, { useState, useMemo } from 'react';
import { Order, CashMovement } from '../types';
import { type User } from 'firebase/auth';
import { TrashIcon } from './Icons';

interface CashManagementProps {
    orders: Order[];
    movements: CashMovement[];
    onAddMovement: (m: Omit<CashMovement, 'id'>) => Promise<void>;
    onUpdateMovement: (m: CashMovement) => Promise<void>;
    onDeleteMovement: (id: string, email: string) => Promise<void>;
    onPermanentDeleteMovement: (id: string) => Promise<void>;
    onResetCash: (type: 'bar' | 'games') => Promise<void>;
    isSuperAdmin: boolean;
    currentUser: User | null;
}

const CashManagement: React.FC<CashManagementProps> = ({ orders, movements, onAddMovement, onUpdateMovement, onDeleteMovement, onPermanentDeleteMovement, onResetCash, isSuperAdmin, currentUser }) => {
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [miscAmount, setMiscAmount] = useState('');
    const [miscReason, setMiscReason] = useState('');

    // --- SALDO BAR ---
    const activeOrders = useMemo(() => orders.filter(o => !o.isDeleted), [orders]);
    const salesRevenue = activeOrders.reduce((sum, o) => sum + o.total, 0) || 0;
    
    const activeMovements = useMemo(() => movements.filter(m => !m.isDeleted), [movements]);
    const cashMovementsBar = useMemo(() => activeMovements.filter(m => m.category === 'bar' || !m.category), [activeMovements]);
    const deposits = cashMovementsBar.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0) || 0;
    const withdrawals = cashMovementsBar.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0) || 0;
    const operationalBalance = salesRevenue + deposits - withdrawals;

    // --- FONDO GIOCO (Jackpot) ---
    // Calcoliamo il montepremi basandoci sugli incassi EFFETTIVI dei giochi (categoria tombola/analotto)
    // NOTA: Come da logica App.tsx, quando si compra un ticket (es. 5€), 5€ vanno in category='tombola' e 1€ (20%) va in category='bar'.
    // Quindi il "Jackpot" accumulato è l'80% dei depositi totali di quella categoria.
    const tombolaMovements = activeMovements.filter(m => m.category === 'tombola');
    const analottoMovements = activeMovements.filter(m => m.category === 'analotto');

    const depositsTombola = tombolaMovements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0) || 0;
    const depositsAnalotto = analottoMovements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0) || 0;
    
    // Sottraiamo eventuali prelievi dal fondo gioco (es. rimborsi o vincite pagate cash se gestite così)
    const withdrawalsTombola = tombolaMovements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0) || 0;
    const withdrawalsAnalotto = analottoMovements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0) || 0;

    // Il fondo netto è (Incasso - Prelievi) * 0.80. 
    // Tuttavia, per semplicità e coerenza con la visualizzazione "incasso grezzo", mostriamo il totale dei depositi validi per il jackpot.
    const jackpotTombola = (depositsTombola - withdrawalsTombola) * 0.8;
    const jackpotAnalotto = (depositsAnalotto - withdrawalsAnalotto) * 0.8;
    const totalJackpotFund = jackpotTombola + jackpotAnalotto;

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

    const handleResetBar = async () => { 
        if(window.confirm("SEI SICURO? Questo azzererà il conteggio della cassa BAR.")) await onResetCash('bar'); 
    };

    const handleResetGames = async () => {
        if(window.confirm("ATTENZIONE: Azzerare il fondo giochi porterà a 0 anche i montepremi visibili nella Tombola e Analotto. Procedere?")) {
            await onResetCash('games');
        }
    };

    const handleSoftDelete = async (id: string) => {
        if (!currentUser?.email) return alert("Devi essere loggato per eliminare.");
        if (window.confirm("Vuoi spostare questo movimento nel cestino (annullare)?")) {
            await onDeleteMovement(id, currentUser.email);
        }
    };

    const handleHardDelete = async (id: string) => {
        if (!isSuperAdmin) return;
        if (window.confirm("ELIMINAZIONE DEFINITIVA. Il record sparirà dal database per sempre. Sei sicuro?")) {
            await onPermanentDeleteMovement(id);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* SALDO BAR */}
                <div className="bg-slate-800 p-6 rounded-xl text-white relative overflow-hidden shadow-lg">
                    <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Saldo Operativo Bar</p>
                    <p className="text-4xl font-black mt-1">€{(operationalBalance || 0).toFixed(2)}</p>
                    <div className="mt-4 flex gap-4 text-xs opacity-80">
                        <span>Vendite: +€{(salesRevenue || 0).toFixed(2)}</span>
                        <span>Spese: -€{(withdrawals || 0).toFixed(2)}</span>
                    </div>
                    {isSuperAdmin && <button onClick={handleResetBar} className="absolute top-4 right-4 text-[10px] bg-red-600 px-2 py-1 rounded hover:bg-red-500 font-bold">RESET</button>}
                </div>
                
                {/* FONDO GIOCHI */}
                <div className="bg-indigo-700 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
                    <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider">Fondo Gioco (Montepremi)</p>
                    <p className="text-4xl font-black mt-1">€{(totalJackpotFund || 0).toFixed(2)}</p>
                    <div className="mt-4 flex flex-col gap-1 text-xs opacity-80">
                        <div className="flex justify-between w-full pr-12">
                            <span>Tombola: €{(jackpotTombola || 0).toFixed(2)}</span>
                            <span>Analotto: €{(jackpotAnalotto || 0).toFixed(2)}</span>
                        </div>
                    </div>
                    {isSuperAdmin && <button onClick={handleResetGames} className="absolute top-4 right-4 text-[10px] bg-red-600 px-2 py-1 rounded hover:bg-red-500 font-bold">RESET</button>}
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
                        <thead className="bg-slate-50 text-slate-500 sticky top-0 text-xs uppercase"><tr><th className="p-3">Data</th><th className="p-3">Causale</th><th className="p-3">Cat.</th><th className="p-3 text-right">Importo</th><th className="p-3 text-center">Azioni</th></tr></thead>
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
                                    <td className="p-3 flex justify-center gap-2">
                                        {!m.isDeleted && (
                                            <button onClick={() => handleSoftDelete(m.id)} className="text-red-300 hover:text-red-500 p-1 rounded hover:bg-red-50" title="Annulla Movimento">
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                        {isSuperAdmin && (
                                            <button onClick={() => handleHardDelete(m.id)} className="text-red-800 hover:text-red-600 bg-red-100 hover:bg-red-200 p-1 rounded" title="ELIMINA DEFINITIVAMENTE">
                                                <span className="font-bold text-xs px-1">X</span>
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