
import React, { useState, useEffect } from 'react';
import { TillColors, ShiftSettings } from '../types';
import { BackArrowIcon, CalendarIcon } from './Icons';
import { useBar } from '../contexts/BarContext';

interface ShiftCalendarProps {
    onGoBack: () => void;
    tillColors: TillColors;
    shiftSettings?: ShiftSettings;
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ onGoBack, tillColors, shiftSettings }) => {
    const { getNow } = useBar();
    const [currentDate, setCurrentDate] = useState(getNow());
    const [highlightShift, setHighlightShift] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
    const [userSubGroup, setUserSubGroup] = useState<number | 'none'>('none');

    // ANCORA DINAMICA BLINDATA: 20 Dicembre 2025 = B (FORWARD ROTATION)
    const getShiftsForDate = (date: Date) => {
        const anchorShift = 'b';

        // Ancoraggio: 20 Dicembre 2025 ore 12:00
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
        
        // Logica Notte: È il turno precedente (es. Giorno B -> Notte A)
        let nightIndex = (dayIndex - 1 + 4) % 4;

        return {
            day: shifts[dayIndex],
            night: shifts[nightIndex]
        };
    };

    // CALCOLO SOTTOGRUPPO DI SALTO (1-8)
    const getRestingSubGroup = (shift: string, date: Date) => {
        // ANCORAGGIO FISSO: 12 Dicembre 2025 = Turno B, Salto 1
        // Allineamento VVF 12-24 / 12-48
        // 12 Dicembre: Giorno B (Gruppo 1 salta)
        const anchorDate = new Date(2025, 11, 12, 12, 0, 0); // 12 Dicembre 2025
        const anchorShiftStr = 'B';
        const anchorSubGroup = 1;

        const effectiveDate = new Date(date);
        effectiveDate.setHours(12, 0, 0, 0);

        const shifts = ['A', 'B', 'C', 'D'];
        const shiftIndex = shifts.indexOf(shift.toUpperCase());
        const anchorShiftIndex = shifts.indexOf(anchorShiftStr); // 1 (B)
        
        // Calcolo Offset Turno (Rotazione A->B->C->D)
        const shiftDayOffset = shiftIndex - anchorShiftIndex;
        
        // Data in cui il turno richiesto era "Giorno" nel ciclo dell'ancora
        const baseDateForShift = new Date(anchorDate);
        baseDateForShift.setDate(baseDateForShift.getDate() + shiftDayOffset);
        
        // Giorni passati dalla data base
        const diffTime = effectiveDate.getTime() - baseDateForShift.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        const cycles = Math.floor(diffDays / 4);
        
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

    const jumpToToday = () => setCurrentDate(getNow());

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
        const isMyRest = userSubGroup !== 'none' && restingGroup === userSubGroup;
        const color = getShiftColor(shift);
        const iconChar = isMyRest ? '💤' : (type === 'day' ? '☀️' : '🌙');
        // Hide text on mobile
        const labelText = isMyRest ? 'RIPOSO' : (type === 'day' ? 'Giorno' : 'Notte');
        
        // Colore Sfondo
        const bgColor = isMyRest 
            ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-300' 
            : (type === 'day' ? 'bg-orange-50/30 border-orange-100' : 'bg-slate-50 border-slate-100');

        const textColor = isMyRest ? 'text-purple-700' : 'text-slate-500';

        return (
            <div 
                className={`
                    rounded px-1.5 py-1 shadow-sm border 
                    flex flex-col md:flex-row items-center md:justify-between justify-center
                    transition-all duration-300 min-h-[40px] gap-1 md:gap-0
                    ${bgColor}
                    ${isDimmed ? 'opacity-30 grayscale' : 'opacity-100'}
                `}
            >
                {/* TESTO SX (Hidden on mobile) */}
                <span className={`hidden md:block text-[10px] md:text-xs font-bold truncate mr-1 ${textColor}`}>
                    {labelText}
                </span>

                {/* INDICATORE DX (STACK VERTICALE SU MOBILE) */}
                <div className="flex flex-col items-center justify-center gap-0.5 relative">
                    
                    {/* Contenitore Pallino con Icona Apice */}
                    <div className="relative">
                        {/* Icona Apice (Sole/Luna) con ombra */}
                        <div className="absolute -top-2 -right-2 text-[10px] filter drop-shadow-md z-10 leading-none">
                            {iconChar}
                        </div>

                        {/* Pallino Turno */}
                        <div 
                            className="w-6 h-6 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-xs font-black text-white shadow-sm ring-1 ring-white/50"
                            style={{ backgroundColor: color }}
                        >
                            {shift}
                        </div>
                    </div>
                    
                    {/* Numero Salto (Sotto il pallino) */}
                    {(restingGroup || isMyRest) && (
                        <div className={`
                            text-[8px] md:text-[9px] font-black px-1.5 py-px rounded border min-w-[16px] text-center leading-tight shadow-sm mt-0.5
                            ${isMyRest ? 'bg-purple-500 text-white border-purple-600' : 'bg-white text-slate-400 border-slate-200'}
                        `}>
                            {restingGroup} {/* Solo numero, niente "S-" */}
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
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
                            <div key={d} className="p-2 text-center text-xs font-bold text-slate-500 uppercase">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {Array.from({ length: startingBlankDays }).map((_, i) => (
                            <div key={`blank-${i}`} className="p-2 border-b border-r border-slate-100 bg-slate-50/50"></div>
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                            const isToday = dateObj.toDateString() === getNow().toDateString();
                            const shifts = getShiftsForDate(dateObj);

                            // Logica per Dimming (Opacità) se c'è un turno evidenziato
                            // Se highlightShift è attivo:
                            // - Mostra pieno se il turno è presente in Day o Night
                            // - Dimma se non c'è
                            const isDayDimmed = highlightShift && shifts.day !== highlightShift;
                            const isNightDimmed = highlightShift && shifts.night !== highlightShift;

                            return (
                                <div 
                                    key={dayNum} 
                                    className={`
                                        min-h-[100px] md:min-h-[140px] p-1 md:p-2 border-b border-r border-slate-200 flex flex-col gap-1 transition-colors
                                        ${isToday ? 'bg-orange-50 ring-inset ring-2 ring-orange-400 z-10' : 'bg-white hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-xs md:text-sm font-bold ${isToday ? 'text-orange-600' : 'text-slate-700'}`}>{dayNum}</span>
                                        {isToday && <span className="text-[10px] text-orange-500 font-black animate-pulse">OGGI</span>}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 h-full justify-center">
                                        {/* GIORNO (08:00 - 20:00) */}
                                        {renderShiftRow(shifts.day, 'day', !!isDayDimmed, dateObj)}

                                        {/* NOTTE (20:00 - 08:00) */}
                                        {renderShiftRow(shifts.night, 'night', !!isNightDimmed, dateObj)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-6 text-center text-xs text-slate-400">
                    <p>Legenda: ☀️ Turno Diurno (08:00-20:00) | 🌙 Turno Notturno (20:00-08:00)</p>
                    <p className="mt-1">I numeri sotto i pallini indicano il Gruppo di Salto (Riposo Compensativo).</p>
                </div>
            </main>
        </div>
    );
};

export default ShiftCalendar;
