
import React, { useState, useEffect } from 'react';
import { TillColors } from '../types';
import { BackArrowIcon, CalendarIcon } from './Icons';

interface ShiftCalendarProps {
    onGoBack: () => void;
    tillColors: TillColors;
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ onGoBack, tillColors }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [highlightShift, setHighlightShift] = useState<'A' | 'B' | 'C' | 'D' | null>(null);

    // ANCORA PER IL CALCOLO
    // Riferimento VVF: 1 Gennaio 2024
    const getShiftsForDate = (date: Date) => {
        const anchorDate = new Date('2024-01-01T00:00:00');
        
        // Calcolo giorni di differenza
        const diffTime = date.getTime() - anchorDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // Sequenza
        const shifts = ['A', 'B', 'C', 'D'];
        
        // OFFSET VVF (Sincronizzato con Home Page: Oggi = B)
        const BASE_OFFSET_DAY = 3;
        const BASE_OFFSET_NIGHT = 2;

        let dayIndex = (BASE_OFFSET_DAY + diffDays) % 4;
        if (dayIndex < 0) dayIndex += 4;
        
        let nightIndex = (BASE_OFFSET_NIGHT + diffDays) % 4;
        if (nightIndex < 0) nightIndex += 4;

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

            <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full">
                
                {/* Controlli e Legenda */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full">←</button>
                        <h2 className="text-2xl font-black text-slate-800 uppercase w-48 text-center">
                            {monthNames[currentDate.getMonth()]} <span className="text-slate-400 font-medium">{currentDate.getFullYear()}</span>
                        </h2>
                        <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full">→</button>
                    </div>

                    <div className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase mr-2">Evidenzia:</span>
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
                </div>

                {/* Griglia Calendario */}
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {/* Intestazione Giorni */}
                    <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200">
                        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((d, i) => (
                            <div key={i} className={`py-3 text-center text-xs font-black uppercase ${i===6 ? 'text-red-500' : 'text-slate-500'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 auto-rows-fr">
                        {/* Giorni vuoti inizio mese */}
                        {Array.from({ length: startingBlankDays }).map((_, i) => (
                            <div key={`blank-${i}`} className="bg-slate-50/50 border-b border-r border-slate-100 min-h-[100px]"></div>
                        ))}

                        {/* Giorni del mese */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const dayNum = i + 1;
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
                            const shifts = getShiftsForDate(date);
                            const isToday = new Date().toDateString() === date.toDateString();
                            
                            // Highlight Logic
                            const isDayHighlighted = highlightShift && shifts.day === highlightShift;
                            const isNightHighlighted = highlightShift && shifts.night === highlightShift;
                            const isDimmed = highlightShift && !isDayHighlighted && !isNightHighlighted;

                            return (
                                <div 
                                    key={dayNum} 
                                    className={`
                                        relative border-b border-r border-slate-100 min-h-[100px] p-2 flex flex-col gap-1 transition-all duration-300
                                        ${isToday ? 'bg-green-100 border-green-400 ring-2 ring-inset ring-green-500 shadow-md z-10' : 'bg-white hover:bg-slate-50'}
                                        ${isDimmed ? 'opacity-40 grayscale-[50%]' : ''}
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-bold mb-2 ${isToday ? 'text-green-800' : 'text-slate-700'}`}>{dayNum}</span>
                                        {isToday && <span className="text-[9px] font-black text-green-700 uppercase bg-green-200 px-1 rounded">OGGI</span>}
                                    </div>
                                    
                                    {/* Turno Giorno */}
                                    <div className="flex items-center justify-between bg-slate-50 rounded px-2 py-1 mb-1 shadow-sm border border-slate-100">
                                        <span className="text-lg leading-none">☀️</span>
                                        <span 
                                            className="font-black text-xs px-2 rounded text-white shadow-sm"
                                            style={{ backgroundColor: getShiftColor(shifts.day) }}
                                        >
                                            {shifts.day}
                                        </span>
                                    </div>

                                    {/* Turno Notte */}
                                    <div className="flex items-center justify-between bg-slate-900/5 rounded px-2 py-1 shadow-sm border border-slate-200">
                                        <span className="text-lg leading-none">🌙</span>
                                        <span 
                                            className="font-black text-xs px-2 rounded text-white shadow-sm"
                                            style={{ backgroundColor: getShiftColor(shifts.night) }}
                                        >
                                            {shifts.night}
                                        </span>
                                    </div>
                                    
                                    {/* Indicatore "Riposo" per highlight */}
                                    {highlightShift && !isDayHighlighted && !isNightHighlighted && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none bg-white/80">
                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded shadow transform -rotate-12 border border-green-200">RIPOSO</span>
                                        </div>
                                    )}

                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="mt-6 text-center text-xs text-slate-400">
                    <p>Schema turni: 12/24 - 12/48. Sequenza ciclica 4 giorni.</p>
                </div>
            </main>
        </div>
    );
};

export default ShiftCalendar;
