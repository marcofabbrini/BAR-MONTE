
import React, { useState, useEffect, useMemo } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin, StaffMember } from '../types';
import { BackArrowIcon, TrophyIcon, TicketIcon, GridIcon } from './Icons';

interface TombolaViewProps {
    onGoBack: () => void;
    config: TombolaConfig;
    tickets: TombolaTicket[];
    wins: TombolaWin[];
    onBuyTicket: (staffId: string, quantity: number) => Promise<void>;
    staff: StaffMember[];
    onStartGame: () => Promise<void>;
    isSuperAdmin: boolean | null;
}

const TombolaView: React.FC<TombolaViewProps> = ({ onGoBack, config, tickets, wins, onBuyTicket, staff, onStartGame, isSuperAdmin }) => {
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [buyQuantity, setBuyQuantity] = useState(1);
    
    // Calcolo statistiche
    const totalTickets = tickets.length;
    const progressPercent = Math.min((totalTickets / config.maxTickets) * 100, 100);
    const nextExtractionTime = new Date(new Date(config.lastExtraction).getTime() + 2 * 60 * 60 * 1000); // +2 ore
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            if (config.status === 'pending') {
                setTimeLeft("In attesa avvio...");
                return;
            }
            const now = new Date().getTime();
            const distance = nextExtractionTime.getTime() - now;
            
            if (distance < 0) {
                setTimeLeft("Estrazione...");
            } else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [config.lastExtraction, config.status]);

    const handleBuy = async () => {
        if (!selectedStaffId) return;
        await onBuyTicket(selectedStaffId, buyQuantity);
        alert(`Acquistate ${buyQuantity} cartelle!`);
    };

    const myTickets = useMemo(() => {
        return tickets.filter(t => t.playerId === selectedStaffId);
    }, [tickets, selectedStaffId]);

    const selectedStaffMember = staff.find(s => s.id === selectedStaffId);

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 relative">
            {/* Header */}
            <header className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
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

            <main className="flex-grow p-4 max-w-6xl mx-auto w-full space-y-6">
                
                {/* Status Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Cartelle Vendute</span>
                        <span className="text-sm font-black text-slate-800">{totalTickets} / {config.maxTickets}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                        <div className="bg-green-500 h-4 rounded-full transition-all duration-1000 ease-out flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${progressPercent}%` }}>
                            {progressPercent.toFixed(0)}%
                        </div>
                    </div>
                    {isSuperAdmin && config.status === 'pending' && (
                        <button onClick={onStartGame} className="mt-4 w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 animate-pulse">
                            FORZA AVVIO GIOCO (ADMIN)
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLONNA SX: Tabellone & Vincitori */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-red-100">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-slate-700 uppercase tracking-widest">Numeri Estratti</h2>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Prossima in</p>
                                    <p className="text-lg font-black text-red-500 font-mono leading-none">{timeLeft}</p>
                                </div>
                            </div>
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
                        </div>

                        {/* Vincitori */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                            <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase flex items-center gap-2">
                                <TrophyIcon className="h-4 w-4 text-orange-500" /> Albo D'Oro Vincite
                            </h3>
                            {wins.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">In attesa dei fortunati...</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {wins.slice().reverse().map(win => (
                                        <div key={win.id} className="bg-yellow-50 p-2 rounded border border-yellow-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-xs text-slate-800">{win.playerName}</p>
                                                <p className="text-[10px] text-slate-500">{new Date(win.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                            <span className="bg-yellow-400 text-red-900 text-[10px] font-black px-2 py-1 rounded-full uppercase">
                                                {win.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COLONNA DX: Area Personale */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 h-fit">
                        {!selectedStaffId ? (
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 text-center">Chi sei?</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {staff.map(s => (
                                        <button key={s.id} onClick={() => setSelectedStaffId(s.id)} className="flex flex-col items-center gap-1 group">
                                            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                {s.icon || s.name.charAt(0)}
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">{s.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-fade-in">
                                <button onClick={() => setSelectedStaffId(null)} className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1">← Cambia utente</button>
                                
                                <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-xl shadow-sm">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                                        {selectedStaffMember?.icon}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{selectedStaffMember?.name}</p>
                                        <p className="text-xs text-slate-500">{myTickets.length} cartelle possedute</p>
                                    </div>
                                </div>

                                {/* ACQUISTO */}
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-4 text-white mb-6">
                                    <h4 className="font-bold text-sm mb-2 flex items-center gap-2"><TicketIcon className="h-4 w-4"/> Compra Cartelle</h4>
                                    <input 
                                        type="range" min="1" max="6" value={buyQuantity} 
                                        onChange={e => setBuyQuantity(parseInt(e.target.value))} 
                                        className="w-full accent-yellow-400 mb-2"
                                    />
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-mono">{buyQuantity} {buyQuantity === 1 ? 'cartella' : 'cartelle'}</span>
                                        <span className="text-xl font-black text-yellow-300">
                                            €{buyQuantity === 6 ? config.ticketPriceBundle.toFixed(2) : (buyQuantity * config.ticketPriceSingle).toFixed(2)}
                                        </span>
                                    </div>
                                    <button onClick={handleBuy} className="w-full bg-yellow-400 hover:bg-yellow-300 text-red-900 font-bold py-2 rounded-lg shadow text-sm">
                                        CONFERMA ACQUISTO
                                    </button>
                                </div>

                                {/* LE MIE CARTELLE */}
                                <h4 className="font-bold text-slate-700 text-sm mb-2 uppercase">Le mie cartelle</h4>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                    {myTickets.map((ticket, idx) => (
                                        <div key={ticket.id} className="bg-white border border-slate-300 p-2 rounded-lg shadow-sm">
                                            <p className="text-[9px] text-slate-400 mb-1">Cartella #{idx+1}</p>
                                            <div className="grid grid-cols-5 gap-1">
                                                {ticket.numbers.map(n => (
                                                    <div key={n} className={`aspect-square flex items-center justify-center text-xs font-bold rounded ${config.extractedNumbers.includes(n) ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                        {n}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {myTickets.length === 0 && <p className="text-xs text-slate-400 text-center">Non hai ancora cartelle.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TombolaView;
