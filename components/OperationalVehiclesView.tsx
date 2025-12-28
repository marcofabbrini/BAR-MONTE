
import React from 'react';
import { OperationalVehicle } from '../types';
import { BackArrowIcon, TruckIcon } from './Icons';
import { useBar } from '../contexts/BarContext';

interface OperationalVehiclesViewProps {
    onGoBack: () => void;
}

const OperationalVehiclesView: React.FC<OperationalVehiclesViewProps> = ({ onGoBack }) => {
    const { operationalVehicles, getNow } = useBar();

    const today = getNow();
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const currentDayName = days[today.getDay()];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <header className="bg-red-700 text-white px-4 py-4 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)]">
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white bg-red-800/40 px-4 py-2 rounded-full hover:bg-red-800/60 transition-colors backdrop-blur-sm"
                >
                    <BackArrowIcon className="h-5 w-5" /> 
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
                    <TruckIcon className="h-8 w-8" />
                    <span>Mezzi Operativi</span>
                </h1>
                
                <div className="w-12 md:w-24"></div> 
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {operationalVehicles.map(v => {
                        const isCheckDay = v.checkDay === currentDayName;
                        
                        return (
                            <div key={v.id} className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col group relative">
                                
                                {/* BADGE GIORNO CONTROLLO */}
                                <div className={`
                                    absolute top-3 right-3 z-10 font-black text-[10px] uppercase px-3 py-1 rounded-full shadow-lg border
                                    ${isCheckDay 
                                        ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_#ef4444] animate-pulse' 
                                        : 'bg-white/90 text-slate-500 border-slate-200 backdrop-blur-sm'
                                    }
                                `}>
                                    {isCheckDay ? 'DI CONTROLLO' : v.checkDay}
                                </div>

                                <div className="h-48 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                                    {v.photoUrl ? (
                                        <img src={v.photoUrl} alt={v.model} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <span className="text-6xl filter drop-shadow-md">🚒</span>
                                    )}
                                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                                        <span className="text-xs font-black text-white bg-red-600 px-2 py-0.5 rounded uppercase">{v.type}</span>
                                    </div>
                                </div>
                                
                                <div className="p-5 flex-grow flex flex-col">
                                    <h3 className="text-xl font-black text-slate-800 leading-tight">{v.model}</h3>
                                    <div className="mt-2">
                                        <span className="text-sm font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase tracking-wide">
                                            {v.plate}
                                        </span>
                                    </div>
                                    
                                    {v.notes && (
                                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-xs text-slate-500 italic leading-relaxed">{v.notes}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {operationalVehicles.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
                            <p className="text-slate-400 font-bold text-lg">Nessun mezzo operativo registrato.</p>
                            <p className="text-sm text-slate-400">Accedi come Amministratore per aggiungere i mezzi.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OperationalVehiclesView;
