
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, StaffMember, TillColors, Shift, ShiftSettings } from '../types';
import { ClipboardIcon, CalendarIcon, TrashIcon, UsersIcon, CheckIcon, LockIcon, SaveIcon, BackArrowIcon, LockOpenIcon, GridIcon, SettingsIcon } from './Icons';

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
    // 3 MODALITÀ: 'matrix' (Nuova Tabella), 'calendar' (Vecchio Turnario), 'services' (Disattivato)
    const [viewMode, setViewMode] = useState<'matrix' | 'calendar' | 'services'>('matrix');
    const [matrixShift, setMatrixShift] = useState<Shift>('a');
    
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
        const anchorShift = 'b';

        // 20 Dicembre 2025 ore 12:00
        const anchorDate = new Date(2025, 11, 20, 12, 0, 0);
        
        const targetDate = new Date(date);
        targetDate.setHours(12, 0, 0, 0); 
        
        const diffTime = targetDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
        
        const shifts = ['A', 'B', 'C', 'D'];
        const anchorIndex = shifts.indexOf(anchorShift.toUpperCase());

        // Calcolo Turno Giorno (Rotazione Forward: A->B->C->D)
        let dayIndex = (anchorIndex + diffDays) % 4;
        if (dayIndex < 0) dayIndex += 4;
        
        // Logica Notte: Precedente (es. Giorno B -> Notte A)
        let nightIndex = (dayIndex - 1 + 4) % 4;
        
        // Smontante: È il turno che smonta alle 08:00 (cioè la Notte di IERI)
        let smontanteIndex = (dayIndex - 2 + 4) % 4; 

        return {
            day: shifts[dayIndex],
            night: shifts[nightIndex],
            smontante: shifts[smontanteIndex]
        };
    };

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

    // --- LOGICA MATRICE ---
    const matrixData = useMemo(() => {
        const shiftStaff = staff.filter(s => s.shift === matrixShift && isRealPerson(s.name)).sort((a,b) => a.name.localeCompare(b.name));
        const days = Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
            const shifts = getShiftsForDate(date);
            const isWorking = shifts.day === matrixShift.toUpperCase() || shifts.night === matrixShift.toUpperCase();
            return {
                date,
                dayNum: i + 1,
                shifts,
                isWorking
            };
        });
        return { shiftStaff, days };
    }, [staff, matrixShift, currentDate, daysInMonth]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden h-full flex flex-col relative min-h-screen md:min-h-0">
            
            {onGoBack && (
                <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center gap-2 shadow-sm">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800">
                        <BackArrowIcon className="h-5 w-5" /> Indietro
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 ml-4 hidden md:block">Gestione Presenze</h1>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800">Modifica Presenze</h3>
                                <p className="text-xs text-slate-500">{new Date(editingDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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

            {/* TOP BAR: MESE E VIEW SWITCHER */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4 sticky top-[60px] md:top-0 z-20 shadow-sm">
                
                {/* 3 PULSANTI DI SELEZIONE VIEW */}
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button 
                        onClick={() => setViewMode('matrix')}
                        className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-2 transition-all ${viewMode === 'matrix' ? 'bg-slate-800 text-white shadow-lg scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <GridIcon className="h-5 w-5" /> 
                        <span>Tabella Presenze</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('calendar')}
                        className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-slate-800 text-white shadow-lg scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                        <CalendarIcon className="h-5 w-5" /> 
                        <span>Turnario</span>
                    </button>
                    <button 
                        disabled
                        className="flex-1 md:flex-none px-4 py-3 rounded-xl text-xs font-bold flex flex-col md:flex-row items-center justify-center gap-2 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                    >
                        <SettingsIcon className="h-5 w-5" /> 
                        <span>Servizi</span>
                    </button>
                </div>

                {/* CONTROLLI MESE */}
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">←</button>
                    <h2 className="text-lg font-black text-slate-800 uppercase w-32 md:w-40 text-center leading-none">
                        {monthNames[currentDate.getMonth()]} <span className="text-xs text-slate-400 block font-medium">{currentDate.getFullYear()}</span>
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">→</button>
                </div>
            </div>

            <div className="flex-grow overflow-auto bg-white relative">
                
                {/* 1. MATRIX VIEW (NUOVA) */}
                {viewMode === 'matrix' && (
                    <div className="flex flex-col h-full">
                        {/* Selettore Turno per Matrice */}
                        <div className="flex justify-center gap-4 p-4 bg-slate-50 border-b border-slate-200 sticky top-0 left-0 z-10">
                            <span className="text-xs font-bold text-slate-500 uppercase self-center">Seleziona Turno:</span>
                            {(['a', 'b', 'c', 'd'] as Shift[]).map(shift => {
                                const tillId = `T${shift.toUpperCase()}`;
                                const color = getShiftColor(tillId);
                                return (
                                    <button 
                                        key={shift}
                                        onClick={() => setMatrixShift(shift)}
                                        className={`
                                            w-10 h-10 rounded-full font-black text-sm shadow-sm transition-all border-2
                                            ${matrixShift === shift ? 'scale-110 ring-2 ring-offset-2 ring-slate-300' : 'opacity-60 hover:opacity-100'}
                                        `}
                                        style={{ backgroundColor: color, color: 'white', borderColor: matrixShift === shift ? 'white' : 'transparent' }}
                                    >
                                        {shift.toUpperCase()}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex-grow overflow-auto relative">
                            <table className="w-full text-xs border-collapse">
                                <thead className="bg-slate-100 text-slate-600 sticky top-0 z-20 shadow-sm">
                                    <tr>
                                        <th className="p-3 text-left font-bold border-b border-r border-slate-200 min-w-[120px] sticky left-0 bg-slate-100 z-30">
                                            Nominativo
                                        </th>
                                        {matrixData.days.map(day => (
                                            <th 
                                                key={day.dayNum} 
                                                className={`
                                                    p-1 min-w-[35px] text-center border-b border-r border-slate-200 font-bold
                                                    ${day.isWorking ? 'bg-orange-100 text-orange-800' : ''}
                                                    ${[0,6].includes(day.date.getDay()) ? 'text-red-500' : ''}
                                                `}
                                            >
                                                <div className="flex flex-col">
                                                    <span>{day.dayNum}</span>
                                                    <span className="text-[9px] opacity-70 font-normal">{['D','L','M','M','G','V','S'][day.date.getDay()]}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixData.shiftStaff.length === 0 && (
                                        <tr><td colSpan={daysInMonth + 1} className="p-8 text-center text-slate-400 italic">Nessun dipendente in questo turno.</td></tr>
                                    )}
                                    {matrixData.shiftStaff.map(person => (
                                        <tr key={person.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-3 border-b border-r border-slate-200 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                {person.name}
                                            </td>
                                            {matrixData.days.map(day => {
                                                const tillId = `T${matrixShift.toUpperCase()}`;
                                                const dateStr = day.date.toISOString().split('T')[0];
                                                const record = attendanceRecords.find(r => r.date === dateStr && r.tillId === tillId);
                                                const isPresent = record?.presentStaffIds.includes(person.id);
                                                
                                                return (
                                                    <td 
                                                        key={`${person.id}-${day.dayNum}`} 
                                                        className={`
                                                            text-center border-b border-r border-slate-200 cursor-pointer transition-colors relative
                                                            ${day.isWorking ? 'bg-orange-50/30' : ''}
                                                            ${isPresent ? 'bg-green-50' : 'hover:bg-slate-100'}
                                                        `}
                                                        onClick={() => handleOpenEdit(dateStr, tillId, record)}
                                                        title={`${day.dayNum}/${currentDate.getMonth()+1} - Clicca per modificare`}
                                                    >
                                                        {isPresent && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 text-[10px] text-slate-400 text-center bg-slate-50 border-t border-slate-200">
                            Le colonne evidenziate indicano i giorni di servizio previsti per il turno {matrixShift.toUpperCase()}. Clicca su una casella per modificare le presenze del giorno.
                        </div>
                    </div>
                )}

                {/* 2. CALENDAR VIEW (VECCHIO TURNARIO) */}
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
                            
                            // Logica Giorno Corrente
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
                                    
                                    {/* DESKTOP VIEW: Stacked rows */}
                                    <div className="flex flex-col gap-1.5 h-full justify-evenly">
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

                                            // In readOnly mode (es. utente normale), mostra solo se c'è un record o se è admin
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

                {/* 3. SERVICES VIEW (PLACEHOLDER) */}
                {viewMode === 'services' && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10">
                        <SettingsIcon className="h-16 w-16 mb-4 opacity-50" />
                        <h3 className="text-xl font-bold">Sezione in Arrivo</h3>
                        <p>La gestione servizi sarà disponibile presto.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttendanceCalendar;
