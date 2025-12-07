import React, { useMemo } from 'react';
import { Till, TillColors, SeasonalityConfig } from '../types';
import { ModernChartIcon, LockIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void;
    onSelectTombola: () => void;
    tillColors: TillColors;
    seasonalityConfig?: SeasonalityConfig;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, tillColors, seasonalityConfig }) => {
    
    // Verifica se attivo e nel range
    const isSeasonActive = useMemo(() => {
        if (!seasonalityConfig?.startDate || !seasonalityConfig?.endDate) return false;
        const now = new Date();
        const start = new Date(seasonalityConfig.startDate);
        const end = new Date(seasonalityConfig.endDate);
        end.setHours(23, 59, 59);
        return now >= start && now <= end;
    }, [seasonalityConfig]);

    const activeTheme = isSeasonActive ? seasonalityConfig?.theme : 'none';

    // Generazione particelle
    const particles = useMemo(() => {
        if (activeTheme === 'none') return [];
        
        let emojis = [''];
        if (activeTheme === 'christmas') emojis = ['❄️', '⛄', '🎄'];
        else if (activeTheme === 'easter') emojis = ['🐰', '🥚', '🌸'];
        else if (activeTheme === 'summer') emojis = ['☀️', '🍦', '🌊'];

        return Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            char: emojis[Math.floor(Math.random() * emojis.length)],
            left: `${Math.random() * 100}%`,
            duration: `${Math.random() * 10 + 5}s`,
            delay: `${Math.random() * 5}s`,
            size: `${Math.random() * 0.8 + 0.5}rem`
        }));
    }, [activeTheme]);

    return (
        <div className={`flex flex-col min-h-screen relative overflow-hidden font-sans transition-colors duration-1000 ${activeTheme === 'christmas' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            
            {/* CANVAS ANIMAZIONI */}
            {activeTheme !== 'none' && (
                <div className="emoji-rain-container opacity-40 pointer-events-none">
                    {particles.map(p => (
                        <span 
                            key={p.id} 
                            className="falling-emoji"
                            style={{ 
                                left: p.left,
                                animationDuration: p.duration,
                                animationDelay: p.delay,
                                fontSize: p.size
                            }}
                        >
                            {p.char}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex-grow flex flex-col items-center justify-center p-2 z-10 w-full max-w-4xl mx-auto pb-16">
                
                <div className="mb-2 relative group">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className={`h-16 w-auto object-contain drop-shadow-md transition-transform duration-500 hover:scale-105 ${activeTheme === 'christmas' ? 'brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : ''}`}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>

                <div className="text-center mb-4">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className="text-3xl md:text-4xl font-black tracking-tighter mb-1 drop-shadow-sm">
                            BAR VVF
                        </span>
                        <span className="text-xl md:text-2xl font-extrabold text-primary tracking-tight drop-shadow-sm">
                            Montepulciano
                        </span>
                    </h1>
                    <p className={`font-medium text-[10px] md:text-xs mt-1 px-3 py-1 rounded-full inline-block backdrop-blur-sm shadow-sm border ${activeTheme === 'christmas' ? 'bg-white/20 border-white/10' : 'bg-white/90 border-slate-100 text-slate-500'}`}>
                        Scegli il turno per iniziare
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 w-full mb-3 px-2">
                    {tills.map((till) => {
                        const bgColor = tillColors[till.id] || '#f97316';
                        return (
                            <button
                                key={till.id}
                                onClick={() => onSelectTill(till.id)}
                                className={`group relative rounded-xl p-1 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col items-center justify-center w-16 h-20 border ${activeTheme === 'christmas' ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white border-slate-100'}`}
                            >
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner mb-1 transition-transform duration-300 group-hover:scale-110" 
                                    style={{ backgroundColor: bgColor }}
                                >
                                    <span className="text-xl font-black text-white select-none">
                                        {till.shift.toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-[9px] font-bold leading-tight">
                                    {till.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                <div className="flex gap-2 w-full justify-center px-2 flex-wrap mb-3">
                    <button
                        onClick={onSelectReports}
                        className="bg-white w-16 h-12 rounded-xl shadow-md hover:shadow-lg border border-slate-100 text-slate-600 font-bold flex flex-col items-center justify-center gap-0.5 hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <ModernChartIcon className="h-4 w-4 text-primary" />
                        <span className="text-[8px] uppercase">Report</span>
                    </button>
                    
                    <button
                        onClick={onSelectAdmin}
                        className="bg-white w-12 h-12 rounded-xl shadow-md hover:shadow-lg border border-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center"
                        title="Area Riservata"
                    >
                        <LockIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 py-2 text-center z-50 shadow-lg">
                <p className="text-[10px] text-slate-400 font-medium">
                    Gestionale Bar v3.4 | <span className="font-bold text-slate-500">Fabbrini M.</span>
                </p>
            </div>
        </div>
    );
};

export default TillSelection;