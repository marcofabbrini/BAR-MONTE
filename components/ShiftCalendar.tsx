
import React, { useState, useEffect } from 'react';
import { TillColors, ShiftSettings } from '../types';
import { BackArrowIcon, CalendarIcon } from './Icons';

interface ShiftCalendarProps {
    onGoBack: () => void;
    tillColors: TillColors;
    shiftSettings?: ShiftSettings;
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ onGoBack, tillColors, shiftSettings }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [highlightShift, setHighlightShift] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
    const [userSubGroup, setUserSubGroup] = useState<number | 'none'>('none');

    // ANCORA DINAMICA
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
        
        // VVF Standard: 12-24 12-48 (La notte è il turno precedente nella sequenza)
        let nightIndex = dayIndex - 1;
        if (nightIndex < 0) nightIndex += 4;

        return {
            day: shifts[dayIndex],
            night: shifts[nightIndex]
        };
    };

    // CALCOLO SOTTOGRUPPO DI SALTO (1-8)
    const getRestingSubGroup = (shift: string, date: Date) => {
        // Se non è configurato il salto, ritorna null
        if (!shiftSettings?.rcAnchorDate) return null;
        
        const anchorDate = new Date(shiftSettings.rcAnchorDate);
        anchorDate.setHours(12, 0, 0, 0);
        
        // Data corrente del calendario
        const effectiveDate = new Date(date);
        effectiveDate.setHours(12, 0, 0, 0);

        // Calcolo Base Date: quando questo specifico turno 'shift' sarebbe stato Giorno rispetto all'ancora.
        const shifts = ['A', 'B', 'C', 'D'];
        const shiftIndex = shifts.indexOf(shift.toUpperCase());
        const anchorShiftIndex = shifts.indexOf((shiftSettings.rcAnchorShift || 'A').toUpperCase());
        
        // Offset in giorni all'interno del ciclo di 4 giorni
        const shiftOffset = shiftIndex - anchorShiftIndex;
        
        // Proiettiamo la data di ancoraggio per allinearla allo shift corrente
        const baseDateForShift = new Date(anchorDate);
        baseDateForShift.setDate(baseDateForShift.getDate() + shiftOffset);
        
        // Calcoliamo la differenza giorni tra la data efficace e la data base proiettata
        const diffTime = effectiveDate.getTime() - baseDateForShift.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // Ogni 4 giorni scatta una nuova rotazione (A, B, C, D sono un blocco, poi si ricomincia con indice +1)
        const cycles = Math.floor(diffDays / 4);
        
        // Calcolo Gruppo (1-8)
        const anchorSubGroup = shiftSettings.rcAnchorSubGroup || 1;
        
        // Modulo 8 gestendo numeri negativi
        let currentSubGroup = (anchorSubGroup + cycles) % 8;
        if (currentSubGroup <= 0) currentSubGroup += 8;
        
        return currentSubGroup;
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const jumpToToday = () => setCurrentDate(new Date());

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    const defaultColors: {[key: string]: string} = {
        'TA': '#ef4444', // Red
        'TB': '#3b82f6', // Blue
        'TC': '#22c55e', // Green
        'TD': '#eab308'  // Yellow
    };

    const getShiftColor = (shift: string) => {
        const tillId = `T${shift}`;
        return tillColors[tillId] || defaultColors[tillId] || '#94a3b8';
    };

    // Helper per renderizzare la cella turno
    const renderShiftRow = (shift: string, type: 'day' | 'night', isDimmed: boolean, date: Date) => {
        
        const restingGroup = getRestingSubGroup(shift, date);
        
        // Determina se questo specifico utente è a riposo (solo se l'utente ha selezionato un gruppo)
        const isMyRest = userSubGroup !== 'none' && restingGroup === userSubGroup;
        
        const color = getShiftColor(shift);
        const icon = isMyRest ? '💤' : (type === 'day' ? '☀️' : '🌙');
        const labelText = isMyRest ? 'RIPOSO' : (type === 'day' ? 'Giorno' : 'Notte');
        
        // Colore Sfondo
        const bgColor = isMyRest 
            ? 'bg-purple-100 border-purple-200 ring-1 ring-purple-300' 
            : (type === 'day' ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-100/50 border-slate-100');

        const textColor = isMyRest ? 'text-purple-700' : 'text-slate-600';

        return (
            <div 
                className={`
                    rounded px-1 md:px-2 py-1 shadow-sm border 
                    flex items-center justify-between
                    transition-all duration-300
                    ${bgColor}
                    ${isDimmed ? 'opacity-10 grayscale' : 'opacity-100'}
                `}
            >
                {/* ICONA E TESTO SX */}
                <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm md:text-lg leading-none filter drop-shadow-sm">{icon}</span> 
                    <span className={`text-[10px] md:text-xs font-bold truncate hidden md:inline ${textColor}`}>
                        {labelText}
                    </span>
                </div>

                {/* INDICATORE DX */}
                <div className="flex items-center gap-1">
                    {/* Lettera Turno (A,B,C,D) */}
                    <div 
                        className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-sm"
                        style={{ backgroundColor: color }}
                    >
                        {shift}
                    </div>
                    
                    {/* Indicatore Salto (Solo Numero) - Mostrato SEMPRE se calcolato */}
                    {restingGroup && !isMyRest && (
                        <div className="bg-slate-200 text-slate-500 text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-300 min-w-[20px] text-center" title={`Gruppo a Riposo: ${restingGroup}`}>
                            {restingGroup}
                        </div>
                    )}
                    
                    {/* Indicatore se è il MIO riposo (Solo Numero) */}
                    {isMyRest && (
                        <div className="bg-purple-500 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-600 animate-pulse min-w-[20px] text-center">
                            {restingGroup}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
                <button
                    onClick={onGoBack}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    <BackArrowIcon className="h-5 w-5" />
                    <span className="font-bold text-sm hidden md:block">Indietro</span>
                </button>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6 text-primary" /> Turnario VVF
                </h1>
                <button 
                    onClick={jumpToToday}
                    className="text-xs font-bold text-primary bg-orange-50 px-3 py-1 rounded-full border border-orange-100 hover:bg-orange-100"
                >
                    Oggi
                </button>
            </header>

            <main className="flex-grow p-2 md:p-8 max-w-5xl mx-auto w-full">
                
                {/* Controlli e Filtri */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full">←</button>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase w-48 text-center">
                            {monthNames[currentDate.getMonth()]} <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span>
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full">→</button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex gap-2 items-center">
                            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mr-2">Evidenzia:</span>
                            {['A', 'B', 'C', 'D'].map(shift => (
                                <button
                                    key={shift}
                                    onClick={() => setHighlightShift(highlightShift === shift ? null : shift as any)}
                                    className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all shadow-sm ${highlightShift === shift ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                    style={{ backgroundColor: getShiftColor(shift), color: '#fff' }}
                                >
                                    {shift}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                             <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase">Il mio Gruppo:</span>
                             <select 
                                value={userSubGroup} 
                                onChange={(e) => setUserSubGroup(e.target.value === 'none' ? 'none' : parseInt(e.target.value))}
                                className="bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 outline-none"
                             >
                                <option value="none">Nessuno</option>
                                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                             </select>
                        </div>
                    </div>
                </div>

                {/* Griglia Calendario */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d, i) => (
                            <div key={i} className={`py-3 text-center text-[10px] md:text-xs font-black uppercase ${i===6 ? 'text-red-500' : 'text-slate-500'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-fr">
                        {Array.from({ length: startingBlankDays }).map((_, i) => (
                            <div key={`blank-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100 min-h-[80px] md:min-h-[100px]"></div>
                        ))}

                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                            const shifts = getShiftsForDate(date);
                            const isToday = new Date().toDateString() === date.toDateString();
                            
                            const isFilterActive = highlightShift !== null;
                            const isDayDimmed = isFilterActive && shifts.day !== highlightShift;
                            const isNightDimmed = isFilterActive && shifts.night !== highlightShift;

                            return (
                                <div 
                                    key={dayNum} 
                                    className={`
                                        relative border-b border-r border-slate-100 min-h-[80px] md:min-h-[100px] p-1 md:p-2 flex flex-col gap-1.5 transition-all duration-300
                                        ${isToday ? 'bg-green-50 border-green-400 ring-1 ring-inset ring-green-500 shadow-md z-10' : 'bg-white hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-xs md:text-sm font-bold mb-0.5 ${isToday ? 'text-green-800' : 'text-slate-700'}`}>{dayNum}</span>
                                        {isToday && <span className="text-[8px] md:text-[9px] font-black text-green-700 uppercase bg-green-200 px-1 rounded hidden md:inline">OGGI</span>}
                                    </div>
                                    
                                    {renderShiftRow(shifts.day, 'day', isDayDimmed, date)}
                                    {renderShiftRow(shifts.night, 'night', isNightDimmed, date)}
                                    
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-6 text-center text-xs text-slate-400">
                    <p>Schema turni perpetuo VVF 12-24 12-48 • Rotazione Salto 1-8</p>
                    {shiftSettings?.rcAnchorDate && <p className="mt-1 opacity-50">Calibrazione Salto: {new Date(shiftSettings.rcAnchorDate).toLocaleDateString()} = Turno {shiftSettings.rcAnchorShift} (Gruppo {shiftSettings.rcAnchorSubGroup})</p>}
                    {!shiftSettings?.rcAnchorDate && <p className="mt-1 text-orange-400 font-bold">Nota: Salto turno non calibrato. Configuralo nel pannello Admin.</p>}
                </div>
            </main>
        </div>
    );
};

export default ShiftCalendar;
