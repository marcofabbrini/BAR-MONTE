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
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <LogoIcon className="h-24 w-24 text-primary mb-4" />
            <h1 className="text-5xl font-extrabold text-slate-900 mb-4">Gestionale Bar</h1>
            <p className="text-xl text-slate-500 mb-12">Seleziona una cassa o accedi all'area report</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl">
                {tills.map((till) => (
                    <button
                        key={till.id}
                        onClick={() => onSelectTill(till.id)}
                        className="bg-white rounded-lg p-8 shadow-lg transform hover:scale-105 hover:shadow-primary/20 hover:border-primary border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-primary-light"
                    >
                        <div className="flex flex-col items-center justify-center">
                            <ModernCashRegisterIcon className="h-20 w-20 text-primary" />
                            <span className="mt-6 text-2xl font-bold tracking-wider text-slate-800">{till.name}</span>
                        </div>
                    </button>
                ))}
                 <button
                    onClick={onSelectReports}
                    className="bg-white rounded-lg p-8 shadow-lg transform hover:scale-105 hover:shadow-secondary/20 hover:border-secondary border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-secondary-light"
                >
                    <div className="flex flex-col items-center justify-center">
                        <ModernChartIcon className="h-20 w-20 text-secondary" />
                        <span className="mt-6 text-2xl font-bold tracking-wider text-slate-800">Report e Gestione</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default TillSelection;