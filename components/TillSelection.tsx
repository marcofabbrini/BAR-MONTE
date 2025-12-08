
import React, { useMemo } from 'react';
import { Till, TillColors, SeasonalityConfig } from '../types';
import { ModernChartIcon, LockIcon, TicketIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void;
    onSelectTombola: () => void;
    tillColors: TillColors;
    seasonalityConfig?: SeasonalityConfig;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, onSelectTombola, tillColors, seasonalityConfig }) => {
    
    // Generazione emoji animate basata sulla config avanzata
    const animatedEmojis = useMemo(() => {
        if (!seasonalityConfig || seasonalityConfig.animationType === 'none' || !seasonalityConfig.emojis || seasonalityConfig.emojis.length === 0) {
            return [];
        }

        const count = 50; // Numero particelle
        const emojiList = seasonalityConfig.emojis;

        return Array.from({ length: count }).map((_, i) => {
            const animType = seasonalityConfig.animationType;
            let animationName = 'fall'; // Default snow
            if (animType === 'rain') animationName = 'rainfall';
            if (animType === 'float') animationName = 'float';

            return {
                id: i,
                char: emojiList[Math.floor(Math.random() * emojiList.length)],
                left: `${Math.random() * 100}%`,
                top: animType === 'float' ? `${Math.random() * 100}%` : '-10%', // Float parte sparso
                animation: `${animationName} ${Math.random() * 20 + 10}s linear infinite`,
                delay: `-${Math.random() * 20}s`, // Start immediately at random point
                size: `${Math.random() * 0.8 + 0.4}rem`,
                opacity: seasonalityConfig.opacity || 0.5
            };
        });
    }, [seasonalityConfig]);

    // Colore sfondo dinamico
    const backgroundColor = seasonalityConfig?.backgroundColor || '#f8fafc';

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden font-sans transition-colors duration-500" style={{ backgroundColor }}>
            
            {/* CONTAINER ANIMAZIONE */}
            {seasonalityConfig?.animationType !== 'none' && (
                <div className="emoji-rain-container pointer-events-none">
                    {animatedEmojis.map(emoji => (
                        <span 
                            key={emoji.id} 
                            className="falling-emoji absolute" 
                            style={{ 
                                left: emoji.left, 
                                top: emoji.top === '-10%' ? undefined : emoji.top, // Solo per float
                                animation: emoji.animation, 
                                animationDelay: emoji.delay, 
                                fontSize: emoji.size,
                                opacity: emoji.opacity,
                                '--target-opacity': emoji.opacity // Variabile CSS per i keyframes
                            } as React.CSSProperties}
                        >
                            {emoji.char}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex-grow flex flex-col items-center justify-center p-4 z-10 w-full max-w-7xl mx-auto pb-16">
                
                {/* LOGO E TITOLO - SCALABILI */}
                <div className="mb-4 md:mb-8 relative group transform transition-all duration-500">
                    <img src="/logo.png" alt="Logo" className="h-20 w-auto md:h-32 object-contain drop-shadow-lg hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>

                <div className="text-center mb-8 md:mb-12">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 tracking-tighter mb-2 drop-shadow-sm transition-all">BAR VVF</span>
                        <span className="text-xl md:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight drop-shadow-sm transition-all">Montepulciano</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-xs md:text-lg mt-3 bg-white/90 px-4 py-1.5 rounded-full inline-block backdrop-blur-sm shadow-sm border border-slate-100">
                        Seleziona la tua postazione
                    </p>
                </div>

                {/* GRIGLIA CASSE - LARGEZZA MAGGIORATA SU DESKTOP */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-3/4 lg:w-2/3 mb-6 px-4 transition-all">
                    {tills.map((till) => {
                        const bgColor = tillColors[till.id] || '#f97316';
                        return (
                            <button key={till.id} onClick={() => onSelectTill(till.id)} className="group relative bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 ease-out flex flex-col items-center justify-center w-full h-32 md:h-48 lg:h-56 border border-slate-100">
                                <div className="w-14 h-14 md:w-24 md:h-24 rounded-full flex items-center justify-center shadow-inner mb-2 md:mb-4 transition-transform duration-300 group-hover:scale-110" style={{ backgroundColor: bgColor }}>
                                    <span className="text-2xl md:text-4xl lg:text-5xl font-black text-white select-none">{till.shift.toUpperCase()}</span>
                                </div>
                                <span className="text-xs md:text-lg font-bold text-slate-700 leading-tight bg-slate-50 px-3 py-1 rounded-lg">{till.name}</span>
                            </button>
                        );
                    })}
                </div>
                
                {/* MENU FUNZIONI - GRID ADATTIVA */}
                <div className="grid grid-cols-3 gap-4 w-full md:w-3/4 lg:w-2/3 px-4 transition-all">
                    <button onClick={onSelectReports} className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-md hover:shadow-xl border border-slate-100 text-slate-600 font-bold flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 h-20 md:h-32 lg:h-40 group">
                        <ModernChartIcon className="h-6 w-6 md:h-10 md:w-10 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] md:text-base uppercase tracking-widest">Report</span>
                    </button>

                    <button onClick={onSelectTombola} className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-md hover:shadow-xl border border-slate-100 text-slate-600 font-bold flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 h-20 md:h-32 lg:h-40 group border-b-4 border-b-red-500">
                        <TicketIcon className="h-6 w-6 md:h-10 md:w-10 text-red-500 group-hover:scale-110 transition-transform animate-bounce-slow" />
                        <span className="text-[10px] md:text-base uppercase tracking-widest text-red-600">Tombola</span>
                    </button>
                    
                    <button onClick={onSelectAdmin} className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-md hover:shadow-xl border border-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 h-20 md:h-32 lg:h-40 group" title="Area Riservata">
                        <LockIcon className="h-6 w-6 md:h-10 md:w-10 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] md:text-base uppercase tracking-widest">Admin</span>
                    </button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 text-center z-50 shadow-lg">
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Gestionale Bar v2.9 | <span className="font-bold text-slate-500">Fabbrini M.</span></p>
            </div>
        </div>
    );
};

export default TillSelection;
