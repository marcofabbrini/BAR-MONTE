
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, StaffMember, TillColors, Shift, ShiftSettings } from '../types';
import { ClipboardIcon, CalendarIcon, TrashIcon, UsersIcon, CheckIcon, LockIcon, SaveIcon } from './Icons';

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
    staff: StaffMember[];
    tillColors: TillColors;
    onDeleteRecord?: (id: string) => Promise<void>;
    onSaveAttendance?: (tillId: string, presentStaffIds: string[], dateOverride?: string) => Promise<void>;
    isSuperAdmin?: boolean;
    shiftSettings?: ShiftSettings;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, staff, tillColors, onDeleteRecord, onSaveAttendance, isSuperAdmin, shiftSettings }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'report'>('calendar');
    
    // EDITING STATE
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDate, setEditingDate] = useState<string>('');
    const [editingTillId, setEditingTillId] = useState<string>('');
    const [editingPresentIds, setEditingPresentIds] = useState<string[]>([]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    const defaultColors: {[key: string]: string} = {
        'TA': '#ef4444', 
        'TB': '#3b82f6', 
        'TC': '#22c55e', 
        'TD': '#eab308'  
    };

    const getShiftColor = (tillId: string) => {
        return tillColors[tillId] || defaultColors[tillId] || '#94a3b8';
    };

    // Helper per escludere l'utente "Cassa"
    const isRealPerson = (name: string) => !name.toLowerCase().includes('cassa');

    // LOGICA CALCOLO TURNI (Copiata da ShiftCalendar per coerenza)
    const getShiftsForDate = (date: Date) => {
        const anchorDateStr = shiftSettings?.anchorDate || new Date().toISOString().split('T')[0];
        const anchorShift = shiftSettings?.anchorShift || 'b';

        const anchorDate = new Date(anchorDateStr);
        anchorDate.setHours(12, 0, 0, 0); // Fix DST
        
        const targetDate = new Date(date);
        targetDate.setHours(12, 0, 0, 0); // Fix DST
        
        const diffTime = targetDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Usa round
        
        const shifts = ['A', 'B', 'C', 'D'];
        const anchorIndex = shifts.indexOf(anchorShift.toUpperCase());

        // Calcolo Turno Giorno
        let dayIndex = (anchorIndex + diffDays) % 4;
        if (dayIndex < 0) dayIndex += 4;
        
        // VVF Standard: 12-24 12-48. Notte è quello precedente nella sequenza logica del giorno.
        let nightIndex = dayIndex - 1;
        if (nightIndex < 0) nightIndex += 4;

        return {
            day: shifts[dayIndex],
            night: shifts[nightIndex]
        };
    };

    // Report Tabellare
    const reportData = useMemo(() => {
        const statsByShift: Record<string, { name: string, count: number }[]> = {
            'a': [], 'b': [], 'c': [], 'd': []
        };

        const staffByShift = {
            'a': staff.filter(s => s.shift === 'a' && isRealPerson(s.name)),
            'b': staff.filter(s => s.shift === 'b' && isRealPerson(s.name)),
            'c': staff.filter(s => s.shift === 'c' && isRealPerson(s.name)),
            'd': staff.filter(s => s.shift === 'd' && isRealPerson(s.name)),
        };

        const recordsInMonth = attendanceRecords.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });

        // Calcola conteggi
        Object.entries(staffByShift).forEach(([shift, members]) => {
            statsByShift[shift] = members.map(m => {
                const count = recordsInMonth.filter(r => r.presentStaffIds.includes(m.id)).length;
                return { name: m.name, count };
            }).sort((a,b) => b.count - a.count);
        });

        return statsByShift;
    }, [attendanceRecords, staff, currentDate]);

    const handleDelete = async (id: string) => {
        if (!onDeleteRecord) return;
        if (window.confirm("Vuoi resettare le presenze per questo turno specifico?")) {
            await onDeleteRecord(id);
        }
    };

    const handleOpenEdit = (date: string, tillId: string, currentRecord?: AttendanceRecord) => {
        setEditingDate(date);
        setEditingTillId(tillId);
        
        let initialIds: string[] = [];
        if (currentRecord) {
            initialIds = [...currentRecord.presentStaffIds];
        } else {
            const shift = tillId.replace('T', '').toLowerCase();
            const cassaUser = staff.find(s => s.shift === shift && s.name.toLowerCase().includes('cassa'));
            if(cassaUser) initialIds.push(cassaUser.id);
        }
        
        setEditingPresentIds(initialIds);
        setIsEditModalOpen(true);
    };

    const toggleEditingPresence = (id: string) => {
        const member = staff.find(s => s.id === id);
        if (member && member.name.toLowerCase().includes('cassa')) return; // Cassa bloccata

        setEditingPresentIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const saveEditing = async () => {
        if (!onSaveAttendance) return;
        await onSaveAttendance(editingTillId, editingPresentIds, editingDate);
        setIsEditModalOpen(false);
    };

    const editingStaffList = useMemo(() => {
        if (!editingTillId) return [];
        const shift = editingTillId.replace('T', '').toLowerCase();
        return staff.filter(s => s.shift === shift).sort((a,b) => {
             const aIsCassa = a.name.toLowerCase().includes('cassa');
             const bIsCassa = b.name.toLowerCase().includes('cassa');
             if (aIsCassa && !bIsCassa) return -1;
             if (!aIsCassa && bIsCassa) return 1;
             return a.name.localeCompare(b.name);
        });
    }, [staff, editingTillId]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col relative">
            
            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Modifica Presenze - {new Date(editingDate).toLocaleDateString()}</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2">
                                {editingStaffList.map(member => {
                                    const isSelected = editingPresentIds.includes(member.id);
                                    const isCassa = member.name.toLowerCase().includes('cassa');
                                    return (
                                        <button 
                                            key={member.id} 
                                            onClick={() => toggleEditingPresence(member.id)}
                                            disabled={isCassa}
                                            className={`
                                                flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                                                ${isCassa ? 'opacity-70 bg-slate-100 cursor-not-allowed' : ''}
                                                ${isSelected && !isCassa ? 'border-green-500 bg-green-50' : 'border-slate-200'}
                                            `}
                                        >
                                            <span className="text-xl">{member.icon || '👤'}</span>
                                            <span className="text-xs font-bold">{member.name}</span>
                                            {isCassa ? <LockIcon className="h-3 w-3 mt-1 text-slate-400"/> : isSelected && <CheckIcon className="h-4 w-4 mt-1 text-green-600"/>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <button onClick={saveEditing} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                                <SaveIcon className="h-4 w-4" /> Salva Modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                        <CalendarIcon className="h-4 w-4" /> Calendario
                    </button>
                    <button 
                        onClick={() => setViewMode('report')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${viewMode === 'report' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}`}
                    >
                        <ClipboardIcon className="h-4 w-4" /> Report Tabellare
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">←</button>
                    <h2 className="text-lg font-black text-slate-800 uppercase w-40 text-center">
                        {monthNames[currentDate.getMonth()]} <span className="text-slate-400">{currentDate.getFullYear()}</span>
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">→</button>
                </div>
            </div>

            <div className="flex-grow overflow-auto p-4">
                {viewMode === 'calendar' && (
                    <div className="grid grid-cols-7 border-l border-t border-slate-200">
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                            <div key={d} className="p-2 text-center text-xs font-bold bg-slate-100 border-r border-b border-slate-200 text-slate-500 uppercase">{d}</div>
                        ))}

                        {Array.from({ length: startingBlankDays }).map((_, i) => (
                            <div key={`blank-${i}`} className="min-h-[160px] bg-slate-50/30 border-r border-b border-slate-200"></div>
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                            const dateStr = dateObj.toISOString().split('T')[0];
                            const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
                            const isToday = new Date().toISOString().split('T')[0] === dateStr;

                            // Calcolo turno Giorno/Notte corrente
                            const shifts = getShiftsForDate(dateObj);
                            
                            // Calcolo turno Notte precedente (quello che smonta alle 8:00)
                            const prevDate = new Date(dateObj);
                            prevDate.setDate(prevDate.getDate() - 1);
                            const prevShifts = getShiftsForDate(prevDate);
                            
                            // I turni "attivi" nelle 24h sono:
                            // 1. Quello che ha fatto la notte ieri (finisce alle 8:00) -> prevShifts.night
                            // 2. Quello di Giorno oggi -> shifts.day
                            // 3. Quello di Notte oggi -> shifts.night
                            const activeShiftLetters = [
                                prevShifts.night,
                                shifts.day,
                                shifts.night
                            ];

                            return (
                                <div key={dayNum} className={`min-h-[160px] p-2 border-r border-b border-slate-200 flex flex-col gap-1 ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-sm font-bold ${isToday ? 'text-indigo-600 bg-indigo-100 px-1.5 rounded' : 'text-slate-700'}`}>
                                            {dayNum} <span className="text-[10px] text-slate-400 font-normal ml-1">({shifts.day}/{shifts.night})</span>
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1">
                                        {['TA', 'TB', 'TC', 'TD'].map(tillId => {
                                            const shiftLetter = tillId.replace('T', '');
                                            
                                            // Filtra: mostra solo se il turno è uno dei 3 attivi nelle 24h
                                            if (!activeShiftLetters.includes(shiftLetter)) return null;

                                            const record = dayRecords.find(r => r.tillId === tillId);
                                            const color = getShiftColor(tillId);
                                            
                                            let realPeopleCount = 0;
                                            if (record) {
                                                realPeopleCount = record.presentStaffIds
                                                    .filter(id => {
                                                        const member = staff.find(s => s.id === id);
                                                        return member && isRealPerson(member.name);
                                                    }).length;
                                            }

                                            // Mostra se c'è un record o se sei admin (per permettere l'inserimento)
                                            if (!record && !isSuperAdmin) return null;

                                            return (
                                                <div 
                                                    key={tillId} 
                                                    onClick={() => handleOpenEdit(dateStr, tillId, record)}
                                                    className={`
                                                        group relative flex items-center justify-between border rounded p-1.5 transition-all cursor-pointer h-8
                                                        ${record ? 'bg-slate-50 hover:bg-white hover:shadow-md' : 'bg-transparent border-dashed border-slate-200 opacity-50 hover:opacity-100'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {/* Dot con lettera Turno */}
                                                        <div 
                                                            className="w-5 h-5 rounded-full shadow-sm flex items-center justify-center text-[10px] text-white font-normal" 
                                                            style={{ backgroundColor: color }}
                                                        >
                                                            {shiftLetter}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{record ? realPeopleCount : '+'}</span>
                                                    </div>
                                                    
                                                    {onDeleteRecord && record && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                                                            className="text-slate-300 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors hidden group-hover:block"
                                                            title="Resetta Presenze Turno"
                                                        >
                                                            <TrashIcon className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'report' && (
                    <div className="max-w-6xl mx-auto p-4">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 text-center">
                            <h3 className="text-indigo-900 font-bold text-lg">Riepilogo Presenze - {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(['a', 'b', 'c', 'd'] as string[]).map(shiftKey => {
                                const shiftData = reportData[shiftKey];
                                const tillId = `T${shiftKey.toUpperCase()}`;
                                const color = getShiftColor(tillId);

                                return (
                                    <div key={shiftKey} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
                                        <div className="p-3 text-white font-bold uppercase text-center tracking-wider" style={{ backgroundColor: color }}>
                                            Turno {shiftKey.toUpperCase()}
                                        </div>
                                        <div className="p-0 flex-grow">
                                            {shiftData.length === 0 ? (
                                                <p className="text-center text-slate-400 py-4 text-xs italic">Nessun dato</p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-slate-100">
                                                        {shiftData.map((person, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                <td className="p-3 text-slate-700 font-medium">{person.name}</td>
                                                                <td className="p-3 text-right font-bold text-slate-900">{person.count}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceCalendar;
