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
    
    // Logica semplificata per evitare crash
    const activeTheme = seasonalityConfig?.theme || 'none';
    const bgColor = seasonalityConfig?.seasons?.[activeTheme as any]?.backgroundColor || '#f8fafc';

    return (
        <div className="flex flex-col min-h-screen relative overflow-hidden font-sans" style={{ backgroundColor: bgColor }}>
            
            <div className="flex-grow flex flex-col items-center justify-center p-2 z-10 w-full max-w-4xl mx-auto pb-16">
                
                <div className="mb-2 relative group">
                    <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>

                <div className="text-center mb-4">
                    <h1 className="flex flex-col items-center leading-none">
                        <span className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter mb-1">BAR VVF</span>
                        <span className="text-xl md:text-2xl font-extrabold text-primary tracking-tight">Montepulciano</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1 bg-white/90 px-3 py-1 rounded-full border border-slate-100">Scegli il turno per iniziare</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 w-full mb-3 px-2">
                    {tills.map((till) => {
                        const bgBtnColor = tillColors[till.id] || '#f97316';
                        return (
                            <button key={till.id} onClick={() => onSelectTill(till.id)} className="group relative bg-white rounded-xl p-1 shadow-md hover:shadow-xl w-16 h-20 border border-slate-100 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner mb-1" style={{ backgroundColor: bgBtnColor }}>
                                    <span className="text-xl font-black text-white select-none">{till.shift.toUpperCase()}</span>
                                </div>
                                <span className="text-[9px] font-bold text-slate-700 leading-tight">{till.name}</span>
                            </button>
                        );
                    })}
                </div>
                
                <div className="flex gap-2 w-full justify-center px-2 flex-wrap mb-3">
                    <button onClick={onSelectReports} className="bg-white w-16 h-12 rounded-xl shadow-md border border-slate-100 text-slate-600 font-bold flex flex-col items-center justify-center gap-0.5"><ModernChartIcon className="h-4 w-4 text-primary" /><span className="text-[8px] uppercase">Report</span></button>
                    <button onClick={onSelectAdmin} className="bg-white w-12 h-12 rounded-xl shadow-md border border-slate-100 text-slate-400 flex items-center justify-center"><LockIcon className="h-4 w-4" /></button>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white/95 border-t border-slate-200 py-2 text-center z-50">
                <p className="text-[10px] text-slate-400 font-medium">Gestionale Bar v3.6 Safe Mode</p>
            </div>
        </div>
    );
};

export default TillSelection;