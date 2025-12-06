import React from 'react';
import { Till } from '../types';
import { LogoIcon, ModernChartIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
            <div className="mb-12 flex flex-col items-center animate-fade-in text-center">
                <div className="p-5 bg-white rounded-3xl shadow-soft mb-6 border border-slate-100">
                    {/* Nuova icona tazzina di caffè */}
                    <LogoIcon className="h-20 w-20 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight mb-2">Gestionale Bar</h1>
                <p className="text-slate-500 font-medium text-lg">Seleziona la tua postazione per iniziare</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
                {tills.map((till) => (
                    <button
                        key={till.id}
                        onClick={() => onSelectTill(till.id)}
                        className="group bg-white rounded-3xl p-8 shadow-sm hover:shadow-xl border-2 border-transparent hover:border-primary/10 transition-all duration-300 ease-out flex flex-col items-center justify-center relative overflow-hidden h-64"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Lettera del turno GRANDE */}
                        <div className="w-32 h-32 bg-orange-50 rounded-full group-hover:bg-primary group-hover:text-white transition-all duration-300 mb-4 flex items-center justify-center">
                            <span className="text-7xl font-black text-primary group-hover:text-white transition-colors">
                                {till.shift.toUpperCase()}
                            </span>
                        </div>
                        
                        <span className="text-2xl font-bold text-slate-800 group-hover:text-primary transition-colors">{till.name}</span>
                    </button>
                ))}
                 <button
                    onClick={onSelectReports}
                    className="group bg-slate-100 rounded-3xl p-8 shadow-inner hover:shadow-xl hover:bg-white border-2 border-transparent hover:border-slate-200 transition-all duration-300 ease-out flex flex-col items-center justify-center relative overflow-hidden h-64"
                >
                    <div className="w-24 h-24 bg-white rounded-full group-hover:bg-slate-800 transition-colors mb-4 flex items-center justify-center shadow-sm">
                        <ModernChartIcon className="h-10 w-10 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-xl font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Report e Gestione</span>
                    <span className="text-sm text-slate-400 mt-1 font-medium">Area Amministrativa</span>
                </button>
            </div>
        </div>
    );
};

export default TillSelection;