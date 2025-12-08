
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, StaffMember, TillColors } from '../types';
import { ClipboardIcon, CalendarIcon, TrashIcon } from './Icons';

interface AttendanceCalendarProps {
    attendanceRecords: AttendanceRecord[];
    staff: StaffMember[];
    tillColors: TillColors;
    onDeleteRecord?: (id: string) => Promise<void>;
}

const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ attendanceRecords, staff, tillColors, onDeleteRecord }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'calendar' | 'report'>('calendar');

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    // Colori Default se non presenti
    const defaultColors: {[key: string]: string} = {
        'TA': '#ef4444', // Red
        'TB': '#3b82f6', // Blue
        'TC': '#22c55e', // Green
        'TD': '#eab308'  // Yellow
    };

    const getShiftColor = (tillId: string) => {
        return tillColors[tillId] || defaultColors[tillId] || '#94a3b8';
    };

    // --- LOGICA REPORT ---
    const attendanceStats = useMemo(() => {
        const stats: Record<string, { name: string, count: number, shift: string, icon: string }> = {};
        
        attendanceRecords.forEach(record => {
            // Filtro per Anno e Mese corrente se necessario, o globale
            const recDate = new Date(record.date);
            if (recDate.getMonth() === currentDate.getMonth() && recDate.getFullYear() === currentDate.getFullYear()) {
                record.presentStaffIds.forEach(staffId => {
                    const member = staff.find(s => s.id === staffId);
                    if (member) {
                        if (!stats[staffId]) {
                            stats[staffId] = { 
                                name: member.name, 
                                count: 0, 
                                shift: member.shift,
                                icon: member.icon || '👤' 
                            };
                        }
                        stats[staffId].count++;
                    }
                });
            }
        });

        return Object.values(stats).sort((a,b) => b.count - a.count);
    }, [attendanceRecords, staff, currentDate]);

    const handleDelete = async (id: string) => {
        if (!onDeleteRecord) return;
        if (window.confirm("Vuoi resettare le presenze per questo turno specifico?")) {
            await onDeleteRecord(id);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            
            {/* Header */}
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
                        <ClipboardIcon className="h-4 w-4" /> Report Mensile
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

            {/* Content */}
            <div className="flex-grow overflow-auto p-4">
                
                {viewMode === 'calendar' && (
                    <div className="grid grid-cols-7 border-l border-t border-slate-200">
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                            <div key={d} className="p-2 text-center text-xs font-bold bg-slate-100 border-r border-b border-slate-200 text-slate-500 uppercase">{d}</div>
                        ))}

                        {Array.from({ length: startingBlankDays }).map((_, i) => (
                            <div key={`blank-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-b border-slate-200"></div>
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum).toISOString().split('T')[0];
                            const dayRecords = attendanceRecords.filter(r => r.date === dateStr);
                            const isToday = new Date().toISOString().split('T')[0] === dateStr;

                            return (
                                <div key={dayNum} className={`min-h-[120px] p-2 border-r border-b border-slate-200 flex flex-col gap-1 ${isToday ? 'bg-indigo-50/30' : 'bg-white'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-sm font-bold ${isToday ? 'text-indigo-600 bg-indigo-100 px-1.5 rounded' : 'text-slate-700'}`}>{dayNum}</span>
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] scrollbar-thin">
                                        {['TA', 'TB', 'TC', 'TD'].map(tillId => {
                                            const record = dayRecords.find(r => r.tillId === tillId);
                                            if (!record || record.presentStaffIds.length === 0) return null;

                                            const color = getShiftColor(tillId);
                                            const presentNames = record.presentStaffIds
                                                .map(id => staff.find(s => s.id === id)?.name.split(' ')[0]) // Solo nome
                                                .filter(Boolean)
                                                .join(', ');

                                            return (
                                                <div key={tillId} className="group relative text-[10px] bg-slate-50 border rounded p-1 pr-5 transition-all hover:bg-white hover:shadow-sm" style={{ borderLeftColor: color, borderLeftWidth: '3px' }}>
                                                    <span className="font-bold" style={{ color: color }}>Turno {tillId.replace('T', '')}:</span>
                                                    <span className="text-slate-600 ml-1">{presentNames}</span>
                                                    {onDeleteRecord && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                                                            className="absolute top-0.5 right-0.5 text-slate-300 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors hidden group-hover:block"
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
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 text-center">
                            <h3 className="text-indigo-900 font-bold text-lg">Presenze Totali - {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                            <p className="text-indigo-600 text-xs mt-1">Conteggio basato sui registri di fine turno</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attendanceStats.map((stat, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">{stat.icon}</div>
                                        <div>
                                            <p className="font-bold text-slate-800">{stat.name}</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase">Turno {stat.shift.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-100 text-indigo-700 font-black text-xl w-10 h-10 flex items-center justify-center rounded-full">
                                        {stat.count}
                                    </div>
                                </div>
                            ))}
                            {attendanceStats.length === 0 && (
                                <div className="col-span-full text-center py-10 text-slate-400">Nessuna presenza registrata per questo mese.</div>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AttendanceCalendar;
