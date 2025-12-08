
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

    // ANCORA DINAMICA
    const getShiftsForDate = (date: Date) => {
        // Usa impostazioni dinamiche o fallback
        const anchorDateStr = shiftSettings?.anchorDate || new Date().toISOString().split('T')[0];
        const anchorShift = shiftSettings?.anchorShift || 'b';

        const anchorDate = new Date(anchorDateStr);
        anchorDate.setHours(12, 0, 0, 0); // Fix DST
        
        const targetDate = new Date(date);
        targetDate.setHours(12, 0, 0, 0); // Fix DST
        
        // Calcolo giorni di differenza
        const diffTime = targetDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Usa round
        
        // Sequenza
        const shifts = ['A', 'B', 'C', 'D'];
        
        // Trova l'indice del turno di ancoraggio
        const anchorIndex = shifts.indexOf(anchorShift.toUpperCase());

        let dayIndex = (anchorIndex + diffDays) % 4;
        if (dayIndex < 0) dayIndex += 4;
        
        // VVF Standard: Notte uguale al Giorno
        let nightIndex = dayIndex;

        return {
            day: shifts[dayIndex],
            night: shifts[nightIndex]
        };
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sun
    // Adjust for Monday start (Monday=0, Sunday=6)
    const startingBlankDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const jumpToToday = () => setCurrentDate(new Date());

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    // Colori di Default se non personalizzati
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

    // Helper per renderizzare la cella turno (Giorno o Notte) con layout responsive
    const renderShiftRow = (shift: string, type: 'day' | 'night', isDimmed: boolean) => {
        const color = getShiftColor(shift);
        const icon = type === 'day' ? '☀️' : '🌙';
        const labelText = type === 'day' ? 'Giorno' : 'Notte';
        const bgColor = type === 'day' ? 'bg-orange-50/50 border-orange-100' : 'bg-slate-100/50 border-slate-100';

        return (
            <div 
                className={`
                    rounded px-1 md:px-2 py-1 shadow-sm border 
                    flex items-center justify-center md:justify-between
                    transition-all duration-300
                    ${bgColor}
                    ${isDimmed ? 'opacity-10 grayscale' : 'opacity-100'}
                `}
            >
                {/* DESKTOP VIEW: Icona + Testo a sinistra, Badge a destra */}
                <div className="hidden md:flex items-center w-full justify-between">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <span className="text-lg leading-none">{icon}</span> {labelText}
                    </span>
                    <span 
                        className="font-black text-xs px-2 rounded text-white shadow-sm"
                        style={{ backgroundColor: color }}
                    >
                        {shift}
                    </span>
                </div>

                {/* MOBILE VIEW: Lettera Grande Colorata, Icona Apice */}
                <div className="md:hidden relative w-full h-7 flex items-center justify-center">
                    <span className="font-black text-xl leading-none" style={{ color: color }}>
                        {shift}
                    </span>
                    <span className="absolute -top-0.5 -right-0.5 text-[8px] opacity-60">
                        {icon}
                    </span>
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
                
                {/* Controlli e Legenda */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full">←</button>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase w-48 text-center">
                            {monthNames[currentDate.getMonth()]} <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span>
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full">→</button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase mr-2">Filtra Turno:</span>
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
                        {highlightShift && (
                             <button onClick={() => setHighlightShift(null)} className="ml-2 text-[10px] text-red-400 underline">Reset</button>
                        )}
                    </div>
                </div>

                {/* Griglia Calendario */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* Intestazione Giorni */}
                    <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d, i) => (
                            <div key={i} className={`py-3 text-center text-[10px] md:text-xs font-black uppercase ${i===6 ? 'text-red-500' : 'text-slate-500'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-fr">
                        {/* Giorni vuoti inizio mese */}
                        {Array.from({ length: startingBlankDays }).map((_, i) => (
                            <div key={`blank-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100 min-h-[80px] md:min-h-[100px]"></div>
                        ))}

                        {/* Giorni del mese */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                            const shifts = getShiftsForDate(date);
                            const isToday = new Date().toDateString() === date.toDateString();
                            
                            // Highlight Logic
                            const isFilterActive = highlightShift !== null;
                            const isDayDimmed = isFilterActive && shifts.day !== highlightShift;
                            const isNightDimmed = isFilterActive && shifts.night !== highlightShift;

                            return (
                                <div 
                                    key={dayNum} 
                                    className={`
                                        relative border-b border-r border-slate-100 min-h-[80px] md:min-h-[100px] p-1 md:p-2 flex flex-col gap-1 transition-all duration-300
                                        ${isToday ? 'bg-green-50 border-green-400 ring-1 ring-inset ring-green-500 shadow-md z-10' : 'bg-white hover:bg-slate-50'}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-xs md:text-sm font-bold mb-1 md:mb-2 ${isToday ? 'text-green-800' : 'text-slate-700'}`}>{dayNum}</span>
                                        {isToday && <span className="text-[8px] md:text-[9px] font-black text-green-700 uppercase bg-green-200 px-1 rounded hidden md:inline">OGGI</span>}
                                    </div>
                                    
                                    {/* Turno Giorno */}
                                    {renderShiftRow(shifts.day, 'day', isDayDimmed)}

                                    {/* Turno Notte */}
                                    {renderShiftRow(shifts.night, 'night', isNightDimmed)}
                                    
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-6 text-center text-xs text-slate-400">
                    <p>Schema turni perpetuo VVF 12-24 12-48</p>
                    {shiftSettings && <p className="mt-1 opacity-50">Calibrato su: {new Date(shiftSettings.anchorDate).toLocaleDateString()} = {shiftSettings.anchorShift.toUpperCase()}</p>}
                </div>
            </main>
        </div>
    );
};

export default ShiftCalendar;