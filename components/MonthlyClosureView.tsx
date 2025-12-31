
import React, { useMemo } from 'react';
import { useBar } from '../contexts/BarContext';
import { MonthlyClosure, Shift } from '../types';
import { CheckIcon, WalletIcon } from './Icons';

const MonthlyClosureView: React.FC = () => {
    const { 
        orders, 
        staff, 
        monthlyClosures, 
        updateMonthlyClosure, 
        getNow, 
        activeBarUser,
        availableRoles 
    } = useBar();

    // TARGET DATE: PREVIOUS MONTH
    const targetDate = useMemo(() => {
        const d = getNow();
        d.setMonth(d.getMonth() - 1);
        return d;
    }, [getNow]);

    const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = targetDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    // Retrieve current closure status or default
    const closureStatus = useMemo(() => {
        return monthlyClosures.find(c => c.id === monthKey) || {
            id: monthKey,
            payments: { a: false, b: false, c: false, d: false }
        };
    }, [monthlyClosures, monthKey]);

    // Calculate revenue per shift for the target month
    const shiftRevenues = useMemo(() => {
        const revenues = { a: 0, b: 0, c: 0, d: 0 };
        const startStr = `${monthKey}-01`;
        const nextMonth = new Date(targetDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endStr = nextMonth.toISOString().split('T')[0];

        orders.forEach(o => {
            if (o.isDeleted) return;
            
            // Adjust for night shift (orders before 8am belong to prev day)
            const orderDate = new Date(o.timestamp);
            if (orderDate.getHours() < 8) {
                orderDate.setDate(orderDate.getDate() - 1);
            }
            const orderDateStr = orderDate.toISOString().split('T')[0];

            if (orderDateStr >= startStr && orderDateStr < endStr) {
                const member = staff.find(s => s.id === o.staffId);
                if (member && member.shift) {
                    const s = member.shift.toLowerCase() as Shift;
                    if (revenues[s] !== undefined) {
                        revenues[s] += o.total;
                    }
                }
            }
        });
        return revenues;
    }, [orders, staff, monthKey, targetDate]);

    // Check Permissions (Capo Distaccamento / Admin / SuperAdmin)
    const canManageClosure = useMemo(() => {
        if (!activeBarUser) return false;
        if (activeBarUser.role === 'super-admin') return true;
        const roleDef = availableRoles.find(r => r.id === activeBarUser.role);
        // Level 3+ usually admins, but maybe level 2 (managers/capo) can do this?
        // Assuming Admin+ for financial closure confirmation.
        return roleDef ? roleDef.level >= 3 : false;
    }, [activeBarUser, availableRoles]);

    const handleTogglePayment = async (shift: Shift) => {
        if (!canManageClosure) return alert("Solo un amministratore o il Capo Distaccamento può confermare i pagamenti.");
        
        const newPayments = { ...closureStatus.payments, [shift]: !closureStatus.payments[shift] };
        await updateMonthlyClosure(monthKey, { payments: newPayments });
    };

    const isFullyClosed = Object.values(closureStatus.payments).every(v => v);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-600">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Chiusura Mensile Bar</h2>
                        <p className="text-sm font-bold text-indigo-600 uppercase">{monthLabel}</p>
                    </div>
                    {isFullyClosed ? (
                        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold text-xs uppercase flex items-center gap-2 border border-green-200">
                            <CheckIcon className="h-5 w-5"/> Mese Saldato
                        </div>
                    ) : (
                        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full font-bold text-xs uppercase flex items-center gap-2 border border-red-200 animate-pulse">
                            <WalletIcon className="h-5 w-5"/> In Attesa
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(['a', 'b', 'c', 'd'] as Shift[]).map(shift => {
                        const isPaid = closureStatus.payments[shift];
                        const amount = shiftRevenues[shift];
                        const colorMap = { a: 'red', b: 'blue', c: 'green', d: 'yellow' };
                        const color = colorMap[shift];

                        return (
                            <div key={shift} className={`relative p-4 rounded-xl border-2 transition-all ${isPaid ? 'bg-slate-50 border-slate-200 opacity-80' : `bg-white border-${color}-100 shadow-sm hover:shadow-md`}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-xs font-black uppercase bg-${color}-100 text-${color}-700 px-2 py-1 rounded`}>
                                        Turno {shift.toUpperCase()}
                                    </span>
                                    {isPaid && <CheckIcon className="h-6 w-6 text-green-500" />}
                                </div>
                                
                                <div className="text-center py-2">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Totale Dovuto</p>
                                    <p className={`text-2xl font-black ${isPaid ? 'text-slate-400 line-through decoration-2' : 'text-slate-800'}`}>
                                        €{amount.toFixed(2)}
                                    </p>
                                </div>

                                <button 
                                    onClick={() => handleTogglePayment(shift)}
                                    disabled={!canManageClosure}
                                    className={`w-full mt-4 py-2 rounded-lg font-bold text-xs uppercase transition-colors flex items-center justify-center gap-2
                                        ${isPaid 
                                            ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' 
                                            : `bg-${color}-500 hover:bg-${color}-600 text-white shadow-md`
                                        }
                                        ${!canManageClosure && 'opacity-50 cursor-not-allowed'}
                                    `}
                                >
                                    {isPaid ? 'Annulla' : 'Conferma Saldo'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
                    <p className="font-bold uppercase mb-1">Nota Operativa:</p>
                    <p>
                        La chiusura mensile deve essere confermata dal Capo Distaccamento o da un amministratore. 
                        Una volta che tutti i turni hanno saldato il conto, l'icona di allerta nel menu principale scomparirà. 
                        L'allerta scompare automaticamente dopo la prima settimana del mese successivo.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MonthlyClosureView;
