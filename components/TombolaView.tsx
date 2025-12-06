
import React, { useState, useEffect } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin } from '../types';
import { BackArrowIcon, TrophyIcon, TicketIcon } from './Icons';

interface TombolaViewProps {
    onGoBack: () => void;
    config: TombolaConfig;
    tickets: TombolaTicket[];
    wins: TombolaWin[];
    onBuyTicket: (playerName: string, quantity: number) => Promise<void>;
}

const TombolaView: React.FC<TombolaViewProps> = ({ onGoBack, config, tickets, wins, onBuyTicket }) => {
    const [playerName, setPlayerName] = useState('');
    const [buyQuantity, setBuyQuantity] = useState(1);
    
    // Calcolo statistiche
    const totalTickets = tickets.length;
    const nextExtractionTime = new Date(new Date(config.lastExtraction).getTime() + 2 * 60 * 60 * 1000); // +2 ore
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = nextExtractionTime.getTime() - now;
            
            if (distance < 0) {
                setTimeLeft("In corso...");
            } else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [config.lastExtraction]);

    const handleBuy = async () => {
        if (!playerName.trim()) return alert("Inserisci il nome del giocatore");
        await onBuyTicket(playerName, buyQuantity);
        setPlayerName('');
        alert(`Acquistate ${buyQuantity} cartelle per ${playerName}!`);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 relative">
            {/* Header */}
            <header className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-white/90 hover:text-white">
                        <BackArrowIcon className="h-5 w-5" /> Esci
                    </button>
                    <h1 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                        <TrophyIcon className="h-6 w-6 text-yellow-300" /> Tombola 2025
                    </h1>
                    <div className="text-right">
                        <p className="text-[10px] uppercase opacity-80">Montepremi</p>
                        <p className="text-xl font-black text-yellow-300">€{config.jackpot.toFixed(2)}</p>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 max-w-5xl mx-auto w-full space-y-6">
                
                {/* Tabellone e Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tabellone Numeri */}
                    <div className="md:col-span-2 bg-white rounded-2xl shadow-xl p-6 border-4 border-red-100">
                        <h2 className="text-center font-bold text-slate-700 mb-4 uppercase tracking-widest">Tabellone Estrazioni</h2>
                        <div className="tombola-grid">
                            {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                                <div 
                                    key={num} 
                                    className={`tombola-cell ${config.extractedNumbers.includes(num) ? 'extracted' : 'bg-slate-100 text-slate-300'}`}
                                >
                                    {num}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 text-center bg-slate-50 p-2 rounded-lg">
                            <p className="text-xs text-slate-500 font-bold uppercase">Prossima estrazione tra:</p>
                            <p className="text-2xl font-black text-red-500 font-mono">{timeLeft}</p>
                        </div>
                    </div>

                    {/* Colonna Destra: Acquisto e Vincitori */}
                    <div className="space-y-6">
                        {/* Box Acquisto */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-xl p-6 text-white">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <TicketIcon className="h-5 w-5" /> Acquista Cartelle
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] uppercase font-bold opacity-70">Nome Giocatore</label>
                                    <input 
                                        type="text" 
                                        value={playerName} 
                                        onChange={e => setPlayerName(e.target.value)} 
                                        className="w-full bg-white/20 border border-white/30 rounded p-2 text-white placeholder-white/50 focus:outline-none focus:bg-white/30"
                                        placeholder="Mario Rossi"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase font-bold opacity-70">Quantità ({buyQuantity})</label>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="6" 
                                        value={buyQuantity} 
                                        onChange={e => setBuyQuantity(parseInt(e.target.value))} 
                                        className="w-full accent-yellow-400"
                                    />
                                    <div className="flex justify-between text-xs opacity-80 font-mono mt-1">
                                        <span>1</span><span>6</span>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <button onClick={handleBuy} className="w-full bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black py-3 rounded-xl shadow-lg transition-transform active:scale-95">
                                        ACQUISTA (€{(config.ticketPrice * buyQuantity).toFixed(2)})
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Box Vincitori */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 max-h-[300px] overflow-y-auto">
                            <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase flex items-center gap-2">
                                <TrophyIcon className="h-4 w-4 text-orange-500" /> Ultimi Vincitori
                            </h3>
                            {wins.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">Nessuna vincita ancora...</p>
                            ) : (
                                <ul className="space-y-2">
                                    {wins.slice().reverse().map(win => (
                                        <li key={win.id} className="bg-yellow-50 p-2 rounded border border-yellow-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-xs text-slate-800">{win.playerName}</p>
                                                <p className="text-[10px] text-slate-500">{new Date(win.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                            <span className="bg-yellow-400 text-red-900 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                                                {win.type}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TombolaView;
