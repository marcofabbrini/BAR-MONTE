import React from 'react';
import { TombolaConfig, AnalottoConfig } from '../types';
import { BackArrowIcon, GamepadIcon, CloverIcon, DiceIcon } from './Icons';

interface GamesHubProps {
    onGoBack?: () => void;
    onPlayTombola: () => void;
    onPlayAnalotto?: () => void;
    onPlayDice?: () => void;
    tombolaConfig?: TombolaConfig;
    analottoConfig?: AnalottoConfig;
}

const GamesHub: React.FC<GamesHubProps> = ({ onGoBack, onPlayTombola, onPlayAnalotto, onPlayDice, tombolaConfig, analottoConfig }) => {
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    
                    {/* CARD TOMBOLA */}
                    <div onClick={onPlayTombola} className="relative bg-white rounded-3xl shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 group border-2 border-red-100 h-64 flex flex-col items-center justify-center">
                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
                        <div className="text-[70px] leading-none mb-2 filter drop-shadow-lg group-hover:rotate-12 transition-transform">
                            🎟️
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-wider mb-1">Tombola</h3>
                        <p className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">Classico Natalizio</p>
                        
                        <div className="bg-red-50 px-4 py-2 rounded-full border border-red-100">
                            <span className="text-xs text-red-400 font-bold uppercase mr-2">Jackpot</span>
                            <span className="text-lg font-black text-red-600">€{tombolaConfig?.jackpot.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>

                    {/* CARD ANALOTTO VVF */}
                    <div onClick={onPlayAnalotto} className="relative bg-white rounded-3xl shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 group border-2 border-emerald-100 h-64 flex flex-col items-center justify-center">
                        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
                        <div className="text-[70px] leading-none mb-2 filter drop-shadow-lg group-hover:-rotate-12 transition-transform">
                            🎱
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-wider mb-1">
                            <span className="text-[#fca5a5]">ANAL</span>OTTO
                        </h3>
                        <p className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">Lotto VVF</p>
                        
                        <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
                            <span className="text-xs text-emerald-400 font-bold uppercase mr-2">Jackpot</span>
                            <span className="text-lg font-black text-emerald-600">€{analottoConfig?.jackpot.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>

                    {/* CARD DADI (CHI PAGA) */}
                    <div onClick={onPlayDice} className="relative bg-white rounded-3xl shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 group border-2 border-blue-100 h-64 flex flex-col items-center justify-center">
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                        <div className="text-[70px] leading-none mb-2 filter drop-shadow-lg group-hover:scale-110 transition-transform">
                            🎲
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-wider mb-1">Chi Paga?</h3>
                        <p className="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">Sfida ai Dadi</p>
                        
                        <div className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100 text-blue-500 font-bold text-xs uppercase">
                            Gioca Ora
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default GamesHub;