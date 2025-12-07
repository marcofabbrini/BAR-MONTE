import React, { useState, useEffect, useMemo } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin, StaffMember } from '../types';
import { BackArrowIcon, TrophyIcon, TicketIcon, GridIcon, CashIcon, PlusIcon } from './Icons';

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
    // Stati per Wizard Acquisto
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1); // 1: Chi sei, 2: Quanto compri, 3: Conferma
    const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
    const [buyQuantity, setBuyQuantity] = useState(1);
    
    // Stati per visualizzazione My Tickets
    const [viewMyTicketsId, setViewMyTicketsId] = useState<string | null>(null);

    // Calcolo statistiche
    const totalTickets = tickets.length;
    const progressPercent = Math.min((totalTickets / config.maxTickets) * 100, 100);
    const ticketsNeededToStart = Math.max(0, config.minTicketsToStart - totalTickets);
    const nextExtractionTime = useMemo(() => new Date(new Date(config.lastExtraction).getTime() + 2 * 60 * 60 * 1000), [config.lastExtraction]);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            if (config.status === 'pending') { setTimeLeft("In attesa avvio..."); return; }
            const now = new Date().getTime();
            const distance = nextExtractionTime.getTime() - now;
            if (distance < 0) { setTimeLeft("Estrazione..."); } 
            else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [config.lastExtraction, config.status, nextExtractionTime]);

    // Wizard Handlers
    const openBuyWizard = () => {
        setIsBuyModalOpen(true);
        setWizardStep(1);
        setSelectedBuyerId(null);
        setBuyQuantity(1);
    };

    const handleConfirmPurchase = async () => {
        if (!selectedBuyerId) return;
        // Controllo limite 6 cartelle per utente (logica frontend)
        const userTickets = tickets.filter(t => t.playerId === selectedBuyerId).length;
        if (userTickets + buyQuantity > 6) {
            alert(`Limite raggiunto! Hai già ${userTickets} cartelle. Massimo 6 per persona.`);
            return;
        }

        await onBuyTicket(selectedBuyerId, buyQuantity);
        setIsBuyModalOpen(false);
    };

    const myTickets = useMemo(() => {
        if (!viewMyTicketsId) return [];
        return tickets.filter(t => t.playerId === viewMyTicketsId);
    }, [tickets, viewMyTicketsId]);

    const activePlayers = useMemo(() => {
        const playersMap = new Map<string, { id:string, name: string, icon: string, ticketCount: number, spent: number, wins: number }>();
        tickets.forEach(t => {
            const current = playersMap.get(t.playerId) || { id: t.playerId, name: t.playerName, icon: staff.find(s=>s.id===t.playerId)?.icon || '👤', ticketCount: 0, spent: 0, wins: 0 };
            current.ticketCount++;
            current.spent += (t.numbers.length === 15 ? (config.ticketPriceSingle || 1) : 0); // Approx
            playersMap.set(t.playerId, current);
        });
        wins.forEach(w => {
            const ticket = tickets.find(t => t.id === w.ticketId);
            if (ticket) { const player = playersMap.get(ticket.playerId); if (player) player.wins++; }
        });
        return Array.from(playersMap.values());
    }, [tickets, wins, staff, config]);

    const handleTransfer = async () => {
        if(config.jackpot <= 0) return;
        if(window.confirm(`Versare €${config.jackpot.toFixed(2)} in Cassa Bar?`)) {
            await onTransferFunds(config.jackpot, 'Tombola');
        }
    };

    // Helper Griglia 3x9
    const formatTicketToGrid = (numbers: number[]) => {
        const grid: (number | null)[][] = [[], [], []];
        const cols: number[][] = Array.from({length: 9}, () => []);
        numbers.forEach(n => { const colIdx = n === 90 ? 8 : Math.floor(n / 10); cols[colIdx].push(n); });
        for(let r=0; r<3; r++) grid[r] = Array(9).fill(null);
        cols.forEach((colNums, colIdx) => {
            colNums.forEach((n, i) => {
                let placed = false;
                for(let r=0; r<3; r++) {
                    const countRow = grid[r].filter(x => x !== null).length;
                    if (grid[r][colIdx] === null && countRow < 5) { grid[r][colIdx] = n; placed = true; break; }
                }
                if(!placed) { for(let r=0; r<3; r++) { if (grid[r][colIdx] === null) { grid[r][colIdx] = n; break; } } }
            });
        });
        return grid;
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-100 relative font-sans">
            <header className="bg-red-600 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold text-white/90 hover:text-white"><BackArrowIcon className="h-5 w-5" /> Esci</button>
                    <h1 className="text-xl font-black uppercase tracking-wider flex items-center gap-2"><TrophyIcon className="h-6 w-6 text-yellow-300" /> Tombola 2025</h1>
                    <div className="text-right">
                        <p className="text-[9px] uppercase opacity-80 font-bold">Montepremi</p>
                        <p className="text-xl font-black text-yellow-300">€{(config.jackpot || 0).toFixed(2)}</p>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 max-w-6xl mx-auto w-full space-y-6">
                
                {/* BARRA DI STATO AVANZATA */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Vendute</span>
                            <span className="text-lg font-black text-slate-700">{totalTickets}</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">Totali</span>
                            <span className="text-lg font-black text-slate-700">{config.maxTickets}</span>
                        </div>
                        <div className={`p-2 rounded-lg border ${ticketsNeededToStart > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                            <span className={`block text-[9px] font-bold uppercase ${ticketsNeededToStart > 0 ? 'text-red-400' : 'text-green-500'}`}>All'avvio</span>
                            <span className={`text-lg font-black ${ticketsNeededToStart > 0 ? 'text-red-600' : 'text-green-600'}`}>{ticketsNeededToStart > 0 ? `-${ticketsNeededToStart}` : 'PRONTI'}</span>
                        </div>
                    </div>
                    
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden relative mb-4">
                        <div className="bg-gradient-to-r from-green-500 to-green-400 h-4 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 drop-shadow-sm">{progressPercent.toFixed(0)}%</span>
                    </div>

                    <button onClick={openBuyWizard} className="w-full bg-yellow-400 hover:bg-yellow-500 text-red-900 font-black py-4 rounded-xl shadow-md uppercase tracking-widest text-lg flex items-center justify-center gap-2 animate-bounce-slow">
                        <TicketIcon className="h-6 w-6" /> Acquista Cartelle
                    </button>

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
                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><span className="bg-green-100 text-green-600 p-1 rounded">👥</span> Giocatori in Gara</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {activePlayers.map((player) => (
                                <button key={player.id} onClick={() => setViewMyTicketsId(player.id)} className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center relative overflow-hidden group hover:border-primary hover:shadow-md transition-all">
                                    {player.wins > 0 && <div className="absolute top-0 right-0 bg-yellow-400 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg shadow-sm">🏆 {player.wins}</div>}
                                    <div className="text-2xl mb-1 filter drop-shadow-sm group-hover:scale-110 transition-transform">{player.icon}</div>
                                    <span className="font-bold text-xs text-slate-800 truncate w-full text-center">{player.name}</span>
                                    <div className="flex gap-2 text-[9px] text-slate-500 mt-1">
                                        <span className="bg-white px-1 rounded border border-slate-200">🎟️ {player.ticketCount}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SX: Tabellone & Vincitori */}
                    <div className="space-y-6 lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-red-100 relative">
                            <div className="flex justify-between items-center mb-4"><h2 className="font-bold text-slate-700 uppercase tracking-widest text-sm">Numeri Estratti</h2></div>
                            <div className="grid grid-cols-10 gap-1 md:gap-2">
                                {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                                    <div key={num} className={`aspect-square flex items-center justify-center font-bold rounded-full text-xs md:text-sm shadow-sm transition-all duration-500 ${config.extractedNumbers.includes(num) ? 'bg-red-500 text-white scale-110 shadow-md ring-2 ring-red-200' : 'bg-slate-50 text-slate-300'}`}>{num}</div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                            <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase flex items-center gap-2"><TrophyIcon className="h-4 w-4 text-orange-500" /> Albo D'Oro Vincite</h3>
                            {wins.length === 0 ? <p className="text-xs text-slate-400 italic text-center py-4">In attesa dei fortunati...</p> : (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {wins.slice().reverse().map(win => (
                                        <div key={win.id} className="bg-yellow-50 p-2 rounded border border-yellow-100 flex justify-between items-center animate-fade-in">
                                            <div><p className="font-bold text-xs text-slate-800">{win.playerName}</p><p className="text-[10px] text-slate-500">{new Date(win.timestamp).toLocaleTimeString()}</p></div>
                                            <span className="bg-yellow-400 text-red-900 text-[10px] font-black px-2 py-1 rounded-full uppercase shadow-sm">{win.type}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DX: Viewer Cartelle (Read Only) */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 h-fit">
                        <h4 className="font-bold text-slate-700 text-sm mb-2 uppercase flex items-center gap-2"><GridIcon className="h-4 w-4"/> {viewMyTicketsId ? `Cartelle di ${staff.find(s=>s.id===viewMyTicketsId)?.name}` : 'Seleziona un giocatore'}</h4>
                        {viewMyTicketsId && myTickets.length > 0 ? (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                {myTickets.map((ticket, idx) => (
                                    <div key={ticket.id} className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                                        <div className="bg-slate-100 px-2 py-1 text-[9px] text-slate-500 font-bold border-b border-slate-200 flex justify-between"><span>Cartella #{idx+1}</span></div>
                                        <div className="p-1">
                                            {formatTicketToGrid(ticket.numbers).map((row, rIdx) => (
                                                <div key={rIdx} className="grid grid-cols-9 gap-0.5 mb-0.5 last:mb-0">
                                                    {row.map((num, cIdx) => (
                                                        <div key={cIdx} className={`aspect-square flex items-center justify-center text-[9px] font-bold rounded-sm border ${num ? (config.extractedNumbers.includes(num) ? 'bg-red-500 text-white border-red-600' : 'bg-slate-50 text-slate-700 border-slate-200') : 'bg-transparent border-transparent'}`}>{num}</div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-xs text-slate-400 text-center py-10">Clicca su un giocatore in alto per vedere le sue cartelle.</p>}
                    </div>
                </div>
            </main>

            {/* WIZARD MODALE ACQUISTO */}
            {isBuyModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
                        <div className="bg-red-600 p-4 text-white flex justify-between items-center">
                            <h2 className="font-bold text-lg flex items-center gap-2"><TicketIcon className="h-6 w-6"/> Acquista Cartelle</h2>
                            <button onClick={() => setIsBuyModalOpen(false)} className="bg-white/20 hover:bg-white/30 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                        </div>
                        <div className="p-6">
                            {/* STEP 1: CHI SEI */}
                            {wizardStep === 1 && (
                                <>
                                    <h3 className="text-center text-xl font-bold text-slate-800 mb-6">Chi sta comprando?</h3>
                                    <div className="grid grid-cols-4 gap-4">
                                        {staff.map(s => (
                                            <button key={s.id} onClick={() => { setSelectedBuyerId(s.id); setWizardStep(2); }} className="flex flex-col items-center gap-2 group p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                                <div className="w-16 h-16 rounded-full bg-white shadow-md border-2 border-slate-100 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:border-red-500 transition-all">{s.icon || '👤'}</div>
                                                <span className="font-bold text-xs text-slate-600 group-hover:text-red-600">{s.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            {/* STEP 2: QUANTITA */}
                            {wizardStep === 2 && (
                                <>
                                    <h3 className="text-center text-xl font-bold text-slate-800 mb-6">Ciao <span className="text-red-600">{staff.find(s=>s.id===selectedBuyerId)?.name}</span>! Quante ne vuoi?</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <button onClick={() => setBuyQuantity(1)} className={`p-6 rounded-2xl border-4 flex flex-col items-center gap-2 transition-all ${buyQuantity === 1 ? 'border-red-500 bg-red-50 shadow-lg scale-105' : 'border-slate-100 hover:border-red-200'}`}>
                                            <span className="text-3xl">🎟️</span>
                                            <span className="font-black text-lg">Singola</span>
                                            <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm font-bold">€{config.ticketPriceSingle}</span>
                                        </button>
                                        <button onClick={() => setBuyQuantity(6)} className={`p-6 rounded-2xl border-4 flex flex-col items-center gap-2 transition-all ${buyQuantity === 6 ? 'border-red-500 bg-red-50 shadow-lg scale-105' : 'border-slate-100 hover:border-red-200'}`}>
                                            <span className="text-3xl">📦</span>
                                            <span className="font-black text-lg">Pack da 6</span>
                                            <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-sm font-bold">€{config.ticketPriceBundle}</span>
                                        </button>
                                    </div>
                                    <button onClick={handleConfirmPurchase} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg uppercase tracking-wider">Conferma e Paga</button>
                                    <button onClick={() => setWizardStep(1)} className="w-full mt-2 text-slate-400 text-sm font-bold py-2">← Indietro</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TombolaView;