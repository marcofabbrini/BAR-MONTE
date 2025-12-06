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
    const nextExtractionTime = useMemo(() => new Date(new Date(config.lastExtraction).getTime() + 2 * 60 * 60 * 1000), [config.lastExtraction]);
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
    }, [config.lastExtraction, config.status, nextExtractionTime]);

    const handleBuy = async () => {
        if (!selectedStaffId) return;
        await onBuyTicket(selectedStaffId, buyQuantity);
        alert(`Acquistate ${buyQuantity} cartelle!`);
    };

    const myTickets = useMemo(() => {
        return tickets.filter(t => t.playerId === selectedStaffId);
    }, [tickets, selectedStaffId]);

    const selectedStaffMember = staff.find(s => s.id === selectedStaffId);

    // LOGICA VISUALIZZAZIONE CARTELLA 3x9 REALISTICA
    const renderTicketRow = (rowNumbers: (number | null)[]) => (
        <div className="grid grid-cols-9 gap-0.5 bg-white border border-slate-300 p-1 mb-0.5 last:mb-0">
            {rowNumbers.map((num, idx) => (
                <div key={idx} className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded-sm border border-slate-100 ${num ? (config.extractedNumbers.includes(num) ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-700') : 'bg-transparent'}`}>
                    {num || ''}
                </div>
            ))}
        </div>
    );

    // Helper per distribuire i numeri in 3 righe x 9 colonne (decadi)
    const formatTicketToGrid = (numbers: number[]) => {
        const grid: (number | null)[][] = [[], [], []];
        const cols: number[][] = Array.from({length: 9}, () => []);
        
        // Distribuisci nelle colonne (decadi)
        numbers.forEach(n => {
            const colIdx = n === 90 ? 8 : Math.floor(n / 10);
            cols[colIdx].push(n);
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

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 relative font-sans">
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
                        <p className="text-[9px] uppercase opacity-80 font-bold">Montepremi</p>
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
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden relative">
                        <div className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 drop-shadow-sm">{progressPercent.toFixed(0)}%</span>
                    </div>
                    {isSuperAdmin && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            {config.status === 'pending' ? (
                                <button onClick={onStartGame} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 shadow-md animate-pulse uppercase tracking-wider">
                                    🚀 AVVIA ESTRAZIONE (SUPER ADMIN)
                                </button>
                            ) : (
                                <div className="text-center text-xs font-bold text-green-600 bg-green-50 py-2 rounded border border-green-200">GIOCO ATTIVO - TIMER: {timeLeft}</div>
                            )}
                        </div>
                    )}
                </div>

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
                                        className={`aspect-square flex items-center justify-center font-bold rounded-full text-xs md:text-sm shadow-sm transition-all duration-500 ${config.extractedNumbers.includes(num) ? 'bg-red-500 text-white scale-110 shadow-md ring-2 ring-red-200' : 'bg-slate-50 text-slate-300'}`}
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
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {wins.slice().reverse().map(win => (
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

                    {/* COLONNA DX: Area Personale */}
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
                                                            <div key={cIdx} className={`aspect-square flex items-center justify-center text-[9px] font-bold rounded-sm border ${num ? (config.extractedNumbers.includes(num) ? 'bg-red-500 text-white border-red-600' : 'bg-slate-50 text-slate-700 border-slate-200') : 'bg-transparent border-transparent'}`}>
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