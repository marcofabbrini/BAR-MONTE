import React, { useState, useEffect, useMemo } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin, StaffMember } from '../types';
import { BackArrowIcon, TrophyIcon, TicketIcon, GridIcon, CashIcon } from './Icons';

interface TombolaViewProps {
    onGoBack: () => void;
    config: TombolaConfig;
    tickets: TombolaTicket[];
    wins: TombolaWin[];
    onBuyTicket: (staffId: string, quantity: number) => Promise<void>;
    staff: StaffMember[];
    onStartGame: () => Promise<void>;
    isSuperAdmin: boolean | null;
    onTransferFunds: (amount: number, gameName: string) => Promise<void>;
}

const TombolaView: React.FC<TombolaViewProps> = ({ onGoBack, config, tickets, wins, onBuyTicket, staff, onStartGame, isSuperAdmin, onTransferFunds }) => {
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [buyQuantity, setBuyQuantity] = useState(1);
    
    // Fallback sicuri per i dati
    const safeTickets = Array.isArray(tickets) ? tickets : [];
    const safeWins = Array.isArray(wins) ? wins : [];
    
    // Calcolo statistiche con controlli di sicurezza
    const totalTickets = safeTickets.length;
    const maxTickets = config?.maxTickets || 168; // fallback
    const progressPercent = maxTickets > 0 ? Math.min((totalTickets / maxTickets) * 100, 100) : 0;
    const minStart = config?.minTicketsToStart || 0;
    const ticketsNeededToStart = Math.max(0, minStart - totalTickets);
    
    const nextExtractionTime = useMemo(() => {
        if (!config?.lastExtraction) return new Date();
        return new Date(new Date(config.lastExtraction).getTime() + 2 * 60 * 60 * 1000);
    }, [config?.lastExtraction]);
    
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            if (!config || config.status === 'pending') {
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
    }, [config?.lastExtraction, config?.status, nextExtractionTime]);

    const handleBuy = async () => {
        if (!selectedStaffId) return;
        await onBuyTicket(selectedStaffId, buyQuantity);
        alert(`Acquistate ${buyQuantity} cartelle!`);
    };

    const myTickets = useMemo(() => {
        return safeTickets.filter(t => t.playerId === selectedStaffId);
    }, [safeTickets, selectedStaffId]);

    const selectedStaffMember = staff.find(s => s.id === selectedStaffId);

    const formatTicketToGrid = (numbers: number[]) => {
        // Safety check: se numbers è undefined, ritorna griglia vuota
        if (!numbers || !Array.isArray(numbers)) return Array(3).fill(Array(9).fill(null));

        const grid: (number | null)[][] = [[], [], []];
        const cols: number[][] = Array.from({length: 9}, () => []);
        numbers.forEach(n => {
            if (typeof n !== 'number') return;
            const colIdx = n === 90 ? 8 : Math.floor(n / 10);
            if (colIdx >= 0 && colIdx < 9) cols[colIdx].push(n);
        });
        
        for(let r=0; r<3; r++) grid[r] = Array(9).fill(null);

        cols.forEach((colNums, colIdx) => {
            colNums.forEach((n, i) => {
                let placed = false;
                for(let r=0; r<3; r++) {
                    const countRow = grid[r].filter(x => x !== null).length;
                    if (grid[r][colIdx] === null && countRow < 5) {
                        grid[r][colIdx] = n;
                        placed = true;
                        break;
                    }
                }
                if(!placed) {
                     for(let r=0; r<3; r++) {
                        if (grid[r][colIdx] === null) { grid[r][colIdx] = n; break; }
                     }
                }
            });
        });
        return grid;
    };

    // CALCOLO GIOCATORI ATTIVI CON SICUREZZA
    const activePlayers = useMemo(() => {
        const playersMap = new Map<string, { id:string, name: string, icon: string, ticketCount: number, spent: number, wins: number }>();
        
        safeTickets.forEach(t => {
            if (!t || !t.playerId) return; // Skip invalid tickets

            const current = playersMap.get(t.playerId) || { 
                id: t.playerId, 
                name: t.playerName || 'Sconosciuto', 
                icon: staff.find(s=>s.id===t.playerId)?.icon || '👤', 
                ticketCount: 0, 
                spent: 0, 
                wins: 0 
            };
            current.ticketCount++;
            
            // FIX: Controllo esistenza array numbers
            const numCount = Array.isArray(t.numbers) ? t.numbers.length : 0;
            const price = config?.ticketPriceSingle || 1;
            
            // Stima spesa (solo se cartella valida)
            current.spent += (numCount === 15 ? price : 0);
            playersMap.set(t.playerId, current);
        });

        safeWins.forEach(w => {
            if (!w || !w.ticketId) return;
            const ticket = safeTickets.find(t => t.id === w.ticketId);
            if (ticket && ticket.playerId) {
                const player = playersMap.get(ticket.playerId);
                if (player) player.wins++;
            }
        });

        return Array.from(playersMap.values());
    }, [safeTickets, safeWins, staff, config]);

    const handleTransfer = async () => {
        const jackpot = config?.jackpot || 0;
        if(jackpot <= 0) return;
        if(window.confirm(`Versare €${jackpot.toFixed(2)} in Cassa Bar?`)) {
            await onTransferFunds(jackpot, 'Tombola');
        }
    };
    
    // Se config non è caricata (double check)
    if (!config) return <div className="flex items-center justify-center min-h-screen text-slate-500">Caricamento Tombola...</div>;

    const extractedNumbers = Array.isArray(config.extractedNumbers) ? config.extractedNumbers : [];

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 relative font-sans">
            <header className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-white/90 hover:text-white">
                        <BackArrowIcon className="h-5 w-5" /> Esci
                    </button>
                    <h1 className="text-xl font-black uppercase tracking-wider flex items-center gap-2">
                        <TrophyIcon className="h-6 w-6 text-yellow-300" /> Tombola 2025
                    </h1>
                    <div className="text-right">
                        <p className="text-[9px] uppercase opacity-80 font-bold">Montepremi</p>
                        <p className="text-xl font-black text-yellow-300">€{(config.jackpot || 0).toFixed(2)}</p>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 max-w-6xl mx-auto w-full space-y-6">
                
                {/* Status Bar & Admin Controls */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Cartelle Vendute</span>
                        <span className="text-sm font-black text-slate-800">{totalTickets} / {config.maxTickets}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden relative">
                        <div className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 drop-shadow-sm">{progressPercent.toFixed(0)}%</span>
                    </div>
                    {isSuperAdmin && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row gap-2">
                            {config.status === 'pending' ? (
                                <button onClick={onStartGame} disabled={ticketsNeededToStart > 0} className={`flex-1 font-bold py-3 rounded-lg shadow-md uppercase tracking-wider ${ticketsNeededToStart > 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 animate-pulse'}`}>
                                    🚀 Avvia Estrazione
                                </button>
                            ) : (
                                <div className="flex-1 text-center text-xs font-bold text-green-600 bg-green-50 py-2 rounded border border-green-200 flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> GIOCO ATTIVO - TIMER: {timeLeft}
                                </div>
                            )}
                            <button onClick={handleTransfer} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-900 shadow-md uppercase tracking-wider flex items-center justify-center gap-2">
                                <CashIcon className="h-5 w-5" /> Versa Utile al Bar
                            </button>
                        </div>
                    )}
                </div>

                {/* Dashboard Giocatori Attivi */}
                {activePlayers.length > 0 && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <span className="bg-green-100 text-green-600 p-1 rounded">👥</span> Giocatori in Gara
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {activePlayers.map((player, idx) => (
                                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center relative overflow-hidden group">
                                    {player.wins > 0 && (
                                        <div className="absolute top-0 right-0 bg-yellow-400 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">
                                            🏆 {player.wins}
                                        </div>
                                    )}
                                    <div className="text-2xl mb-1 filter drop-shadow-sm group-hover:scale-110 transition-transform">{player.icon}</div>
                                    <span className="font-bold text-xs text-slate-800 truncate w-full text-center">{player.name}</span>
                                    <div className="flex gap-2 text-[9px] text-slate-500 mt-1">
                                        <span className="bg-white px-1 rounded border border-slate-200">🎟️ {player.ticketCount}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLONNA SX: Tabellone & Vincitori */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-red-100 relative">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-slate-700 uppercase tracking-widest text-sm">Numeri Estratti</h2>
                            </div>
                            <div className="grid grid-cols-10 gap-1 md:gap-2">
                                {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                                    <div 
                                        key={num} 
                                        className={`aspect-square flex items-center justify-center font-bold rounded-full text-xs md:text-sm shadow-sm transition-all duration-500 ${extractedNumbers.includes(num) ? 'bg-red-500 text-white scale-110 shadow-md ring-2 ring-red-200' : 'bg-slate-50 text-slate-300'}`}
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
                            {safeWins.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-4">In attesa dei fortunati...</p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {safeWins.slice().reverse().map(win => (
                                        <div key={win.id} className="bg-yellow-50 p-2 rounded border border-yellow-100 flex justify-between items-center animate-fade-in">
                                            <div>
                                                <p className="font-bold text-xs text-slate-800">{win.playerName}</p>
                                                <p className="text-[10px] text-slate-500">{new Date(win.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                            <span className="bg-yellow-400 text-red-900 text-[10px] font-black px-2 py-1 rounded-full uppercase shadow-sm">
                                                {win.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DX: Area Personale */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 h-fit">
                        {!selectedStaffId ? (
                            <div>
                                <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 text-center">Chi sei?</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {staff.map(s => (
                                        <button key={s.id} onClick={() => setSelectedStaffId(s.id)} className="flex flex-col items-center gap-1 group">
                                            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-xl group-hover:scale-110 transition-transform group-hover:border-red-400">
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
                                
                                <div className="flex items-center gap-3 mb-6 bg-white p-3 rounded-xl shadow-sm border-l-4 border-red-500">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-2xl">
                                        {selectedStaffMember?.icon}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{selectedStaffMember?.name}</p>
                                        <p className="text-xs text-slate-500">{myTickets.length} cartelle possedute</p>
                                    </div>
                                </div>

                                {/* ACQUISTO */}
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-4 text-white mb-6 border border-indigo-500">
                                    <h4 className="font-bold text-sm mb-3 flex items-center gap-2 uppercase tracking-wide"><TicketIcon className="h-4 w-4"/> Acquista</h4>
                                    <div className="flex gap-2 mb-4">
                                        <button onClick={() => setBuyQuantity(1)} className={`flex-1 py-2 rounded font-bold text-xs ${buyQuantity === 1 ? 'bg-yellow-400 text-red-900 shadow-md' : 'bg-white/10 hover:bg-white/20'}`}>1x (€{config.ticketPriceSingle})</button>
                                        <button onClick={() => setBuyQuantity(6)} className={`flex-1 py-2 rounded font-bold text-xs ${buyQuantity === 6 ? 'bg-yellow-400 text-red-900 shadow-md' : 'bg-white/10 hover:bg-white/20'}`}>6x (€{config.ticketPriceBundle})</button>
                                    </div>
                                    <button onClick={handleBuy} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg shadow text-sm uppercase tracking-wide transition-colors">
                                        Conferma Acquisto
                                    </button>
                                </div>

                                {/* LE MIE CARTELLE */}
                                <h4 className="font-bold text-slate-700 text-sm mb-2 uppercase flex items-center gap-2"><GridIcon className="h-4 w-4"/> Le mie cartelle</h4>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                    {myTickets.map((ticket, idx) => (
                                        <div key={ticket.id} className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                                            <div className="bg-slate-100 px-2 py-1 text-[9px] text-slate-500 font-bold border-b border-slate-200 flex justify-between">
                                                <span>Cartella #{idx+1}</span>
                                                <span>{new Date(ticket.purchaseTime).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="p-1">
                                                {formatTicketToGrid(ticket.numbers).map((row, rIdx) => (
                                                    <div key={rIdx} className="grid grid-cols-9 gap-0.5 mb-0.5 last:mb-0">
                                                        {row.map((num, cIdx) => (
                                                            <div key={cIdx} className={`aspect-square flex items-center justify-center text-[9px] font-bold rounded-sm border ${num ? (extractedNumbers.includes(num) ? 'bg-red-500 text-white border-red-600' : 'bg-slate-50 text-slate-700 border-slate-200') : 'bg-transparent border-transparent'}`}>
                                                                {num}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {myTickets.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Non hai ancora cartelle.</p>}
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