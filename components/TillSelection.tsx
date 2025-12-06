
import React, { useMemo } from 'react';
import { Till, TillColors } from '../types';
import { ModernChartIcon, LockIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void;
    tillColors: TillColors;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, tillColors }) => {
    
    // Generazione emoji cadenti
    const fallingEmojis = useMemo(() => {
        const emojis = ['☕', '🥐', '🍰', '🍹', '🍦', '🥪', '🍩', '🍪', '🥃', '🍷', '🍕', '🍔', '🍺', '🥨'];
        return Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            char: emojis[Math.floor(Math.random() * emojis.length)],
            left: `${Math.random() * 100}%`,
            duration: `${Math.random() * 5 + 5}s`,
            delay: `${Math.random() * 5}s`,
            size: `${Math.random() * 1 + 0.8}rem`
        }));
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative overflow-hidden">
            
            {/* SFONDO EMOJI CADENTI */}
            <div className="emoji-rain-container">
                {fallingEmojis.map(emoji => (
                    <span 
                        key={emoji.id} 
                        className="falling-emoji"
                        style={{ 
                            left: emoji.left, 
                            animationDuration: emoji.duration, 
                            animationDelay: emoji.delay,
                            fontSize: emoji.size
                        }}
                    >
                        {emoji.char}
                    </span>
                ))}
            </div>

            <div className="flex-grow flex flex-col items-center justify-center p-4 z-10 w-full max-w-6xl mx-auto">
                
                <div className="text-center mb-6">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-1 shadow-white drop-shadow-lg">
                            BAR VVF
                        </span>
                        <span className="text-3xl md:text-5xl font-extrabold text-primary tracking-tight shadow-white drop-shadow-md">
                            Montepulciano
                        </span>
                    </h1>
                    <p className="text-slate-600 font-medium text-lg mt-2 bg-white/80 px-4 py-1 rounded-full inline-block backdrop-blur-sm shadow-sm">
                        Scegli il turno per iniziare
                    </p>
                </div>

                {/* GRIGLIA PULSANTI CASSE - COMPATTA */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
                    {tills.map((till) => {
                        const bgColor = tillColors[till.id] || '#f97316';
                        
                        return (
                            <button
                                key={till.id}
                                onClick={() => onSelectTill(till.id)}
                                className="group relative bg-white rounded-2xl p-3 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col items-center justify-center h-40 border border-slate-100"
                            >
                                <div 
                                    className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner mb-2 transition-transform duration-300 group-hover:scale-105" 
                                    style={{ backgroundColor: bgColor }}
                                >
                                    <span className="text-5xl font-black text-white select-none">
                                        {till.shift.toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-base font-bold text-slate-700">
                                    {till.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                {/* MENU IN BASSO - COMPATTO */}
                <div className="flex gap-4 w-full justify-center">
                    <button
                        onClick={onSelectReports}
                        className="bg-white px-8 py-4 rounded-xl shadow-md hover:shadow-lg border border-slate-100 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <ModernChartIcon className="h-6 w-6 text-primary" />
                        <span>Report</span>
                    </button>
                    
                    <button
                        onClick={onSelectAdmin}
                        className="bg-white px-6 py-4 rounded-xl shadow-md hover:shadow-lg border border-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95"
                        title="Area Riservata"
                    >
                        <LockIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* FOOTER */}
            <div className="w-full bg-slate-800 text-slate-400 py-2 text-center text-[10px] md:text-xs z-20">
                <p>Gestionale Bar v1.2 | © 2024 Fabbrini M. | Tutti i diritti riservati</p>
            </div>
        </div>
    );
};

export default TillSelection;
