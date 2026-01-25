
import React, { useMemo, useState, useEffect } from 'react';
import { useBar } from '../contexts/BarContext';
import { MonthlyClosure, Shift } from '../types';
import { CheckIcon, WalletIcon, CalendarIcon, FilterIcon } from './Icons';

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

    // --- DATE SELECTION STATE ---
    // Inizializza con la logica "intelligente": primi 7 giorni = mese scorso, altrimenti mese corrente.
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        const d = new Date(getNow());
        if (d.getDate() <= 7) {
            d.setMonth(d.getMonth() - 1);
        }
        return d;
    });

    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth(); // 0-11

    // Genera lista anni (es. 2024, 2025, 2026)
    const availableYears = useMemo(() => {
        const y = new Date().getFullYear();
        return [y - 1, y, y + 1];
    }, []);

    const monthNames = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", 
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ];

    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthLabel = selectedDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

    // Retrieve closure status for the SELECTED month
    const closureStatus = useMemo(() => {
        return monthlyClosures.find(c => c.id === monthKey) || {
            id: monthKey,
            payments: { a: false, b: false, c: false, d: false }
        };
    }, [monthlyClosures, monthKey]);

    // Calculate revenue per shift for the SELECTED month (Bar Orders + Water Quotas)
    const shiftRevenues = useMemo(() => {
        const revenues = { a: 0, b: 0, c: 0, d: 0 };
        
        // Define exact start and end of the SELECTED month
        const startStr = `${monthKey}-01`;
        
        // End: 1st of NEXT month relative to selected date
        const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
        const endStr = nextMonthDate.toISOString().split('T')[0];
        
        const waterPrice = generalSettings?.waterQuotaPrice || 0;

        // 1. BAR ORDERS REVENUE (Strictly filtered by selected date range)
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

        // 2. WATER QUOTAS REVENUE (Strictly filtered by selected date range)
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
                        
                        // --- ESCLUSIONE RIGOROSA CASSA COMUNE ---
                        // Verifica che il nome non contenga "Cassa" (case insensitive) per evitare di addebitare l'acqua alla cassa comune
                        if (member.name.toLowerCase().includes('cassa')) return;
                        
                        // Esclusione Super Admin
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
    }, [orders, staff, monthKey, currentYear, currentMonth, attendanceRecords, generalSettings]);

    // Check Permissions (Capo Distaccamento / Admin / SuperAdmin)
    const canManageClosure = useMemo(() => {
        if (!activeBarUser) return false;
        if (activeBarUser.role === 'super-admin') return true;
        const roleDef = availableRoles.find(r => r.id === activeBarUser.role);
        return roleDef ? roleDef.level >= 3 : false;
    }, [activeBarUser, availableRoles]);

    const handleTogglePayment = async (shift: Shift) => {
        if (!canManageClosure) return alert("Solo un amministratore o il Capo Distaccamento può confermare i pagamenti.");
        
        const newPayments = { ...closureStatus.payments, [shift]: !closureStatus.payments[shift] };
        await updateMonthlyClosure(monthKey, { payments: newPayments });
    };

    const handleMonthSelect = (mIndex: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMonth(mIndex);
        setSelectedDate(newDate);
    };

    const handleYearSelect = (year: number) => {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(year);
        setSelectedDate(newDate);
    };

    const isFullyClosed = Object.values(closureStatus.payments).every(v => v);

    return (
        <div className="space-y-6 animate-fade-in">
            
            {/* SELETTORE PERIODO */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Periodo Riferimento</h2>
                        <div className="flex gap-2 mt-1">
                            <select 
                                value={currentMonth} 
                                onChange={(e) => handleMonthSelect(parseInt(e.target.value))}
                                className="font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                            >
                                {monthNames.map((m, i) => (
                                    <option key={i} value={i}>{m}</option>
                                ))}
                            </select>
                            <select 
                                value={currentYear} 
                                onChange={(e) => handleYearSelect(parseInt(e.target.value))}
                                className="font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
                            >
                                {availableYears.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                    <FilterIcon className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs text-indigo-800 font-medium">
                        Visualizzi i dati di: <b>{monthLabel.toUpperCase()}</b>
                    </span>
                </div>
            </div>

            {/* SCHEDA PRINCIPALE */}
            <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-600">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Stato Chiusura</h2>
                        <p className="text-xs text-slate-400 font-bold">Totali calcolati sulle vendite e presenze effettive</p>
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
                    <ul className="list-disc pl-4 space-y-1">
                        <li>Il totale visualizzato è la somma esatta di tutti gli ordini registrati e delle quote acqua maturate nel mese selezionato.</li>
                        <li><b>Esclusione Cassa Comune:</b> Le quote acqua vengono calcolate solo per il personale effettivo. Gli utenti "Cassa" sono automaticamente esclusi dal conteggio.</li>
                        <li>La chiusura mensile deve essere confermata dal Capo Distaccamento o da un amministratore.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MonthlyClosureView;
