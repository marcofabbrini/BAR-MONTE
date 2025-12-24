
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, StaffMember, TillColors, Shift, ShiftSettings, AttendanceStatus } from '../types';
import { ClipboardIcon, CalendarIcon, TrashIcon, UsersIcon, CheckIcon, LockIcon, SaveIcon, BackArrowIcon, LockOpenIcon, GridIcon, SettingsIcon } from './Icons';
import { GradeBadge } from './StaffManagement';

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
    staff: StaffMember[];
    tillColors: TillColors;
    onDeleteRecord?: (id: string) => Promise<void>;
    onSaveAttendance?: (tillId: string, presentStaffIds: string[], dateOverride?: string, closedBy?: string, details?: Record<string, AttendanceStatus>) => Promise<void>;
    onReopenAttendance?: (id: string) => Promise<void>;
    isSuperAdmin?: boolean;
    shiftSettings?: ShiftSettings;
    readOnly?: boolean;
    onGoBack?: () => void;
}

// Configurazione Stati Presenza
const STATUS_CONFIG: Record<AttendanceStatus | 'absent', { label: string, short: string, color: string, textColor: string }> = {
    'present': { label: 'Presente', short: 'P', color: 'bg-green-100 border-green-300', textColor: 'text-green-800' },
    'substitution': { label: 'Sostituzione', short: 'S', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-800' },
    'mission': { label: 'Missione', short: 'M', color: 'bg-purple-100 border-purple-300', textColor: 'text-purple-800' },
    'sick': { label: 'Malattia', short: 'X', color: 'bg-red-100 border-red-300', textColor: 'text-red-800' },
    'leave': { label: 'Ferie', short: 'F', color: 'bg-yellow-100 border-yellow-300', textColor: 'text-yellow-800' },
    'rest': { label: 'Riposo Comp.', short: 'R', color: 'bg-slate-200 border-slate-400', textColor: 'text-slate-700' },
    'permit': { label: 'Permesso', short: 'H', color: 'bg-orange-100 border-orange-300', textColor: 'text-orange-800' },
    'absent': { label: 'Assente', short: '', color: 'bg-white border-slate-200', textColor: 'text-slate-400' }
};

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, staff, tillColors, onDeleteRecord, onSaveAttendance, onReopenAttendance, isSuperAdmin, shiftSettings, readOnly, onGoBack }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Funzione helper spostata qui per essere usata nell'inizializzazione
    const getShiftsForDateSync = (date: Date) => {
        const anchorShift = 'b';
        const anchorDate = new Date(2025, 11, 20, 12, 0, 0);
        const targetDate = new Date(date);
        targetDate.setHours(12, 0, 0, 0);
        const diffTime = targetDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const shifts = ['A', 'B', 'C', 'D'];
        const anchorIndex = shifts.indexOf(anchorShift.toUpperCase());
        let dayIndex = (anchorIndex + diffDays) % 4;
        if (dayIndex < 0) dayIndex += 4;
        let nightIndex = (dayIndex - 1 + 4) % 4;
        return { day: shifts[dayIndex], night: shifts[nightIndex] };
    };

    // 3 MODALITÀ: 'matrix' (Nuova Tabella), 'calendar' (Vecchio Turnario), 'services' (Disattivato)
    const [viewMode, setViewMode] = useState<'matrix' | 'calendar' | 'services'>('matrix');
    
    // Inizializza il turno visualizzato in base all'ora corrente
    const [matrixShift, setMatrixShift] = useState<Shift>(() => {
        const now = new Date();
        const hour = now.getHours();
        const shifts = getShiftsForDateSync(now);
        
        // Logica: Se siamo tra le 08:00 e le 20:00 -> Mostra Giorno.
        // Se siamo tra le 20:00 e le 08:00 -> Mostra Notte.
        if (hour >= 8 && hour < 20) {
            return shifts.day.toLowerCase() as Shift;
        } else {
            return shifts.night.toLowerCase() as Shift;
        }
    });
    
    // EDITING STATE
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingDate, setEditingDate] = useState<string>('');
    const [editingTillId, setEditingTillId] = useState<string>('');
    
    // Mappa locale per editing: { staffId: status }
    const [editingDetails, setEditingDetails] = useState<Record<string, AttendanceStatus | 'absent'>>({});
    
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

    // Manteniamo la funzione originale per compatibilità nel render, anche se la logica è duplicata in getShiftsForDateSync
    const getShiftsForDate = (date: Date) => {
        const shifts = getShiftsForDateSync(date);
        const allShifts = ['A', 'B', 'C', 'D'];
        const dayIdx = allShifts.indexOf(shifts.day);
        const smontanteIdx = (dayIdx - 2 + 4) % 4;

        return {
            day: shifts.day,
            night: shifts.night,
            smontante: allShifts[smontanteIdx]
        };
    };

    // Helper per calcolare chi è in salto (riposo compensativo) per un dato giorno e turno
    // LOGICA HARDCODED VVF: 11 Dicembre 2025 = Turno A, Salto 1
    const getRestingSubGroup = (shift: string, date: Date) => {
        const anchorDate = new Date(2025, 11, 11, 12, 0, 0); // 11 Dicembre 2025
        const anchorShiftStr = 'A';
        const anchorSubGroup = 1;

        const effectiveDate = new Date(date);
        effectiveDate.setHours(12, 0, 0, 0);

        const shifts = ['A', 'B', 'C', 'D'];
        const shiftIndex = shifts.indexOf(shift.toUpperCase());
        const anchorShiftIndex = shifts.indexOf(anchorShiftStr); // 0 (A)
        
        // Calcolo Offset Turno (Rotazione A->B->C->D)
        // Se cerco B (1) rispetto ad A (0), sono +1 giorno avanti nel ciclo naturale.
        const shiftDayOffset = shiftIndex - anchorShiftIndex;
        
        // Calcola differenza giorni totali dall'ancora
        const diffTime = effectiveDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Sottrai l'offset del turno per allineare il ciclo temporale al turno specifico
        const adjustedDays = diffDays - shiftDayOffset;
        
        const cycles = Math.floor(adjustedDays / 4);
        
        let currentSubGroup = (anchorSubGroup + cycles) % 8;
        if (currentSubGroup <= 0) currentSubGroup += 8;
        
        return currentSubGroup;
    };

    const handleReopen = async (id: string) => {
        if (!onReopenAttendance || readOnly) return;
        if (window.confirm("Vuoi RIAPRIRE questo turno? Il record delle presenze rimarrà salvato, ma il turno risulterà APERTO.")) {
            await onReopenAttendance(id);
            setIsEditModalOpen(false);
        }
    };

    const handleOpenEdit = (dateStr: string, tillId: string, currentRecord?: AttendanceRecord) => {
        if (readOnly) return;
        setEditingDate(dateStr);
        setEditingTillId(tillId);
        setEditingRecord(currentRecord);
        
        const initialDetails: Record<string, AttendanceStatus | 'absent'> = {};
        
        const shift = tillId.replace('T', '').toLowerCase();
        const shiftStaff = staff.filter(s => s.shift === shift);
        const rcGroup = getRestingSubGroup(shift, new Date(dateStr));

        shiftStaff.forEach(s => {
            if (currentRecord) {
                if (currentRecord.attendanceDetails && currentRecord.attendanceDetails[s.id]) {
                    initialDetails[s.id] = currentRecord.attendanceDetails[s.id] as AttendanceStatus;
                } else if (currentRecord.presentStaffIds.includes(s.id)) {
                    initialDetails[s.id] = 'present';
                } else {
                    initialDetails[s.id] = 'absent';
                }
            } else {
                if (s.name.toLowerCase().includes('cassa')) {
                    initialDetails[s.id] = 'present';
                } else {
                    if (s.rcSubGroup === rcGroup) {
                        initialDetails[s.id] = 'rest';
                    } else {
                        initialDetails[s.id] = 'absent';
                    }
                }
            }
        });
        
        setEditingDetails(initialDetails);
        setIsEditModalOpen(true);
    };

    const updateStaffStatus = (id: string, status: AttendanceStatus | 'absent') => {
        const member = staff.find(s => s.id === id);
        if (member && member.name.toLowerCase().includes('cassa')) return;

        setEditingDetails(prev => ({
            ...prev,
            [id]: status
        }));
    };

    const saveEditing = async (shouldValidate: boolean = false) => {
        if (!onSaveAttendance) return;
        
        const presentIds: string[] = [];
        const finalDetails: Record<string, AttendanceStatus> = {};

        Object.entries(editingDetails).forEach(([id, status]) => {
            if (status !== 'absent') {
                presentIds.push(id);
                finalDetails[id] = status as AttendanceStatus;
            }
        });

        const user = editingRecord?.closedBy || 'Admin';
        const closingUser = shouldValidate ? user : (editingRecord?.closedBy ? editingRecord.closedBy : undefined);

        await onSaveAttendance(
            editingTillId, 
            presentIds, 
            editingDate, 
            closingUser,
            finalDetails
        );
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

    const matrixData = useMemo(() => {
        const shiftStaff = staff
            .filter(s => s.shift === matrixShift && isRealPerson(s.name))
            .sort((a,b) => a.name.localeCompare(b.name));

        const days = Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
            const shifts = getShiftsForDate(date);
            const isWorking = shifts.day === matrixShift.toUpperCase() || shifts.night === matrixShift.toUpperCase();
            
            const rcGroup = getRestingSubGroup(matrixShift, date);

            return {
                date,
                dayNum: i + 1,
                shifts,
                isWorking,
                rcGroup
            };
        });
        return { shiftStaff, days };
    }, [staff, matrixShift, currentDate, daysInMonth, shiftSettings]);

    const getStatusForCell = (personId: string, record?: AttendanceRecord) => {
        if (!record) return null;
        if (record.attendanceDetails && record.attendanceDetails[personId]) {
            return record.attendanceDetails[personId];
        }
        if (record.presentStaffIds.includes(personId)) {
            return 'present';
        }
        return null;
    };

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

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
                    {/* ... (Modal content remains same) ... */}
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800">Modifica Presenze</h3>
                                <p className="text-xs text-slate-500">{new Date(editingDate).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-2xl leading-none">&times;</button>
                        </div>
                        
                        {editingRecord && editingRecord.closedAt && (
                            <div className="bg-green-50 p-3 border-b border-green-100 text-xs text-green-800 flex flex-col gap-1">
                                <div className="font-bold flex items-center gap-1"><CheckIcon className="h-3 w-3" /> Turno Chiuso e Validato</div>
                                <div>Da: <b>{editingRecord.closedBy || 'Sconosciuto'}</b></div>
                                <div>Il: {new Date(editingRecord.closedAt).toLocaleString()}</div>
                            </div>
                        )}

                        <div className="p-4 overflow-y-auto flex-grow">
                            <div className="space-y-2">
                                {editingStaffList.map(member => {
                                    const currentStatus = editingDetails[member.id] || 'absent';
                                    const isCassa = member.name.toLowerCase().includes('cassa');
                                    
                                    return (
                                        <div 
                                            key={member.id} 
                                            className={`
                                                flex items-center justify-between p-3 rounded-lg border transition-all
                                                ${currentStatus !== 'absent' ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">{member.icon || '👤'}</div>
                                                <div>
                                                    <span className="text-sm font-bold text-slate-700 block">
                                                        {member.grade ? `${member.grade} ` : ''}{member.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {member.shift.toUpperCase()}{member.rcSubGroup || ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {isCassa ? (
                                                <span className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                                    <LockIcon className="h-3 w-3"/> Presente
                                                </span>
                                            ) : (
                                                <select 
                                                    value={currentStatus}
                                                    onChange={(e) => updateStaffStatus(member.id, e.target.value as AttendanceStatus | 'absent')}
                                                    className={`
                                                        border rounded-md px-2 py-1.5 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-300
                                                        ${currentStatus !== 'absent' ? STATUS_CONFIG[currentStatus].textColor : 'text-slate-400'}
                                                        ${currentStatus !== 'absent' ? 'bg-white shadow-sm' : 'bg-slate-50'}
                                                    `}
                                                >
                                                    {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                                                        <option key={key} value={key}>{conf.label}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 flex flex-col gap-2 bg-slate-50">
                            {editingRecord?.closedAt ? (
                                <div className="flex justify-between w-full">
                                    {isSuperAdmin && onReopenAttendance && (
                                        <button onClick={() => handleReopen(editingRecord.id)} className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm border border-red-200">
                                            <LockOpenIcon className="h-4 w-4" /> RIAPRI TURNO
                                        </button>
                                    )}
                                    <button onClick={() => saveEditing(false)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-blue-700 ml-auto">
                                        <SaveIcon className="h-4 w-4" /> Aggiorna Modifiche
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2 w-full">
                                    <button onClick={() => saveEditing(false)} className="flex-1 bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-300">
                                        Salva Bozze
                                    </button>
                                    <button onClick={() => saveEditing(true)} className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-green-700 uppercase tracking-wide">
                                        <CheckIcon className="h-4 w-4" /> Conferma e Valida
                                    </button>
                                </div>
                            )}
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
                                    {/* RIGA 1: NUMERI GIORNO */}
                                    <tr>
                                        <th className="p-3 text-left font-bold border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-30 whitespace-nowrap w-auto">
                                            Nominativo
                                        </th>
                                        {matrixData.days.map(day => {
                                            const dayStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                                            const isToday = dayStr === todayStr;
                                            return (
                                                <th 
                                                    key={day.dayNum} 
                                                    className={`
                                                        p-1 min-w-[35px] text-center border-r border-slate-200 font-bold relative
                                                        ${day.isWorking ? 'bg-orange-100 text-orange-800' : ''}
                                                        ${[0,6].includes(day.date.getDay()) ? 'text-red-500' : ''}
                                                        ${isToday 
                                                            ? '!border-l-2 !border-r-2 !border-red-500 !border-b-0 !border-t-2 rounded-t-[3px] bg-red-50/10 z-20 shadow-[0_-5px_10px_-5px_rgba(220,38,38,0.2)]' 
                                                            : 'border-b'}
                                                    `}
                                                >
                                                    <div className="flex flex-col relative z-10">
                                                        <span>{day.dayNum}</span>
                                                        <span className="text-[9px] opacity-70 font-normal">{['D','L','M','M','G','V','S'][day.date.getDay()]}</span>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                    {/* RIGA 2: RIPOSI COMPENSATIVI (Salto) */}
                                    <tr className="bg-slate-200 text-slate-600 text-[10px]">
                                        <th className="p-2 text-right font-bold border-b border-r border-slate-300 sticky left-0 bg-slate-200 z-30 italic">
                                            Salto (Riposo Comp.):
                                        </th>
                                        {matrixData.days.map(day => {
                                            const dayStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                                            const isToday = dayStr === todayStr;
                                            // Mostra il salto SOLO se è un giorno di turno attivo (Giorno o Notte)
                                            const isShiftActiveDay = day.shifts.day === matrixShift.toUpperCase() || day.shifts.night === matrixShift.toUpperCase();
                                            
                                            return (
                                                <th 
                                                    key={`rc-${day.dayNum}`} 
                                                    className={`
                                                        p-1 text-center border-r border-slate-300 font-black text-purple-700 bg-purple-50
                                                        ${isToday 
                                                            ? '!border-l-2 !border-r-2 !border-red-500 !border-b-0 bg-red-50/10 z-20 shadow-[inset_0_0_10px_rgba(220,38,38,0.05)]' 
                                                            : 'border-b'}
                                                    `}
                                                >
                                                    {(day.rcGroup && isShiftActiveDay) ? `${matrixShift.toUpperCase()}${day.rcGroup}` : '-'}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {matrixData.shiftStaff.length === 0 && (
                                        <tr><td colSpan={daysInMonth + 1} className="p-8 text-center text-slate-400 italic">Nessun dipendente in questo turno.</td></tr>
                                    )}
                                    {matrixData.shiftStaff.map((person, personIndex) => (
                                        <tr key={person.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-3 border-b border-r border-slate-200 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-auto">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar & Grade Container */}
                                                    <div className="relative w-8 h-8 flex-shrink-0">
                                                        <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-xs border border-slate-200 shadow-sm">
                                                            {person.photoUrl ? (
                                                                <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                person.icon || '👤'
                                                            )}
                                                        </div>
                                                        {/* Badge Grado con CSS per posizione corretta */}
                                                        <div className="absolute -top-[6px] -right-[6px] scale-[0.8] origin-center z-10">
                                                            <GradeBadge grade={person.grade} />
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm leading-tight">{person.name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {person.shift.toUpperCase()}{person.rcSubGroup || ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            {matrixData.days.map(day => {
                                                const tillId = `T${matrixShift.toUpperCase()}`;
                                                const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                                                
                                                const record = attendanceRecords.find(r => r.date === dateStr && r.tillId === tillId);
                                                
                                                const status = getStatusForCell(person.id, record);
                                                const isToday = dateStr === todayStr;
                                                
                                                // Logica Salto Turno Personale
                                                const isJumpDay = day.rcGroup === person.rcSubGroup;
                                                const isShiftActiveDay = day.shifts.day === matrixShift.toUpperCase() || day.shifts.night === matrixShift.toUpperCase();
                                                
                                                // È l'ultima riga?
                                                const isLastRow = personIndex === matrixData.shiftStaff.length - 1;

                                                return (
                                                    <td 
                                                        key={`${person.id}-${day.dayNum}`} 
                                                        className={`
                                                            text-center border-r border-slate-200 transition-colors relative
                                                            ${day.isWorking ? 'bg-orange-50/30' : ''}
                                                            ${status ? 'bg-white' : 'hover:bg-slate-100'}
                                                            ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                                                            ${isJumpDay && !status ? 'bg-slate-200/50' : ''}
                                                            ${isToday 
                                                                ? `!border-l-2 !border-r-2 !border-red-500 bg-red-50/10 z-20 !border-b-0 shadow-[inset_0_0_10px_rgba(220,38,38,0.05)] ${isLastRow ? '!border-b-2 rounded-b-[3px] shadow-[0_5px_10px_-5px_rgba(220,38,38,0.2)]' : ''}` 
                                                                : 'border-b'}
                                                        `}
                                                        onClick={() => handleOpenEdit(dateStr, tillId, record)}
                                                        title={`${day.dayNum}/${currentDate.getMonth()+1} - ${person.name}`}
                                                    >
                                                        {/* Visualizza Salto (Es. B2) se è giorno di salto E non c'è status esplicito E siamo in un giorno lavorativo */}
                                                        {(isJumpDay && !status && isShiftActiveDay) ? (
                                                            <div className="absolute inset-0 flex items-center justify-center p-1 opacity-60">
                                                                <div className="w-full h-full flex items-center justify-center rounded font-bold text-[9px] bg-slate-300 text-slate-600 border border-slate-400">
                                                                    {matrixShift.toUpperCase()}{person.rcSubGroup}
                                                                </div>
                                                            </div>
                                                        ) : status && (
                                                            <div className="absolute inset-0 flex items-center justify-center p-1">
                                                                <div 
                                                                    className={`
                                                                        w-full h-full flex items-center justify-center rounded font-bold text-[10px] uppercase shadow-sm border
                                                                        ${STATUS_CONFIG[status].color} ${STATUS_CONFIG[status].textColor}
                                                                        ${record?.closedAt ? 'ring-1 ring-black/10' : ''}
                                                                    `}
                                                                >
                                                                    {STATUS_CONFIG[status].short}
                                                                </div>
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
                        {/* Footer Status Legend */}
                        <div className="p-2 text-[10px] text-slate-400 text-center bg-slate-50 border-t border-slate-200 flex justify-center gap-4 flex-wrap">
                            {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'absent').map(([key, conf]) => (
                                <span key={key} className="flex items-center gap-1">
                                    <span className={`w-3 h-3 rounded border text-[8px] flex items-center justify-center ${conf.color} ${conf.textColor}`}>{conf.short}</span>
                                    <span>{conf.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. CALENDAR VIEW (VECCHIO TURNARIO) ... */}
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
                            const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
                            const shifts = getShiftsForDate(dateObj);
                            
                            const isToday = dateStr === todayStr;

                            const prevDate = new Date(dateObj);
                            prevDate.setDate(prevDate.getDate() - 1);
                            const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
                            
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
                                                // Conteggio semplificato: chiunque NON sia assente e NON sia cassa
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
                                                        ${record?.closedAt ? 'border-solid border-slate-300' : ''}
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
                                                        
                                                        <span className="text-xs font-bold text-slate-700 flex-grow text-right pr-1 leading-none flex items-center justify-end gap-1">
                                                            {record && record.closedAt && <LockIcon className="h-2 w-2 text-slate-400"/>}
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
