import React from 'react';
import { TicketIcon, TrophyIcon } from './Icons';

// Semplifichiamo le props: invece di tutto l'oggetto config che può essere undefined,
// passiamo solo il jackpot come numero (che sarà 0 di default se manca).
interface GamesHubProps {
    onPlayTombola: () => void;
    jackpot: number;
}

const GamesHub: React.FC<GamesHubProps> = ({ onPlayTombola, jackpot }) => {
    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <TrophyIcon className="h-8 w-8 text-yellow-500" /> Hub Giochi & Extra
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* CARD TOMBOLA 2025 */}
                <div onClick={onPlayTombola} className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition-all duration-300 group border-4 border-yellow-400">
                    <div className="p-6 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                            <TicketIcon className="h-24 w-24 text-white" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-md">Tombola 2025</h3>
                        <p className="text-red-100 text-sm font-medium mb-4">Il classico gioco natalizio.</p>
                        
                        <div className="bg-black/20 rounded-lg p-3 backdrop-blur-sm">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-yellow-200 font-bold uppercase">Montepremi Attuale</span>
                                {/* Ora usiamo la prop sicura 'jackpot' */}
                                <span className="text-xl font-black text-yellow-400">€{jackpot.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 p-3 text-center text-xs font-bold text-white uppercase tracking-widest group-hover:bg-white/20 transition-colors">
                        Gioca Ora →
                    </div>
                </div>

                {/* CARD PROSSIMAMENTE */}
                <div className="bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 opacity-60">
                    <span className="text-4xl mb-2">🎲</span>
                    <p className="font-bold text-slate-400">Nuovi giochi in arrivo...</p>
                </div>

            </div>
        </div>
    );
};

export default GamesHub;