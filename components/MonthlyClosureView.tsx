
import React, { useMemo } from 'react';
import { useBar } from '../contexts/BarContext';
import { MonthlyClosure, Shift, AttendanceStatus } from '../types';
import { CheckIcon, WalletIcon } from './Icons';

const MonthlyClosureView: React.FC = () => {
    const { 
        orders, 
        staff, 
        monthlyClosures, 
        updateMonthlyClosure, 
        getNow, 
        activeBarUser,
        availableRoles,
        attendanceRecords,
        generalSettings
    } = useBar();

    // TARGET DATE LOGIC:
    // If today is <= 7th of month -> We probably want to close the PREVIOUS month.
    // If today is > 7th -> We want to see the accumulated total for the CURRENT month.
    const targetDate = useMemo(() => {
        const d = new Date(getNow()); // Clone to avoid mutation issues
        if (d.getDate() <= 7) {
            d.setMonth(d.getMonth() - 1);
        }
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

    // Calculate revenue per shift for the target month (Bar Orders + Water Quotas)
    const shiftRevenues = useMemo(() => {
        const revenues = { a: 0, b: 0, c: 0, d: 0 };
        
        // Define exact start and end of the target month
        // Start: 1st of month at 00:00:00
        const startStr = `${monthKey}-01`;
        
        // End: 1st of NEXT month
        const nextMonth = new Date(targetDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endStr = nextMonth.toISOString().split('T')[0];
        
        const waterPrice = generalSettings?.waterQuotaPrice || 0;

        // 1. BAR ORDERS REVENUE (Strictly filtered by date)
        orders.forEach(o => {
            if (o.isDeleted) return;
            
            // Adjust for night shift (orders before 8am belong to prev day)
            const orderDate = new Date(o.timestamp);
            if (orderDate.getHours() < 8) {
                orderDate.setDate(orderDate.getDate() - 1);
            }
            const orderDateStr = orderDate.toISOString().split('T')[0];

            // Strict check: Order Operational Date must be within the target month
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

        // 2. WATER QUOTAS REVENUE (Strictly filtered by date)
        attendanceRecords.forEach(r => {
            // Filtra per data nel mese target
            if (r.date >= startStr && r.date < endStr) {
                const shift = r.tillId.replace('T', '').toLowerCase() as Shift;
                
                if (revenues[shift] !== undefined) {
                    // Calcola numero di paganti per questo giorno/turno
                    const idsToCheck = r.attendanceDetails ? Object.keys(r.attendanceDetails) : r.presentStaffIds;
                    
                    let payingCount = 0;
                    idsToCheck.forEach(id => {
                        const member = staff.find(s => s.id === id);
                        if (!member) return;
                        
                        // Esclusioni standard (Cassa, Super Admin)
                        if (member.name.toLowerCase().includes('cassa')) return;
                        if (member.role === 'super-admin') return;

                        let isPaying = false;
                        
                        if (r.attendanceDetails && r.attendanceDetails[id]) {
                            const status = r.attendanceDetails[id];
                            // Status che pagano l'acqua: Presente, Sostituzione, Missione (se presente in sede)
                            // Malattia, Ferie, Riposo, Permesso NON pagano
                            if (['present', 'substitution', 'sub1', 'sub2', 'sub3'].includes(status as string)) {
                                isPaying = true;
                            }
                        } else if (r.presentStaffIds.includes(id)) {
                            // Fallback per vecchi record senza dettagli
                            isPaying = true;
                        }

                        if (isPaying) payingCount++;
                    });

                    revenues[shift] += (payingCount * waterPrice);
                }
            }
        });

        return revenues;
    }, [orders, staff, monthKey, targetDate, attendanceRecords, generalSettings]);

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
                                    <p className="text-xs text-slate-400 font-bold uppercase">Totale Dovuto (Bar + H2O)</p>
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
                        Il totale visualizzato è la somma esatta di tutti gli ordini registrati e delle quote acqua maturate 
                        nel mese di <b>{monthLabel}</b>. Non include residui di mesi precedenti.<br/>
                        La chiusura mensile deve essere confermata dal Capo Distaccamento o da un amministratore. 
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MonthlyClosureView;
