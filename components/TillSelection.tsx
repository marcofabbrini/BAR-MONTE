import React, { useMemo } from 'react';
import { Till, TillColors, SeasonalityConfig, SeasonTheme } from '../types';
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
    
    // Determina il tema attivo
    const activeTheme: SeasonTheme | null = useMemo(() => {
        // Se la config non esiste o è nel vecchio formato (senza seasons), ritorna null
        if (!seasonalityConfig || !seasonalityConfig.seasons) return null;

        if (seasonalityConfig.mode === 'manual') {
            return seasonalityConfig.seasons[seasonalityConfig.currentManualSeason];
        }

        // Mode AUTO
        const now = new Date();
        const month = now.getMonth(); // 0-11
        // Inverno: Dic, Gen, Feb
        if (month === 11 || month === 0 || month === 1) return seasonalityConfig.seasons.winter;
        // Primavera: Mar, Apr, Mag
        if (month >= 2 && month <= 4) return seasonalityConfig.seasons.spring;
        // Estate: Giu, Lug, Ago
        if (month >= 5 && month <= 7) return seasonalityConfig.seasons.summer;
        // Autunno: Set, Ott, Nov
        return seasonalityConfig.seasons.autumn;

    }, [seasonalityConfig]);

    const bgColor = activeTheme?.backgroundColor || '#f8fafc';
    const animationType = activeTheme?.animationType || 'none';
    const emojis = activeTheme?.emojis || [];

    // Generazione particelle
    const particles = useMemo(() => {
        if (animationType === 'none' || !emojis.length) return [];
        
        return Array.from({ length: 40 }).map((_, i) => {
            const style: any = {
                left: `${Math.random() * 100}%`,
                fontSize: `${Math.random() * 1 + 0.5}rem`,
                animationDelay: `${Math.random() * 5}s`,
            };

            if (animationType === 'snow' || animationType === 'leaves') {
                style.animationName = 'fall';
                style.animationDuration = `${Math.random() * 10 + 10}s`;
            } else if (animationType === 'rain') {
                style.animationName = 'fall';
                style.animationDuration = `${Math.random() * 2 + 1}s`;
            } else if (animationType === 'float') {
                style.animationName = 'float';
                style.animationDuration = `${Math.random() * 15 + 10}s`;
                style.top = `${Math.random() * 100}%`;
            }

            return { id: i, char: emojis[Math.floor(Math.random() * emojis.length)], style };
        });
    }, [animationType, emojis]);

    const isDarkBg = bgColor === '#1e293b' || bgColor.toLowerCase().includes('#0') || bgColor.toLowerCase().includes('#1'); 

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden font-sans transition-colors duration-1000" style={{ backgroundColor: bgColor }}>
            
            {/* CANVAS ANIMAZIONI */}
            {animationType !== 'none' && (
                <div className="emoji-rain-container opacity-40 pointer-events-none">
                    {particles.map(p => (
                        <span 
                            key={p.id} 
                            className="absolute"
                            style={{ 
                                ...p.style,
                                animationTimingFunction: animationType === 'float' ? 'ease-in-out' : 'linear',
                                animationIterationCount: 'infinite'
                            }}
                        >
                            {p.char}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex-grow flex flex-col items-center justify-center p-2 z-10 w-full max-w-4xl mx-auto pb-16">
                
                {/* LOGO */}
                <div className="mb-2 relative group">
                    <img 
                        src="/logo.png" 
                        alt="Logo" 
                        className={`h-16 w-auto object-contain drop-shadow-md transition-transform duration-500 hover:scale-105 ${isDarkBg ? 'brightness-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' : ''}`}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>

                <div className="text-center mb-4">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className={`text-3xl md:text-4xl font-black tracking-tighter mb-1 drop-shadow-sm ${isDarkBg ? 'text-white' : 'text-slate-800'}`}>
                            BAR VVF
                        </span>
                        <span className="text-xl md:text-2xl font-extrabold text-primary tracking-tight drop-shadow-sm">
                            Montepulciano
                        </span>
                    </h1>
                    <p className={`font-medium text-[10px] md:text-xs mt-1 px-3 py-1 rounded-full inline-block backdrop-blur-sm shadow-sm border ${isDarkBg ? 'bg-white/20 text-white border-white/10' : 'bg-white/90 text-slate-500 border-slate-100'}`}>
                        Scegli il turno per iniziare
                    </p>
                </div>

                {/* GRIGLIA CASSE */}
                <div className="flex flex-wrap justify-center gap-2 w-full mb-3 px-2">
                    {tills.map((till) => {
                        const bgBtnColor = tillColors[till.id] || '#f97316';
                        return (
                            <button
                                key={till.id}
                                onClick={() => onSelectTill(till.id)}
                                className={`group relative rounded-xl p-1 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col items-center justify-center w-16 h-20 border ${isDarkBg ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-white border-slate-100'}`}
                            >
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner mb-1 transition-transform duration-300 group-hover:scale-110" 
                                    style={{ backgroundColor: bgBtnColor }}
                                >
                                    <span className="text-xl font-black text-white select-none">
                                        {till.shift.toUpperCase()}
                                    </span>
                                </div>
                                <span className={`text-[9px] font-bold leading-tight ${isDarkBg ? 'text-white' : 'text-slate-700'}`}>
                                    {till.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                
                {/* MENU FUNZIONI */}
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
                    Gestionale Bar v3.7 | <span className="font-bold text-slate-500">Fabbrini M.</span>
                </p>
            </div>
        </div>
    );
};

export default TillSelection;