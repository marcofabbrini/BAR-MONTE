
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, StaffMember, TillColors, Shift, ShiftSettings } from '../types';
import { ClipboardIcon, CalendarIcon, TrashIcon, UsersIcon, CheckIcon, LockIcon, SaveIcon, BackArrowIcon, LockOpenIcon } from './Icons';

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
    staff: StaffMember[];
    tillColors: TillColors;
    onDeleteRecord?: (id: string) => Promise<void>;
    onSaveAttendance?: (tillId: string, presentStaffIds: string[], dateOverride?: string, closedBy?: string) => Promise<void>;
    onReopenAttendance?: (id: string) => Promise<void>;
    isSuperAdmin?: boolean;
    shiftSettings?: ShiftSettings;
    readOnly?: boolean;
    onGoBack?: () => void;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, staff, tillColors, onDeleteRecord, onSaveAttendance, onReopenAttendance, isSuperAdmin, shiftSettings, readOnly, onGoBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'report'>('calendar');
    
    // EDITING STATE
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDate, setEditingDate] = useState<string>('');
    const [editingTillId, setEditingTillId] = useState<string>('');
    const [editingPresentIds, setEditingPresentIds] = useState<string[]>([]);
    const [editingRecord, setEditingRecord] = useState<AttendanceRecord | undefined>(undefined);

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

    const isRealPerson = (name: string) => !name.toLowerCase().includes('cassa');

    const getShiftsForDate = (date: Date) => {
        const anchorDateStr = shiftSettings?.anchorDate || '2025-12-10';
        const anchorShift = shiftSettings?.anchorShift || 'd';

        const anchorDate = new Date(anchorDateStr);
        anchorDate.setHours(12, 0, 0, 0); 
        
        const targetDate = new Date(date);
        targetDate.setHours(12, 0, 0, 0); 
        
        const diffTime = targetDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
        
        const shifts = ['A', 'B', 'C', 'D'];
        const anchorIndex = shifts.indexOf(anchorShift.toUpperCase());

        let dayIndex = (anchorIndex + diffDays) % 4;
        if (dayIndex < 0) dayIndex += 4;
        
        let nightIndex = dayIndex - 1;
        if (nightIndex < 0) nightIndex += 4;

        // Smontante = Notte del giorno PRIMA
        let smontanteIndex = dayIndex - 2; 
        if (smontanteIndex < 0) smontanteIndex += 4;

        return {
            day: shifts[dayIndex],
            night: shifts[nightIndex],
            smontante: shifts[smontanteIndex]
        };
    };

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

        Object.entries(staffByShift).forEach(([shift, members]) => {
            statsByShift[shift] = members.map(m => {
                const count = recordsInMonth.filter(r => r.presentStaffIds.includes(m.id)).length;
                return { name: m.name, count };
            }).sort((a,b) => b.count - a.count);
        });

        return statsByShift;
    }, [attendanceRecords, staff, currentDate]);

    const handleReopen = async (id: string) => {
        if (!onReopenAttendance || readOnly) return;
        if (window.confirm("Vuoi RIAPRIRE questo turno? Il record delle presenze rimarrà salvato, ma il turno risulterà APERTO.")) {
            await onReopenAttendance(id);
            setIsEditModalOpen(false);
        }
    };

    const handleOpenEdit = (date: string, tillId: string, currentRecord?: AttendanceRecord) => {
        if (readOnly) return;
        setEditingDate(date);
        setEditingTillId(tillId);
        setEditingRecord(currentRecord);
        
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
        if (member && member.name.toLowerCase().includes('cassa')) return;

        setEditingPresentIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const saveEditing = async () => {
        if (!onSaveAttendance) return;
        await onSaveAttendance(editingTillId, editingPresentIds, editingDate, editingRecord?.closedBy || 'Admin');
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

    const getSlotLabel = (type: 'smontante' | 'giorno' | 'notte') => {
        switch(type) {
            case 'smontante': return { full: 'Smontante', short: 'S' };
            case 'giorno': return { full: 'Giorno', short: 'G' };
            case 'notte': return { full: 'Notte', short: 'N' };
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden h-full flex flex-col relative">
            
            {onGoBack && (
                <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-20 flex items-center gap-2">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800">
                        <BackArrowIcon className="h-5 w-5" /> Indietro
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 ml-4">Calendario Presenze</h1>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800">Modifica Presenze</h3>
                                <p className="text-xs text-slate-500">{new Date(editingDate).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-2xl leading-none">&times;</button>
                        </div>
                        
                        {editingRecord && editingRecord.closedAt && (
                            <div className="bg-green-50 p-3 border-b border-green-100 text-xs text-green-800 flex flex-col gap-1">
                                <div className="font-bold flex items-center gap-1"><CheckIcon className="h-3 w-3" /> Turno Chiuso</div>
                                <div>Da: <b>{editingRecord.closedBy || 'Sconosciuto'}</b></div>
                                <div>Il: {new Date(editingRecord.closedAt).toLocaleString()}</div>
                            </div>
                        )}

                        <div className="p-4 max-h-[50vh] overflow-y-auto">
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
                        <div className="p-4 border-t border-slate-200 flex justify-between items-center gap-3">
                            {isSuperAdmin && editingRecord?.closedAt && onReopenAttendance ? (
                                <button onClick={() => handleReopen(editingRecord.id)} className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm border border-red-200">
                                    <LockOpenIcon className="h-4 w-4" /> RIAPRI TURNO
                                </button>
                            ) : <div></div>}
                            
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

            <div className="flex-grow overflow-auto p-2 md:p-4">
                {viewMode === 'calendar' && (
                    <div className="grid grid-cols-7 border-l border-t border-slate-300">
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                            <div key={d} className="p-2 text-center text-xs font-bold bg-slate-100 border-r border-b border-slate-300 text-slate-500 uppercase">{d}</div>
                        ))}

                        {Array.from({ length: startingBlankDays }).map((_, i) => (
                            <div key={`blank-${i}`} className="min-h-[80px] bg-slate-50/30 border-r border-b border-slate-300"></div>
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                            const dateStr = dateObj.toISOString().split('T')[0];
                            const shifts = getShiftsForDate(dateObj);
                            
                            // Logica Giorno Corrente basata su data locale
                            const today = new Date();
                            const isToday = today.toDateString() === dateObj.toDateString();

                            // Data precedente per Smontante (giorno prima)
                            const prevDate = new Date(dateObj);
                            prevDate.setDate(prevDate.getDate() - 1);
                            const prevDateStr = prevDate.toISOString().split('T')[0];
                            
                            // 3 SLOT CRONOLOGICI
                            const timeSlots = [
                                { id: 'slot1', shift: shifts.smontante, label: getSlotLabel('smontante'), dateRef: prevDateStr },
                                { id: 'slot2', shift: shifts.day, label: getSlotLabel('giorno'), dateRef: dateStr },
                                { id: 'slot3', shift: shifts.night, label: getSlotLabel('notte'), dateRef: dateStr }
                            ];

                            return (
                                <div 
                                    key={dayNum} 
                                    className={`
                                        min-h-[100px] md:min-h-[160px] p-1 md:p-2 border-r border-b border-slate-300 flex flex-col gap-1 
                                        ${isToday ? 'border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] bg-white z-10' : 'bg-white'}
                                    `}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`
                                            text-xs md:text-sm font-bold px-1
                                            ${isToday ? 'text-red-600 font-black text-lg' : 'text-slate-700'}
                                        `}>
                                            {dayNum}
                                        </span>
                                        <span className="hidden md:inline text-[10px] text-slate-400 font-normal ml-1">({shifts.day}/{shifts.night})</span>
                                    </div>
                                    
                                    {/* MOBILE VIEW: Side-by-side columns inside cell */}
                                    <div className="flex md:hidden flex-row justify-between items-stretch h-full gap-0.5">
                                        {timeSlots.map((slot, idx) => {
                                            const tillId = `T${slot.shift}`;
                                            const color = getShiftColor(tillId);
                                            const record = attendanceRecords.find(r => r.date === slot.dateRef && r.tillId === tillId);
                                            let realPeopleCount = record ? record.presentStaffIds.filter(id => {
                                                const member = staff.find(s => s.id === id);
                                                return member && isRealPerson(member.name);
                                            }).length : 0;

                                            return (
                                                <div 
                                                    key={`${dayNum}-mob-${idx}`} 
                                                    onClick={() => handleOpenEdit(slot.dateRef, tillId, record)}
                                                    className={`
                                                        flex flex-col items-center justify-center flex-1 rounded border
                                                        ${record ? 'bg-slate-50' : 'bg-transparent opacity-50'}
                                                    `}
                                                >
                                                    <span className="text-[7px] font-bold text-slate-400 leading-none mb-0.5">{slot.label.short}</span>
                                                    <div className="w-2 h-2 rounded-full my-0.5" style={{ backgroundColor: color }}></div>
                                                    <span className="text-[9px] font-black text-slate-700 leading-none">{record ? realPeopleCount : '-'}</span>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* DESKTOP VIEW: Stacked rows */}
                                    <div className="hidden md:flex flex-col gap-1.5">
                                        {timeSlots.map((slot, idx) => {
                                            const tillId = `T${slot.shift}`;
                                            const color = getShiftColor(tillId);
                                            const record = attendanceRecords.find(r => r.date === slot.dateRef && r.tillId === tillId);
                                            
                                            let realPeopleCount = 0;
                                            if (record) {
                                                realPeopleCount = record.presentStaffIds
                                                    .filter(id => {
                                                        const member = staff.find(s => s.id === id);
                                                        return member && isRealPerson(member.name);
                                                    }).length;
                                            }

                                            if (!record && !isSuperAdmin && readOnly) return null;

                                            return (
                                                <div 
                                                    key={`${dayNum}-${idx}`} 
                                                    onClick={() => handleOpenEdit(slot.dateRef, tillId, record)}
                                                    className={`
                                                        group relative flex items-center justify-between border rounded p-1 transition-all h-8
                                                        ${record ? 'bg-slate-50 hover:bg-white hover:shadow-md' : 'bg-transparent border-dashed border-slate-200 opacity-40 hover:opacity-100'}
                                                        ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-1 md:gap-2 w-full">
                                                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase w-3 md:w-auto md:min-w-[60px] text-center md:text-left">
                                                            <span className="md:hidden">{slot.label.short}</span>
                                                            <span className="hidden md:inline">{slot.label.full}</span>
                                                        </span>
                                                        
                                                        <div 
                                                            className="w-5 h-5 rounded-full shadow-sm flex items-center justify-center text-[10px] text-white font-normal shrink-0 leading-none pt-[1px]" 
                                                            style={{ backgroundColor: color }}
                                                        >
                                                            {slot.shift}
                                                        </div>
                                                        
                                                        <span className="text-xs font-bold text-slate-700 flex-grow text-right pr-1 leading-none">
                                                            {record ? realPeopleCount : (readOnly ? '-' : '+')}
                                                        </span>
                                                    </div>
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
