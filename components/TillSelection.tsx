
import React, { useMemo } from 'react';
import { Till, TillColors } from '../types';
import { ModernChartIcon, LockIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
    onSelectAdmin: () => void; // Nuovo prop
    tillColors: TillColors; // Nuovo prop per i colori
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports, onSelectAdmin, tillColors }) => {
    
    const randomEmoji = useMemo(() => {
        const emojis = ['☕', '🥐', '🍰', '🍹', '🍦', '🥪', '🥗', '🍩', '🍪', '🧃'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 relative">
            <div className="mb-12 flex flex-col items-center animate-fade-in text-center z-10">
                {/* Emoji Gigante Libera */}
                <div className="mb-8 transform hover:scale-125 transition-transform duration-500 ease-in-out cursor-default select-none animate-bounce-slow">
                    <span className="text-9xl filter drop-shadow-xl" role="img" aria-label="Bar Icon">
                        {randomEmoji}
                    </span>
                </div>
                
                {/* Nuovo Titolo */}
                <h1 className="text-5xl md:text-7xl font-black text-slate-800 tracking-tight mb-2 leading-tight">
                    BAR VVF<br/>
                    <span className="text-primary text-3xl md:text-5xl font-extrabold block mt-2">Montepulciano</span>
                </h1>
                
                {/* Nuovo Testo */}
                <p className="text-slate-500 font-medium text-xl mt-6">Scegli il turno per iniziare</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl z-10">
                {tills.map((till) => {
                    // Colore dinamico o default
                    const bgColor = tillColors[till.id] || '#f97316';
                    
                    return (
                        <button
                            key={till.id}
                            onClick={() => onSelectTill(till.id)}
                            className="group bg-white rounded-3xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 ease-out flex flex-col items-center justify-center relative overflow-hidden h-64 border-2 border-transparent hover:border-slate-200"
                        >
                             <div className="w-32 h-32 rounded-full mb-6 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: bgColor }}>
                                <span className="text-7xl font-black text-white select-none">
                                    {till.shift.toUpperCase()}
                                </span>
                            </div>
                            <span className="text-2xl font-bold text-slate-800">{till.name}</span>
                        </button>
                    );
                })}
            </div>
            
            {/* Footer Buttons */}
            <div className="mt-12 flex gap-4 z-10">
                <button
                    onClick={onSelectReports}
                    className="bg-white px-6 py-3 rounded-xl shadow-sm hover:shadow-md border border-slate-200 text-slate-600 font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
                >
                    <ModernChartIcon className="h-5 w-5" />
                    <span>Report e Gestione</span>
                </button>
                
                {/* Pulsante Lucchetto per Admin */}
                <button
                    onClick={onSelectAdmin}
                    className="bg-white p-3 rounded-xl shadow-sm hover:shadow-md border border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors"
                    title="Area Riservata"
                >
                    <LockIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default TillSelection;
