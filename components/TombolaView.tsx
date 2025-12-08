
import React, { useState, useEffect, useMemo } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin, StaffMember } from '../types';
import { BackArrowIcon, TrophyIcon, TicketIcon, GridIcon, CashIcon, TrashIcon, SettingsIcon, SaveIcon } from './Icons';

interface TombolaViewProps {
    onGoBack: () => void;
    config: TombolaConfig;
    tickets: TombolaTicket[];
    wins: TombolaWin[];
    onBuyTicket: (staffId: string, quantity: number) => Promise<void>;
    onRefundTicket: (ticketId: string) => Promise<void>;
    staff: StaffMember[];
    onStartGame: () => Promise<void>;
    isSuperAdmin: boolean | null;
    onTransferFunds: (amount: number, gameName: string) => Promise<void>;
    onUpdateTombolaConfig: (cfg: Partial<TombolaConfig>) => Promise<void>;
}

const TombolaView: React.FC<TombolaViewProps> = ({ onGoBack, config, tickets, wins, onBuyTicket, onRefundTicket, staff, onStartGame, isSuperAdmin, onTransferFunds, onUpdateTombolaConfig }) => {
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [buyQuantity, setBuyQuantity] = useState(1);
    
    const [editPriceSingle, setEditPriceSingle] = useState(config?.ticketPriceSingle || 1);
    const [editPriceBundle, setEditPriceBundle] = useState(config?.ticketPriceBundle || 5);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    
    useEffect(() => {
        if(config) {
            setEditPriceSingle(config.ticketPriceSingle);
            setEditPriceBundle(config.ticketPriceBundle);
        }
    }, [config]);

    const totalTickets = tickets ? tickets.length : 0;
    const maxTickets = config?.maxTickets || 168; 
    const progressPercent = maxTickets > 0 ? Math.min((totalTickets / maxTickets) * 100, 100) : 0;
    const minStart = config?.minTicketsToStart || 0;
    const ticketsNeededToStart = Math.max(0, minStart - totalTickets);
    
    const extractedNumbersSafe = useMemo(() => config?.extractedNumbers || [], [config]);

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
        try {
            await onBuyTicket(selectedStaffId, buyQuantity);
            alert(`Acquistate ${buyQuantity} cartelle!`);
        } catch (e: any) {
            alert(e.message || "Errore durante l'acquisto.");
        }
    };

    const handleSingleRefund = async (ticketId: string) => {
        if (window.confirm("Annullare questa cartella specifica?")) {
            try {
                await onRefundTicket(ticketId);
            } catch (e: any) {
                alert(e.message);
            }
        }
    };

    const handleRefundAllPlayer = async (playerId: string, playerName: string) => {
        if (!isSuperAdmin) return;
        const playerTickets = tickets.filter(t => t.playerId === playerId);
        if (playerTickets.length === 0) return;

        if (window.confirm(`ATTENZIONE ADMIN:\nVuoi revocare TUTTE le ${playerTickets.length} cartelle di ${playerName}?\nL'importo verrà rimborsato e il montepremi aggiornato.`)) {
            try {
                // Eseguiamo i rimborsi uno per uno (o potremmo fare un batch backend, ma qui usiamo la funzione esistente)
                for (const t of playerTickets) {
                    await onRefundTicket(t.id);
                }
                alert("Rimborso completato.");
            } catch (e: any) {
                console.error(e);
                alert("Errore durante il rimborso massivo. Controlla la console.");
            }
        }
    };

    const handleSaveConfig = async () => {
        try {
            await onUpdateTombolaConfig({
                ticketPriceSingle: Number(editPriceSingle),
                ticketPriceBundle: Number(editPriceBundle)
            });
            alert("Configurazione prezzi aggiornata!");
            setIsConfigOpen(false);
        } catch (e) {
            console.error(e);
            alert("Errore nel salvataggio della configurazione.");
        }
    };

    const myTickets = useMemo(() => {
        if (!tickets) return [];
        return tickets.filter(t => t.playerId === selectedStaffId);
    }, [tickets, selectedStaffId]);

    const selectedStaffMember = staff.find(s => s.id === selectedStaffId);

    const formatTicketToGrid = (numbers: number[]) => {
        if (!numbers || !Array.isArray(numbers)) return Array.from({length: 3}, () => Array(9).fill(null));
        const grid: (number | null)[][] = Array.from({length: 3}, () => Array(9).fill(null));
        const cols: number[][] = Array.from({length: 9}, () => []);
        numbers.forEach(n => {
            const colIdx = n === 90 ? 8 : Math.floor(n / 10);
            cols[colIdx].push(n);
        });
        cols.forEach((colNums, colIdx) => {
            colNums.forEach((n) => {
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

    const activePlayers = useMemo(() => {
        if (!tickets) return [];
        const playersMap = new Map<string, { id:string, name: string, icon: string, ticketCount: number, spent: number, wins: number }>();
        tickets.forEach(t => {
            const current = playersMap.get(t.playerId) || { 
                id: t.playerId, 
                name: t.playerName, 
                icon: staff.find(s=>s.id===t.playerId)?.icon || '👤', 
                ticketCount: 0, 
                spent: 0, 
                wins: 0 
            };
            current.ticketCount++;
            const numCount = t.numbers ? t.numbers.length : 0;
            const price = config?.ticketPriceSingle || 1;
            current.spent += (numCount === 15 ? price : 0);
            playersMap.set(t.playerId, current);
        });
        if (wins) {
            wins.forEach(w => {
                const ticket = tickets.find(t => t.id === w.ticketId);
                if (ticket) {
                    const player = playersMap.get(ticket.playerId);
                    if (player) player.wins++;
                }
            });
        }
        return Array.from(playersMap.values());
    }, [tickets, wins, staff, config]);

    const handleTransfer = async () => {
        if((config?.jackpot || 0) <= 0) return;
        if(window.confirm(`Versare €${(config.jackpot || 0).toFixed(2)} in Cassa Bar?`)) {
            await onTransferFunds(config.jackpot, 'Tombola');
        }
    };
    
    if (!config) return <div className="flex items-center justify-center min-h-screen">Caricamento Tombola...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-amber-50 relative font-serif">
            <header className="bg-red-800 text-yellow-100 p-3 shadow-xl sticky top-0 z-50 border-b-4 border-yellow-500">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold hover:text-white transition-colors">
                        <BackArrowIcon className="h-5 w-5" /> Esci
                    </button>
                    <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
                        <TrophyIcon className="h-6 w-6 text-yellow-400" /> Tombola VVF
                    </h1>
                    <div className="text-right bg-black/20 px-3 py-1 rounded-lg">
                        <p className="text-[9px] uppercase opacity-80 font-bold text-yellow-200">Montepremi</p>
                        <p className="text-xl font-black text-yellow-400">€{(config.jackpot || 0).toFixed(2)}</p>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 w-full max-w-7xl mx-auto space-y-6">
                
                {/* Status Bar */}
                {!selectedStaffId && (
                    <div className="bg-white p-4 rounded-xl shadow-md border border-amber-200">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-amber-800 uppercase">Avanzamento Vendite</span>
                            <span className="text-sm font-black text-amber-900">{totalTickets} / {config.maxTickets}</span>
                        </div>
                        <div className="w-full bg-amber-100 rounded-full h-3 overflow-hidden border border-amber-200">
                            <div className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        {isSuperAdmin && (
                            <div className="mt-4 flex gap-2">
                                <button onClick={onStartGame} disabled={ticketsNeededToStart > 0 || config.status !== 'pending'} className={`flex-1 font-bold py-2 rounded shadow uppercase text-xs ${ticketsNeededToStart > 0 || config.status !== 'pending' ? 'bg-slate-300 text-slate-500' : 'bg-green-600 text-white animate-pulse'}`}>
                                    {config.status === 'active' ? 'Estrazione in corso' : 'Avvia Gioco'}
                                </button>
                                <button onClick={handleTransfer} className="flex-1 bg-amber-800 text-white font-bold py-2 rounded shadow uppercase text-xs">
                                    Versa Utile
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* AREA DI GIOCO CENTRALE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* COLONNA SX: TABELLONE (Visibile se nessuno selezionato o su schermi grandi) */}
                    <div className={`lg:col-span-7 ${selectedStaffId ? 'hidden lg:block' : 'block'}`}>
                        {/* TABELLONE REALISTICO CLASSICO */}
                        <div className="bg-amber-100 rounded-lg shadow-2xl border-8 border-amber-800 p-2 relative">
                            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-800 text-amber-100 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-md">
                                Tabellone
                            </div>
                            <div className="grid grid-cols-10 gap-1 mt-2">
                                {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                                    <div 
                                        key={num} 
                                        className={`
                                            aspect-square flex items-center justify-center font-bold rounded-full text-xs md:text-sm shadow-inner
                                            ${extractedNumbersSafe.includes(num) 
                                                ? 'bg-red-600 text-white ring-2 ring-red-300 scale-105 shadow-md' 
                                                : 'bg-white text-amber-900/40'}
                                        `}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VINCITORI */}
                        <div className="mt-4 bg-white/80 rounded-xl border border-amber-200 p-3">
                            <h3 className="font-bold text-amber-800 text-xs uppercase flex items-center gap-2 mb-2">
                                <TrophyIcon className="h-4 w-4 text-yellow-600" /> Ultime Vincite
                            </h3>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {wins.slice().reverse().map(win => (
                                    <div key={win.id} className="bg-yellow-100 px-3 py-1 rounded-full border border-yellow-300 flex items-center gap-2 flex-shrink-0 shadow-sm">
                                        <span className="font-black text-amber-900 text-xs">{win.playerName}</span>
                                        <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 rounded uppercase">{win.type}</span>
                                    </div>
                                ))}
                                {wins.length === 0 && <span className="text-xs text-amber-400 italic">Nessuna vincita ancora...</span>}
                            </div>
                        </div>
                    </div>

                    {/* COLONNA DX: SELEZIONE E CARTELLE */}
                    <div className={`lg:col-span-5 ${selectedStaffId ? 'col-span-12' : ''}`}>
                        {!selectedStaffId ? (
                            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                                <h3 className="text-sm font-bold text-amber-800 uppercase mb-4 text-center">Giocatori in Gara</h3>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {activePlayers.map((player, idx) => (
                                        <div key={idx} className="relative group">
                                            <button 
                                                onClick={() => setSelectedStaffId(player.id)}
                                                className="w-full bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center hover:border-amber-400 hover:shadow-md transition-all"
                                            >
                                                <div className="text-2xl mb-1">{player.icon}</div>
                                                <span className="font-bold text-xs text-slate-800 truncate w-full text-center">{player.name}</span>
                                                <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 rounded mt-1 font-bold">{player.ticketCount} Cartelle</span>
                                            </button>
                                            
                                            {/* ADMIN DELETE BUTTON */}
                                            {isSuperAdmin && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleRefundAllPlayer(player.id, player.name); }}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center shadow-md hover:bg-red-700 z-10"
                                                    title="Revoca tutte le cartelle (Admin)"
                                                >
                                                    <TrashIcon className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {/* Pulsante aggiungi giocatore (selettore staff) */}
                                    {staff.filter(s => !activePlayers.find(p => p.id === s.id)).map(s => (
                                        <button key={s.id} onClick={() => setSelectedStaffId(s.id)} className="w-full bg-white p-2 rounded-xl border border-dashed border-slate-300 flex flex-col items-center opacity-60 hover:opacity-100 hover:border-amber-400 transition-all">
                                            <div className="text-xl grayscale">{s.icon || '👤'}</div>
                                            <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">{s.name.split(' ')[0]}</span>
                                            <span className="text-[9px] text-green-600 mt-1 font-bold">+ Gioca</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center animate-fade-in">
                                <button onClick={() => setSelectedStaffId(null)} className="mb-4 bg-slate-200 hover:bg-slate-300 text-slate-600 px-4 py-1 rounded-full text-xs font-bold shadow-sm transition-colors">
                                    ← Torna al Tabellone
                                </button>
                                
                                <div className="bg-white p-4 rounded-2xl shadow-lg border-2 border-amber-300 w-full max-w-md text-center mb-6">
                                    <div className="text-4xl mb-2">{selectedStaffMember?.icon}</div>
                                    <h2 className="text-xl font-black text-amber-900">{selectedStaffMember?.name}</h2>
                                    <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-4">{myTickets.length} Cartelle Attive</p>
                                    
                                    <div className="flex gap-2 justify-center">
                                        <button onClick={() => setBuyQuantity(1)} className={`px-4 py-2 rounded-lg font-bold text-xs border ${buyQuantity===1 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>1x</button>
                                        <button onClick={() => setBuyQuantity(6)} className={`px-4 py-2 rounded-lg font-bold text-xs border ${buyQuantity===6 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>6x</button>
                                        <button onClick={handleBuy} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase shadow-md transition-colors">
                                            Acquista
                                        </button>
                                    </div>
                                </div>

                                {/* CARTELLE REALISTICHE */}
                                <div className="w-full max-w-md space-y-4">
                                    {myTickets.map((ticket, idx) => (
                                        <div key={ticket.id} className="relative bg-[#fffdf5] p-1 shadow-lg transform transition-transform hover:scale-[1.02]" style={{ border: '1px solid #d4c5a3' }}>
                                            {/* Header Cartella */}
                                            <div className="bg-amber-700 text-amber-50 px-3 py-1 flex justify-between items-center">
                                                <span className="text-[10px] font-serif italic opacity-80">Cartella N. {ticket.id.slice(-4)}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-xs uppercase tracking-widest">Tombola VVF</span>
                                                    {isSuperAdmin && config.status === 'pending' && (
                                                        <button onClick={() => handleSingleRefund(ticket.id)} className="bg-red-500/20 hover:bg-red-500 text-white p-1 rounded transition-colors">
                                                            <TrashIcon className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Griglia Numeri */}
                                            <div className="border-2 border-amber-800 mt-1">
                                                {formatTicketToGrid(ticket.numbers).map((row, rIdx) => (
                                                    <div key={rIdx} className="grid grid-cols-9 bg-amber-800 gap-[1px] border-b-[1px] border-amber-800 last:border-b-0">
                                                        {row.map((num, cIdx) => (
                                                            <div key={cIdx} className={`aspect-[4/3] flex items-center justify-center text-sm md:text-base font-serif font-bold ${num ? (extractedNumbersSafe.includes(num) ? 'bg-red-600 text-white relative overflow-hidden' : 'bg-white text-black') : 'bg-[#f3eacb]'}`}>
                                                                {num && extractedNumbersSafe.includes(num) && (
                                                                    <div className="absolute inset-0 bg-black/10 rounded-full m-1"></div> // Effetto "fagiolo"
                                                                )}
                                                                {num}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {myTickets.length === 0 && (
                                        <div className="text-center p-8 bg-white/50 rounded-xl border-2 border-dashed border-slate-300">
                                            <p className="text-slate-400 font-bold">Nessuna cartella acquistata</p>
                                        </div>
                                    )}
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
