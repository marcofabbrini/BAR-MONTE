import React from 'react';
import { Till } from '../types';
import { LogoIcon, ModernCashRegisterIcon, ModernChartIcon } from './Icons';

interface TillSelectionProps {
    tills: Till[];
    onSelectTill: (tillId: string) => void;
    onSelectReports: () => void;
}

const TillSelection: React.FC<TillSelectionProps> = ({ tills, onSelectTill, onSelectReports }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
            <div className="mb-10 flex flex-col items-center animate-fade-in">
                <div className="p-4 bg-white rounded-full shadow-soft mb-6">
                    <LogoIcon className="h-16 w-16 text-primary" />
                </div>
                <h1 className="text-4xl font-bold text-slate-800 tracking-tight">Gestionale Bar</h1>
                <p className="text-slate-500 mt-2 font-medium">Benvenuto, seleziona la tua postazione</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                {tills.map((till) => (
                    <button
                        key={till.id}
                        onClick={() => onSelectTill(till.id)}
                        className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-glow border border-slate-100 transition-all duration-300 ease-out flex flex-col items-center justify-center relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="p-4 bg-orange-50 rounded-full group-hover:bg-orange-100 transition-colors mb-4">
                            <ModernCashRegisterIcon className="h-10 w-10 text-primary" />
                        </div>
                        <span className="text-xl font-bold text-slate-800 group-hover:text-primary transition-colors">{till.name}</span>
                        <span className="text-sm text-slate-400 mt-1 font-medium">Turno {till.shift.toUpperCase()}</span>
                    </button>
                ))}
                 <button
                    onClick={onSelectReports}
                    className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-glow border border-slate-100 transition-all duration-300 ease-out flex flex-col items-center justify-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="p-4 bg-slate-50 rounded-full group-hover:bg-slate-100 transition-colors mb-4">
                        <ModernChartIcon className="h-10 w-10 text-slate-600" />
                    </div>
                    <span className="text-xl font-bold text-slate-800 group-hover:text-slate-600 transition-colors">Report e Gestione</span>
                    <span className="text-sm text-slate-400 mt-1 font-medium">Area Amministrativa</span>
                </button>
            </div>
        </div>
    );
};

export default TillSelection;