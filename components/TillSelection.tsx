
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
    
    // Emoji randomica che cambia ad ogni refresh
    const randomEmoji = useMemo(() => {
        const emojis = ['☕', '🥐', '🍰', '🍹', '🍦', '🥪', '🍩', '🍪', '🥃', '🍷'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 relative overflow-hidden">
            
            <div className="flex flex-col items-center text-center z-10 mb-10">
                {/* EMOJI GIGANTE SENZA CERCHIO */}
                <div className="mb-6 transform hover:scale-110 transition-transform duration-500 cursor-default select-none animate-bounce-slow">
                    <span className="text-[150px] leading-none filter drop-shadow-2xl">
                        {randomEmoji}
                    </span>
                </div>
                
                {/* TITOLO RICHIESTO */}
                <h1 className="flex flex-col items-center leading-none">
                    <span className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter mb-2">
                        BAR VVF
                    </span>
                    <span className="text-4xl md:text-6xl font-extrabold text-primary tracking-tight">
                        Montepulciano
                    </span>
                </h1>
                
                {/* SOTTOTITOLO RICHIESTO */}
                <p className="text-slate-500 font-medium text-xl md:text-2xl mt-8">
                    Scegli il turno per iniziare
                </p>
            </div>

            {/* GRIGLIA PULSANTI CASSE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl z-10 mb-12">
                {tills.map((till) => {
                    // Colore preso dalle impostazioni o default arancione
                    const bgColor = tillColors[till.id] || '#f97316';
                    
                    return (
                        <button
                            key={till.id}
                            onClick={() => onSelectTill(till.id)}
                            className="group relative bg-white rounded-3xl p-4 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col items-center justify-center h-48 md:h-64 border border-slate-100"
                        >
                            {/* Cerchio colorato con la lettera del turno */}
                            <div 
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center shadow-inner mb-4 transition-transform duration-300 group-hover:scale-105" 
                                style={{ backgroundColor: bgColor }}
                            >
                                <span className="text-6xl md:text-8xl font-black text-white select-none">
                                    {till.shift.toUpperCase()}
                                </span>
                            </div>
                            
                            <span className="text-lg md:text-xl font-bold text-slate-700">
                                {till.name}
                            </span>
                        </button>
                    );
                })}
            </div>
            
            {/* MENU IN BASSO */}
            <div className="flex gap-4 z-10">
                <button
                    onClick={onSelectReports}
                    className="bg-white px-6 py-3 rounded-2xl shadow-md hover:shadow-lg border border-slate-100 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                >
                    <ModernChartIcon className="h-6 w-6 text-slate-400" />
                    <span>Report e Gestione</span>
                </button>
                
                {/* Pulsante Lucchetto (Admin) */}
                <button
                    onClick={onSelectAdmin}
                    className="bg-white p-3 rounded-2xl shadow-md hover:shadow-lg border border-slate-100 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all active:scale-95"
                    title="Area Riservata (Password: 31.10.75)"
                >
                    <LockIcon className="h-6 w-6" />
                </button>
            </div>
        </div>
    );
};

export default TillSelection;

