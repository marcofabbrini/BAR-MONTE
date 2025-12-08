
import React, { useMemo } from 'react';
import { Till, TillColors, SeasonalityConfig } from '../types';
import { ModernChartIcon, LockIcon, TrophyIcon, CalendarIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void;
    onSelectGames: () => void;
    onSelectCalendar: () => void;
    tillColors: TillColors;
    seasonalityConfig?: SeasonalityConfig;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, onSelectGames, onSelectCalendar, tillColors, seasonalityConfig }) => {
    
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

    // Algoritmo per calcolare il turno attivo ADESSO
    const activeShift = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        
        // Se è tra mezzanotte e le 8:00, stiamo ancora "vivendo" il turno di notte iniziato ieri sera
        // Quindi per il calcolo VVF usiamo la data di ieri
        const calculationDate = new Date(now);
        if (hour < 8) {
            calculationDate.setDate(calculationDate.getDate() - 1);
        }

        const anchorDate = new Date('2024-01-01T00:00:00');
        const diffTime = calculationDate.getTime() - anchorDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        const shifts = ['a', 'b', 'c', 'd'];
        
        // 08:00 - 20:00 = Giorno 
        // 20:00 - 08:00 = Notte
        
        // OFFSET VVF (Sincronizzato: Oggi = B)
        const BASE_OFFSET_DAY = 3;
        const BASE_OFFSET_NIGHT = 2;

        let shiftIndex;
        if (hour >= 8 && hour < 20) {
            shiftIndex = (BASE_OFFSET_DAY + diffDays) % 4;
        } else {
            shiftIndex = (BASE_OFFSET_NIGHT + diffDays) % 4;
        }
        
        if (shiftIndex < 0) shiftIndex += 4;
        return shifts[shiftIndex];
    }, []);

    // Ordina le casse: prima quella attiva, poi le altre (per mobile/accessibilità, visualmente gestito da grid)
    const sortedTills = useMemo(() => {
        const active = tills.find(t => t.shift === activeShift);
        const others = tills.filter(t => t.shift !== activeShift);
        return active ? [active, ...others] : tills;
    }, [tills, activeShift]);

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

                <div className="text-center mb-8 md:mb-10">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-800 tracking-tighter mb-2 drop-shadow-sm transition-all">BAR VVF</span>
                        <span className="text-xl md:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight drop-shadow-sm transition-all">Montepulciano</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg md:text-2xl mt-4 px-6 py-2 rounded-full inline-block tracking-wide">
                        Benvenuto!
                    </p>
                </div>

                {/* GRIGLIA CASSE DINAMICA */}
                {/* 
                    Mobile: 2 colonne. Cassa attiva col-span-2 (riga intera). Altre 1x1.
                    Desktop: 3 colonne. Cassa attiva col-span-3 (riga intera). Altre 1x1 (3 in riga).
                */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-3/4 lg:w-2/3 mb-4 px-4 transition-all">
                    {sortedTills.map((till) => {
                        const bgColor = tillColors[till.id] || '#f97316';
                        const isActiveShift = till.shift === activeShift;

                        // Se è il turno attivo: full width e più alto
                        const gridClass = isActiveShift 
                            ? "col-span-2 md:col-span-3 h-40 md:h-64 shadow-xl border-primary/20 scale-[1.02] z-10 order-first" 
                            : "col-span-1 h-32 md:h-48 opacity-90 hover:opacity-100 hover:scale-[1.02]";

                        return (
                            <button 
                                key={till.id} 
                                onClick={() => onSelectTill(till.id)} 
                                className={`
                                    group relative bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl p-2 
                                    border border-slate-100 flex flex-col items-center justify-center w-full 
                                    transition-all duration-500 ease-out hover:shadow-2xl
                                    ${gridClass}
                                `}
                            >
                                {isActiveShift && (
                                    <span className="absolute top-4 right-4 bg-green-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full animate-pulse shadow-sm">
                                        IN SERVIZIO
                                    </span>
                                )}
                                
                                <div 
                                    className={`
                                        rounded-full flex items-center justify-center shadow-inner mb-2 md:mb-4 transition-transform duration-300 group-hover:scale-110
                                        ${isActiveShift ? 'w-20 h-20 md:w-32 md:h-32' : 'w-14 h-14 md:w-20 md:h-20'}
                                    `} 
                                    style={{ backgroundColor: bgColor }}
                                >
                                    <span className={`font-black text-white select-none ${isActiveShift ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl'}`}>
                                        {till.shift.toUpperCase()}
                                    </span>
                                </div>
                                <span className={`font-bold text-slate-700 leading-tight bg-slate-50 px-3 py-1 rounded-lg ${isActiveShift ? 'text-xl md:text-2xl' : 'text-xs md:text-lg'}`}>
                                    {till.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* GAMES HUB & CALENDAR - STILE SOBRIO (BIANCO/GRIGIO) */}
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-3/4 lg:w-2/3 px-4 mb-4 transition-all">
                    <button onClick={onSelectGames} className="flex-1 bg-slate-50/90 hover:bg-white text-slate-600 border border-slate-200 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-20 md:h-24 flex items-center justify-center gap-4 group backdrop-blur-sm">
                        <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform border border-slate-100">
                             <TrophyIcon className="h-6 w-6 md:h-8 md:w-8 text-slate-400 group-hover:text-yellow-500 transition-colors" />
                        </div>
                        <span className="text-sm md:text-xl font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition-colors">Games Hub</span>
                    </button>

                    <button onClick={onSelectCalendar} className="flex-1 bg-slate-50/90 hover:bg-white text-slate-600 border border-slate-200 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-20 md:h-24 flex items-center justify-center gap-4 group backdrop-blur-sm">
                         <div className="bg-white p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform border border-slate-100">
                             <CalendarIcon className="h-6 w-6 md:h-8 md:w-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-sm md:text-xl font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition-colors">Turnario VVF</span>
                    </button>
                </div>
                
                {/* MENU FUNZIONI - BOTTOM */}
                <div className="grid grid-cols-2 gap-4 w-full md:w-3/4 lg:w-2/3 px-4 transition-all">
                    <button onClick={onSelectReports} className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-md hover:shadow-xl border border-slate-100 text-slate-600 font-bold flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 h-20 md:h-32 lg:h-40 group">
                        <ModernChartIcon className="h-6 w-6 md:h-10 md:w-10 text-primary group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] md:text-base uppercase tracking-widest">Report</span>
                    </button>
                    
                    <button onClick={onSelectAdmin} className="bg-white/90 backdrop-blur-sm rounded-2xl md:rounded-3xl shadow-md hover:shadow-xl border border-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95 flex flex-col items-center justify-center gap-2 h-20 md:h-32 lg:h-40 group" title="Area Riservata">
                        <LockIcon className="h-6 w-6 md:h-10 md:w-10 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] md:text-base uppercase tracking-widest">Admin</span>
                    </button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 text-center z-50 shadow-lg">
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Gestionale Bar v3.0 | <span className="font-bold text-slate-500">Fabbrini M.</span></p>
            </div>
        </div>
    );
};

export default TillSelection;
