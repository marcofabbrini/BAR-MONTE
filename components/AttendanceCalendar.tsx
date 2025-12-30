
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, StaffMember, TillColors, Shift, ShiftSettings, AttendanceStatus } from '../types';
import { ClipboardIcon, CalendarIcon, TrashIcon, UsersIcon, CheckIcon, LockIcon, SaveIcon, BackArrowIcon, LockOpenIcon, GridIcon, SettingsIcon, PrinterIcon, WhatsAppIcon, EditIcon } from './Icons';
import { GradeBadge } from './StaffManagement';
import { VVF_GRADES } from '../constants';
import { useBar } from '../contexts/BarContext';

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
    staff: StaffMember[];
    tillColors: TillColors;
    onDeleteRecord?: (id: string) => Promise<void>;
    onSaveAttendance?: (tillId: string, presentStaffIds: string[], dateOverride?: string, closedBy?: string, details?: Record<string, AttendanceStatus>, substitutionNames?: Record<string, string>) => Promise<void>;
    onReopenAttendance?: (id: string) => Promise<void>;
    isSuperAdmin?: boolean;
    shiftSettings?: ShiftSettings;
    readOnly?: boolean;
    onGoBack?: () => void;
}

// Configurazione Stati Presenza
const STATUS_CONFIG: Record<AttendanceStatus | 'absent', { label: string, short: string, color: string, textColor: string }> = {
    'present': { label: 'Presente', short: 'P', color: 'bg-green-100 border-green-300', textColor: 'text-green-800' },
    'sub1': { label: 'Sostituzione 1', short: 'S1', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-800' },
    'sub2': { label: 'Sostituzione 2', short: 'S2', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-800' },
    'sub3': { label: 'Sostituzione 3', short: 'S3', color: 'bg-blue-100 border-blue-300', textColor: 'text-blue-800' },
    'substitution': { label: 'Sost. (Legacy)', short: 'S', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-600' }, // Kept for legacy
    'mission': { label: 'Missione', short: 'M', color: 'bg-purple-100 border-purple-300', textColor: 'text-purple-800' },
    'sick': { label: 'Malattia', short: 'X', color: 'bg-red-100 border-red-300', textColor: 'text-red-800' },
    'leave': { label: 'Ferie', short: 'F', color: 'bg-yellow-100 border-yellow-300', textColor: 'text-yellow-800' },
    'rest': { label: 'Riposo Comp.', short: 'R', color: 'bg-slate-200 border-slate-400', textColor: 'text-slate-700' },
    'permit': { label: 'Permesso', short: 'H', color: 'bg-orange-100 border-orange-300', textColor: 'text-orange-800' },
    'absent': { label: 'Assente', short: '', color: 'bg-white border-slate-200', textColor: 'text-slate-400' }
};

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, staff, tillColors, onDeleteRecord, onSaveAttendance, onReopenAttendance, isSuperAdmin, shiftSettings, readOnly, onGoBack }) => {
    const { activeBarUser, availableRoles } = useBar();
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Check permission for Reset Month (Admin Level 3 or higher)
    const canResetMonth = useMemo(() => {
        if (!activeBarUser) return false;
        if (activeBarUser.role === 'super-admin') return true;
        const roleDef = availableRoles.find(r => r.id === activeBarUser.role);
        // Level 3 = Admin, Level 4 = Super Admin
        return roleDef ? roleDef.level >= 3 : false;
    }, [activeBarUser, availableRoles]);

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

    // Inizializza il turno visualizzato in base all'ora corrente
    const [matrixShift, setMatrixShift] = useState<Shift>(() => {
        const now = new Date();
        const hour = now.getHours();
        const shifts = getShiftsForDateSync(now);
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
    const [editingSubNames, setEditingSubNames] = useState<Record<string, string>>({});
    
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
        const shifts = getShiftsForDateSync(date);
        const allShifts = ['A', 'B', 'C', 'D'];
        const dayIdx = allShifts.indexOf(shifts.day);
        const smontanteIdx = (dayIdx - 2 + 4) % 4; // Notte precedente = Smontante oggi

        return {
            day: shifts.day,
            night: shifts.night,
            smontante: allShifts[smontanteIdx]
        };
    };

    const getRestingSubGroup = (shift: string, date: Date) => {
        const anchorDate = new Date(2025, 11, 11, 12, 0, 0); // 11 Dicembre 2025
        const anchorShiftStr = 'A';
        const anchorSubGroup = 1;

        const effectiveDate = new Date(date);
        effectiveDate.setHours(12, 0, 0, 0);

        const shifts = ['A', 'B', 'C', 'D'];
        const shiftIndex = shifts.indexOf(shift.toUpperCase());
        const anchorShiftIndex = shifts.indexOf(anchorShiftStr); // 0 (A)
        
        const shiftDayOffset = shiftIndex - anchorShiftIndex;
        const diffTime = effectiveDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
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

    // Define virtual substitution rows
    const virtualSubRows = [
        { id: 'sub_1', name: 'Sostituzione 1', isVirtual: true },
        { id: 'sub_2', name: 'Sostituzione 2', isVirtual: true },
        { id: 'sub_3', name: 'Sostituzione 3', isVirtual: true }
    ];

    const handleOpenEdit = (dateStr: string, tillId: string, currentRecord?: AttendanceRecord) => {
        if (readOnly) return; 
        
        setEditingDate(dateStr);
        setEditingTillId(tillId);
        setEditingRecord(currentRecord);
        
        const initialDetails: Record<string, AttendanceStatus | 'absent'> = {};
        const initialSubNames: Record<string, string> = currentRecord?.substitutionNames || {};
        
        const shift = tillId.replace('T', '').toLowerCase();
        const shiftStaff = staff.filter(s => s.shift === shift);
        
        // Add virtual rows to processing list with proper typing
        const virtualStaff = virtualSubRows.map(v => ({
            id: v.id,
            name: v.name,
            shift: shift as Shift,
            isVirtual: true,
            grade: undefined,
            rcSubGroup: undefined,
            icon: undefined,
            photoUrl: undefined
        }));

        const allRows = [...shiftStaff, ...virtualStaff];
        const rcGroup = getRestingSubGroup(shift, new Date(dateStr));

        allRows.forEach(s => {
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
                    // Virtual rows default to absent
                    if ((s as any).isVirtual) {
                        initialDetails[s.id] = 'absent';
                    } else {
                        // Real staff logic
                        if (s.rcSubGroup === rcGroup) {
                            initialDetails[s.id] = 'rest';
                        } else {
                            initialDetails[s.id] = 'absent';
                        }
                    }
                }
            }
        });
        
        setEditingDetails(initialDetails);
        setEditingSubNames(initialSubNames);
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

    const updateSubName = (id: string, name: string) => {
        setEditingSubNames(prev => ({
            ...prev,
            [id]: name
        }));
    };

    const bulkSetStatus = (status: AttendanceStatus | 'absent') => {
        const newDetails = { ...editingDetails };
        // Recalculate RC group for the date being edited to ensure accuracy
        const shift = editingTillId.replace('T', '').toLowerCase();
        const rcGroup = getRestingSubGroup(shift, new Date(editingDate));

        editingStaffList.forEach(member => {
            if (member.name.toLowerCase().includes('cassa')) return;

            const isVirtual = (member as any).isVirtual;

            if (status === 'present') {
                if (isVirtual) {
                    // Substitutions should remain ABSENT by default when clicking "All Present"
                    newDetails[member.id] = 'absent';
                } else if (member.rcSubGroup === rcGroup) {
                    // Staff on REST should remain on REST
                    newDetails[member.id] = 'rest';
                } else {
                    newDetails[member.id] = 'present';
                }
            } else {
                // If clearing (setting to absent), clear everyone
                newDetails[member.id] = status;
            }
        });
        setEditingDetails(newDetails);
    };

    const saveEditing = async (shouldValidate: boolean = true) => {
        if (!onSaveAttendance) return;
        
        const presentIds: string[] = [];
        const finalDetails: Record<string, AttendanceStatus> = {};

        Object.entries(editingDetails).forEach(([id, status]) => {
            finalDetails[id] = status as AttendanceStatus;
            if (status !== 'absent') {
                presentIds.push(id);
            }
        });

        // Use active user name for validation (closing), otherwise keep existing or undefined
        const closingUser = shouldValidate ? (activeBarUser?.name || 'Utente') : (editingRecord?.closedBy ? editingRecord.closedBy : undefined);

        await onSaveAttendance(
            editingTillId, 
            presentIds, 
            editingDate, 
            closingUser,
            finalDetails,
            editingSubNames
        );
        setIsEditModalOpen(false);
    };

    const handleBulkDeleteMonth = async () => {
        if(!canResetMonth || !onDeleteRecord) return;
        if(!window.confirm(`Sei sicuro di voler ELIMINARE TUTTE le presenze del mese di ${monthNames[currentDate.getMonth()]} per il turno ${matrixShift.toUpperCase()}? Questa operazione è irreversibile.`)) return;

        const tillId = `T${matrixShift.toUpperCase()}`;
        const targetMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        const recordsToDelete = attendanceRecords.filter(r => {
            return r.date.startsWith(targetMonthStr) && r.tillId === tillId;
        });

        if(recordsToDelete.length === 0) return alert("Nessun record trovato per questo mese/turno.");

        let count = 0;
        for(const r of recordsToDelete) {
            await onDeleteRecord(r.id);
            count++;
        }
        alert(`${count} record eliminati.`);
    };

    const getStaffRank = (gradeId?: string) => {
        if(!gradeId) return -1;
        const index = VVF_GRADES.findIndex(g => g.id === gradeId);
        return index !== -1 ? index : -1;
    };

    const editingStaffList = useMemo(() => {
        if (!editingTillId) return [];
        const shift = editingTillId.replace('T', '').toLowerCase();
        
        // 1. Regular Staff sorted
        const regulars = staff.filter(s => s.shift === shift).sort((a,b) => {
             const aIsCassa = a.name.toLowerCase().includes('cassa');
             const bIsCassa = b.name.toLowerCase().includes('cassa');
             if (aIsCassa && !bIsCassa) return -1;
             if (!aIsCassa && bIsCassa) return 1;
             
             const rankA = getStaffRank(a.grade);
             const rankB = getStaffRank(b.grade);
             if (rankA !== rankB) return rankB - rankA;

             return a.name.localeCompare(b.name);
        });

        // 2. Append Virtual Rows with required properties
        return [...regulars, ...virtualSubRows.map(v => ({ 
            id: v.id, 
            name: v.name, 
            shift: shift as Shift, 
            grade: 'Guest', 
            isVirtual: true,
            rcSubGroup: undefined,
            icon: undefined,
            photoUrl: undefined
        }))];
    }, [staff, editingTillId]);

    const matrixData = useMemo(() => {
        const realStaff = staff
            .filter(s => s.shift === matrixShift && isRealPerson(s.name))
            .sort((a,b) => {
                const rankA = getStaffRank(a.grade);
                const rankB = getStaffRank(b.grade);
                if (rankA !== rankB) return rankB - rankA;
                return a.name.localeCompare(b.name);
            });
        
        // Append 3 virtual rows to matrix with required properties
        const fullRows = [
            ...realStaff,
            ...virtualSubRows.map(v => ({ 
                id: v.id, 
                name: v.name, 
                shift: matrixShift, 
                grade: 'Guest', 
                isVirtual: true, 
                rcSubGroup: undefined,
                icon: undefined,
                photoUrl: undefined
            }))
        ];

        const days = Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
            const shifts = getShiftsForDate(date);
            const isWorking = shifts.day === matrixShift.toUpperCase() || shifts.night === matrixShift.toUpperCase();
            
            // Verifica se oggi è il giorno "smontante" per il turno selezionato
            const isSmontante = shifts.smontante === matrixShift.toUpperCase();
            
            const rcGroup = getRestingSubGroup(matrixShift, date);

            return {
                date,
                dayNum: i + 1,
                shifts,
                isWorking,
                isSmontante,
                rcGroup
            };
        });
        return { shiftStaff: fullRows, days };
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

    const handlePrint = () => {
        window.print();
    };

    const handleWhatsAppShare = () => {
        const monthStr = monthNames[currentDate.getMonth()];
        const yearStr = currentDate.getFullYear();
        let message = `*Report Presenze - Turno ${matrixShift.toUpperCase()} - ${monthStr} ${yearStr}*\n\n`;
        
        matrixData.shiftStaff.forEach(person => {
            if ((person as any).isVirtual) return; // Skip virtual rows in simple summary
            let presentCount = 0;
            let leaveCount = 0;
            
            matrixData.days.forEach(day => {
                // SKIP SMONTANTE DAYS from count
                if (day.isSmontante) return;

                const tillId = `T${matrixShift.toUpperCase()}`;
                const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                const record = attendanceRecords.find(r => r.date === dateStr && r.tillId === tillId);
                const status = getStatusForCell(person.id, record);
                
                if (status === 'present' || status === 'sub1' || status === 'sub2' || status === 'sub3' || status === 'substitution' || status === 'mission') presentCount++;
                if (status === 'leave' || status === 'sick') leaveCount++;
            });
            
            message += `👤 *${person.name}*: ${presentCount} Presenze\n`;
        });
        
        message += `\nGenerato da Bar VVF Montepulciano`;
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-300 overflow-hidden h-full flex flex-col relative min-h-screen md:min-h-0 print:border-none print:shadow-none">
            
            {onGoBack && (
                <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center gap-2 shadow-sm print:hidden">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-slate-500 hover:text-slate-800">
                        <BackArrowIcon className="h-5 w-5" /> Indietro
                    </button>
                    <h1 className="text-xl font-bold text-slate-800 ml-4 hidden md:block">Gestione Presenze</h1>
                    
                    {canResetMonth && (
                        <button 
                            onClick={handleBulkDeleteMonth}
                            className="ml-auto bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-red-200"
                            title="Elimina tutte le presenze di questo mese per il turno selezionato"
                        >
                            <TrashIcon className="h-4 w-4" /> Reset Mese
                        </button>
                    )}
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
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

                        <div className="px-4 pt-3 flex gap-2">
                            <button onClick={() => bulkSetStatus('present')} className="flex-1 bg-green-100 text-green-700 text-xs font-bold py-2 rounded-lg hover:bg-green-200 border border-green-200 transition-colors">
                                Tutti Presenti
                            </button>
                            <button onClick={() => bulkSetStatus('absent')} className="flex-1 bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-lg hover:bg-slate-200 border border-slate-200 transition-colors">
                                Tutti Assenti
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-grow">
                            <div className="space-y-2">
                                {editingStaffList.map(member => {
                                    const currentStatus = editingDetails[member.id] || 'absent';
                                    const isCassa = member.name.toLowerCase().includes('cassa');
                                    const isVirtual = (member as any).isVirtual;
                                    
                                    return (
                                        <div 
                                            key={member.id} 
                                            className={`
                                                flex flex-col p-2 rounded-lg border transition-all
                                                ${currentStatus !== 'absent' ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl overflow-hidden border border-slate-200">
                                                            {member.photoUrl ? <img src={member.photoUrl} className="w-full h-full object-cover" /> : (member.icon || '👤')}
                                                        </div>
                                                        {member.grade && !isVirtual && <div className="absolute -top-1 -right-1 scale-75"><GradeBadge grade={member.grade} /></div>}
                                                    </div>
                                                    
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-700 block">
                                                            {member.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-bold">
                                                            {isVirtual ? 'Riga Aggiuntiva' : `${member.grade ? `${member.grade} - ` : ''}${member.shift.toUpperCase()}${member.rcSubGroup || ''}`}
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
                                                        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'substitution').map(([key, conf]) => (
                                                            <option key={key} value={key}>{conf.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            
                                            {/* Input nome personalizzato per righe virtuali SE presenti */}
                                            {isVirtual && currentStatus !== 'absent' && (
                                                <div className="mt-2 pl-12 pr-1">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Nome Sostituto..." 
                                                        value={editingSubNames[member.id] || ''}
                                                        onChange={(e) => updateSubName(member.id, e.target.value)}
                                                        className="w-full text-xs border-b border-slate-300 bg-transparent focus:border-slate-500 outline-none py-1 placeholder-slate-400"
                                                    />
                                                </div>
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
                                    <button onClick={() => saveEditing(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-blue-700 ml-auto">
                                        <SaveIcon className="h-4 w-4" /> Aggiorna Modifiche
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full">
                                    <button onClick={() => saveEditing(true)} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-green-700 uppercase tracking-wide">
                                        <CheckIcon className="h-4 w-4" /> Conferma e Valida Presenze
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TOP BAR: MESE E CONTROLLI */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center bg-slate-50 gap-4 sticky top-[60px] md:top-0 z-20 shadow-sm print:hidden">
                
                {/* AZIONI RAPIDE */}
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={handlePrint}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-slate-700 shadow-sm"
                        title="Stampa Report Mese"
                    >
                        <PrinterIcon className="h-4 w-4" /> <span className="hidden md:inline">Stampa</span>
                    </button>
                    <button 
                        onClick={handleWhatsAppShare}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-green-700 shadow-sm"
                        title="Condividi su WhatsApp"
                    >
                        <WhatsAppIcon className="h-4 w-4" /> <span className="hidden md:inline">Condividi</span>
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

            <div className="flex-grow overflow-auto bg-white relative print:w-full print:h-auto print:overflow-visible">
                
                <div className="flex flex-col h-full">
                    {/* Selettore Turno */}
                    <div className="flex justify-center gap-4 p-4 bg-slate-50 border-b border-slate-200 sticky top-0 left-0 z-10 print:hidden">
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

                    <div className="flex-grow overflow-auto relative print:overflow-visible">
                        <table className="w-full text-xs border-collapse print:w-full">
                            <thead className="bg-slate-100 text-slate-600 sticky top-0 z-20 shadow-sm print:static">
                                <tr>
                                    <th className="p-3 text-left font-bold border-b border-r border-slate-200 sticky left-0 bg-slate-100 z-40 whitespace-nowrap w-auto print:static">
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
                                                        ? '!border-l-2 !border-r-2 !border-red-500 !border-b-0 !border-t-2 rounded-t-2xl bg-red-50/10 z-20 shadow-[0_-5px_10px_-5px_rgba(220,38,38,0.2)] print:border-slate-200 print:bg-transparent print:shadow-none' 
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
                            </thead>
                            <tbody>
                                {matrixData.shiftStaff.map((person, personIndex) => {
                                    const isVirtual = (person as any).isVirtual;
                                    return (
                                    <tr key={person.id} className="hover:bg-slate-50 transition-colors group print:hover:bg-transparent">
                                        <td className="p-3 border-b border-r border-slate-200 font-medium text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-30 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-auto print:static print:bg-white print:shadow-none">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-12 h-12 flex-shrink-0">
                                                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-xs border border-slate-200 shadow-sm">
                                                        {person.photoUrl ? (
                                                            <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-xl">{person.icon || '👤'}</span>
                                                        )}
                                                    </div>
                                                    {person.grade && !isVirtual && (
                                                        <div className="absolute -top-1.5 -right-1.5 z-20 transform translate-x-1/4">
                                                            <GradeBadge grade={person.grade} />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-col">
                                                    <span className={`font-bold text-sm leading-tight ${isVirtual ? 'text-slate-500 italic' : ''}`}>{person.name}</span>
                                                    {!isVirtual && <span className="text-[10px] text-slate-400 font-mono">
                                                        {person.shift.toUpperCase()}{person.rcSubGroup || ''}
                                                    </span>}
                                                </div>
                                            </div>
                                        </td>
                                        {matrixData.days.map(day => {
                                            const tillId = `T${matrixShift.toUpperCase()}`;
                                            const dateStr = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                                            
                                            const record = attendanceRecords.find(r => r.date === dateStr && r.tillId === tillId);
                                            const status = getStatusForCell(person.id, record);
                                            const isToday = dateStr === todayStr;
                                            
                                            // Virtual row custom name check
                                            const customName = record?.substitutionNames?.[person.id];
                                            
                                            const isJumpDay = !isVirtual && day.rcGroup === person.rcSubGroup;
                                            const isShiftActiveDay = day.shifts.day === matrixShift.toUpperCase() || day.shifts.night === matrixShift.toUpperCase();
                                            const isLastRow = personIndex === matrixData.shiftStaff.length - 1;

                                            // FORZA VISUALIZZAZIONE VUOTA SE È IL GIORNO SMONTANTE
                                            // (I dati esistono, ma non vengono mostrati per evitare doppi conteggi visivi)
                                            const effectiveStatus = day.isSmontante ? null : status;

                                            return (
                                                <td 
                                                    key={`${person.id}-${day.dayNum}`} 
                                                    className={`
                                                        text-center border-r border-slate-200 transition-colors relative
                                                        ${day.isWorking ? 'bg-orange-50/30' : ''}
                                                        ${effectiveStatus ? 'bg-white' : 'hover:bg-slate-100'}
                                                        ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                                                        ${isJumpDay && !effectiveStatus ? 'bg-slate-200/50' : ''}
                                                        ${isToday 
                                                            ? `!border-l-2 !border-r-2 !border-red-500 bg-red-50/10 z-20 !border-b-0 shadow-[inset_0_0_10px_rgba(220,38,38,0.05)] ${isLastRow ? '!border-b-2 rounded-b-2xl shadow-[0_5px_10px_-5px_rgba(220,38,38,0.2)]' : ''} print:border-slate-200 print:bg-transparent print:shadow-none` 
                                                            : 'border-b'}
                                                    `}
                                                    onClick={() => handleOpenEdit(dateStr, tillId, record)}
                                                    title={`${day.dayNum}/${currentDate.getMonth()+1} - ${person.name}`}
                                                >
                                                    {(isJumpDay && !effectiveStatus && isShiftActiveDay) ? (
                                                        <div className="absolute inset-0 flex items-center justify-center p-1 opacity-60">
                                                            <div className="w-full h-full flex items-center justify-center rounded font-bold text-[9px] bg-slate-300 text-slate-600 border border-slate-400">
                                                                {matrixShift.toUpperCase()}{person.rcSubGroup}
                                                            </div>
                                                        </div>
                                                    ) : effectiveStatus && (
                                                        <div className="absolute inset-0 flex items-center justify-center p-1">
                                                            <div 
                                                                className={`
                                                                    w-full h-full flex flex-col items-center justify-center rounded font-bold text-[10px] uppercase shadow-sm border overflow-hidden
                                                                    ${STATUS_CONFIG[effectiveStatus].color} ${STATUS_CONFIG[effectiveStatus].textColor}
                                                                    ${record?.closedAt ? 'ring-1 ring-black/10' : ''}
                                                                `}
                                                            >
                                                                <span>{STATUS_CONFIG[effectiveStatus].short}</span>
                                                                {customName && <span className="text-[6px] leading-tight truncate w-full px-0.5 lowercase capitalize">{customName.split(' ')[0]}</span>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                    {/* Legend */}
                    <div className="p-2 text-[10px] text-slate-400 text-center bg-slate-50 border-t border-slate-200 flex justify-center gap-4 flex-wrap print:hidden">
                        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'absent' && k !== 'substitution').map(([key, conf]) => (
                            <span key={key} className="flex items-center gap-1">
                                <span className={`w-3 h-3 rounded border text-[8px] flex items-center justify-center ${conf.color} ${conf.textColor}`}>{conf.short}</span>
                                <span>{conf.label}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCalendar;
