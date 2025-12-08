
import React from 'react';
import { TombolaConfig, AnalottoConfig } from '../types';
import { TicketIcon, BackArrowIcon, GamepadIcon, CloverIcon } from './Icons';

interface GamesHubProps {
    onGoBack?: () => void;
    onPlayTombola: () => void;
    onPlayAnalotto?: () => void;
    tombolaConfig?: TombolaConfig;
    analottoConfig?: AnalottoConfig;
}

const GamesHub: React.FC<GamesHubProps> = ({ onGoBack, onPlayTombola, onPlayAnalotto, tombolaConfig, analottoConfig }) => {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            {onGoBack && (
                <header className="bg-white shadow-sm p-4 flex items-center gap-2 sticky top-0 z-10">
                     <button
                        onClick={onGoBack}
                        className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        <BackArrowIcon className="h-5 w-5" />
                        <span className="font-bold text-sm">Indietro</span>
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">Extra Hub</h1>
                </header>
            )}

            <div className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full animate-fade-in">
                {!onGoBack && (
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <GamepadIcon className="h-8 w-8 text-yellow-500" /> Extra Hub
                    </h2>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    
                    {/* CARD TOMBOLA */}
                    <div onClick={onPlayTombola} className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 group border-4 border-yellow-400">
                        <div className="p-6 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                <TicketIcon className="h-24 w-24 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-md">Tombola 2025</h3>
                            <p className="text-red-100 text-sm font-medium mb-4">Il classico gioco natalizio.</p>
                            
                            <div className="bg-black/20 rounded-lg p-3 backdrop-blur-sm">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-yellow-200 font-bold uppercase">Montepremi</span>
                                    <span className="text-xl font-black text-yellow-400">€{tombolaConfig?.jackpot.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 p-3 text-center text-xs font-bold text-white uppercase tracking-widest group-hover:bg-white/20 transition-colors">
                            Gioca Ora →
                        </div>
                    </div>

                    {/* CARD ANALOTTO VVF */}
                    <div onClick={onPlayAnalotto} className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 group border-4 border-yellow-400">
                        <div className="p-6 relative">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                <CloverIcon className="h-24 w-24 text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-md">Analotto VVF</h3>
                            <p className="text-green-100 text-sm font-medium mb-4">Indovina i numeri sulle ruote dei Vigili!</p>
                            
                            <div className="bg-black/20 rounded-lg p-3 backdrop-blur-sm">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-yellow-200 font-bold uppercase">Jackpot</span>
                                    <span className="text-xl font-black text-yellow-400">€{analottoConfig?.jackpot.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white/10 p-3 text-center text-xs font-bold text-white uppercase tracking-widest group-hover:bg-white/20 transition-colors">
                            Tenta la Fortuna →
                        </div>
                    </div>

                    {/* CARD PROSSIMAMENTE */}
                    <div className="bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 opacity-60">
                        <span className="text-4xl mb-2">🎲</span>
                        <p className="font-bold text-slate-400">Nuovi giochi in arrivo...</p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default GamesHub;
