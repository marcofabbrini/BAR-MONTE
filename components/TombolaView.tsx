
import React, { useState, useEffect, useMemo } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin, StaffMember } from '../types';
import { BackArrowIcon, TrophyIcon, TrashIcon } from './Icons';

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
    
    // Stati locali per edit prezzi (se servisse riattivare il modale, qui manteniamo lo stato)
    const [editPriceSingle, setEditPriceSingle] = useState(config?.ticketPriceSingle || 1);
    const [editPriceBundle, setEditPriceBundle] = useState(config?.ticketPriceBundle || 5);
    
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
                for (const t of playerTickets) {
                    await onRefundTicket(t.id);
                }
                alert("Rimborso completato.");
            } catch (e: any) {
                console.error(e);
                alert("Errore durante il rimborso massivo.");
            }
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

    // Helper per i temi delle cartelle
    const getTicketTheme = (idx: number) => {
        const themes = [
            { name: 'Red', bg: 'bg-red-600', border: 'border-red-800', innerBg: 'bg-red-50' },
            { name: 'Blue', bg: 'bg-blue-600', border: 'border-blue-800', innerBg: 'bg-blue-50' },
            { name: 'Green', bg: 'bg-green-600', border: 'border-green-800', innerBg: 'bg-green-50' },
            { name: 'Purple', bg: 'bg-purple-600', border: 'border-purple-800', innerBg: 'bg-purple-50' },
            { name: 'Orange', bg: 'bg-orange-600', border: 'border-orange-800', innerBg: 'bg-orange-50' },
        ];
        return themes[idx % themes.length];
    };
    
    if (!config) return <div className="flex items-center justify-center min-h-screen">Caricamento Tombola...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-stone-200 relative font-serif">
            <header className="bg-red-900 text-yellow-100 p-3 shadow-2xl sticky top-0 z-50 border-b-4 border-yellow-600">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold hover:text-white transition-colors">
                        <BackArrowIcon className="h-5 w-5" /> Esci
                    </button>
                    <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-2 drop-shadow-md text-yellow-400" style={{ textShadow: '2px 2px 0px #7f1d1d' }}>
                        <TrophyIcon className="h-6 w-6" /> Tombola VVF
                    </h1>
                    <div className="text-right bg-black/30 px-4 py-1 rounded-lg border border-yellow-600/30">
                        <p className="text-[9px] uppercase opacity-80 font-bold text-yellow-200">Montepremi</p>
                        <p className="text-xl font-black text-yellow-400 tracking-wider">€{(config.jackpot || 0).toFixed(2)}</p>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 w-full max-w-7xl mx-auto space-y-6">
                
                {/* Status Bar */}
                {!selectedStaffId && (
                    <div className="bg-white p-4 rounded-xl shadow-lg border-b-4 border-stone-300">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-stone-600 uppercase">Avanzamento Vendite</span>
                            <span className="text-sm font-black text-stone-800">{totalTickets} / {config.maxTickets}</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-4 overflow-hidden border-inner shadow-inner">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-400 h-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        {isSuperAdmin && (
                            <div className="mt-4 flex gap-2">
                                <button onClick={onStartGame} disabled={ticketsNeededToStart > 0 || config.status !== 'pending'} className={`flex-1 font-bold py-2 rounded-lg shadow-md border-b-4 active:border-b-0 active:translate-y-1 transition-all uppercase text-xs ${ticketsNeededToStart > 0 || config.status !== 'pending' ? 'bg-stone-300 text-stone-500 border-stone-400' : 'bg-green-600 border-green-800 text-white animate-pulse'}`}>
                                    {config.status === 'active' ? 'Estrazione in corso' : 'Avvia Gioco'}
                                </button>
                                <button onClick={handleTransfer} className="flex-1 bg-amber-700 border-b-4 border-amber-900 text-white font-bold py-2 rounded-lg shadow-md active:border-b-0 active:translate-y-1 transition-all uppercase text-xs">
                                    Versa Utile
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* AREA DI GIOCO CENTRALE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* COLONNA SX: TABELLONE (Legno 3D) */}
                    <div className={`lg:col-span-7 ${selectedStaffId ? 'hidden lg:block' : 'block'}`}>
                        
                        <div className="bg-[#5c3a21] rounded-lg shadow-2xl p-3 border-4 border-[#3e2716] relative">
                            {/* Titolo Tabellone inciso nel legno */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#8b5a2b] text-[#fcd34d] px-6 py-1 rounded-sm text-xs font-black uppercase tracking-[0.2em] shadow-lg border border-[#3e2716]">
                                Tabellone
                            </div>
                            
                            {/* Griglia Numeri scavata */}
                            <div className="grid grid-cols-10 gap-1.5 mt-3 bg-[#3e2716] p-2 rounded shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                                {Array.from({ length: 90 }, (_, i) => i + 1).map(num => (
                                    <div 
                                        key={num} 
                                        className={`
                                            aspect-square flex items-center justify-center font-black rounded-full text-sm shadow-md transition-all duration-300
                                            ${extractedNumbersSafe.includes(num) 
                                                ? 'bg-gradient-to-br from-yellow-100 to-yellow-300 text-red-900 border-b-4 border-yellow-600 transform -translate-y-0.5 scale-110 z-10' 
                                                : 'bg-[#5c3a21] text-[#7a5230] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]'}
                                        `}
                                    >
                                        {num}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VINCITORI */}
                        <div className="mt-6 bg-white rounded-xl shadow-lg border-b-4 border-stone-200 p-4">
                            <h3 className="font-bold text-stone-700 text-xs uppercase flex items-center gap-2 mb-3">
                                <TrophyIcon className="h-5 w-5 text-yellow-500" /> Vincite Registrate
                            </h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-300">
                                {wins.slice().reverse().map(win => (
                                    <div key={win.id} className="bg-yellow-50 pl-2 pr-4 py-1.5 rounded-lg border border-yellow-200 flex items-center gap-2 flex-shrink-0 shadow-sm">
                                        <div className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">{win.type}</div>
                                        <span className="font-bold text-stone-800 text-xs">{win.playerName}</span>
                                    </div>
                                ))}
                                {wins.length === 0 && <span className="text-xs text-stone-400 italic py-2">Nessuna vincita ancora...</span>}
                            </div>
                        </div>
                    </div>

                    {/* COLONNA DX: SELEZIONE E CARTELLE */}
                    <div className={`lg:col-span-5 ${selectedStaffId ? 'col-span-12' : ''}`}>
                        {!selectedStaffId ? (
                            <div className="bg-white p-6 rounded-xl border-b-4 border-stone-200 shadow-lg">
                                <h3 className="text-sm font-black text-stone-800 uppercase mb-6 text-center tracking-wider">Partecipanti</h3>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                    {activePlayers.map((player, idx) => (
                                        <div key={idx} className="relative group perspective-1000">
                                            <button 
                                                onClick={() => setSelectedStaffId(player.id)}
                                                className="w-full bg-stone-50 p-3 rounded-2xl border-2 border-stone-200 shadow-sm flex flex-col items-center hover:border-amber-400 hover:bg-white hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
                                            >
                                                <div className="text-3xl mb-2 drop-shadow-sm">{player.icon}</div>
                                                <span className="font-bold text-xs text-stone-700 truncate w-full text-center">{player.name}</span>
                                                <span className="text-[10px] bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full mt-2 font-bold">{player.ticketCount} Cartelle</span>
                                            </button>
                                            
                                            {isSuperAdmin && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleRefundAllPlayer(player.id, player.name); }}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-red-700 hover:scale-110 transition-all z-10 border-2 border-white"
                                                    title="Revoca tutte le cartelle"
                                                >
                                                    <TrashIcon className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {/* Pulsante aggiungi giocatore */}
                                    {staff.filter(s => !activePlayers.find(p => p.id === s.id)).map(s => (
                                        <button key={s.id} onClick={() => setSelectedStaffId(s.id)} className="w-full bg-transparent p-3 rounded-2xl border-2 border-dashed border-stone-300 flex flex-col items-center opacity-50 hover:opacity-100 hover:border-stone-400 hover:bg-stone-50 transition-all">
                                            <div className="text-2xl grayscale opacity-70">{s.icon || '👤'}</div>
                                            <span className="text-[10px] font-bold text-stone-500 truncate w-full text-center mt-1">{s.name.split(' ')[0]}</span>
                                            <span className="text-[10px] text-green-600 font-bold">+</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center animate-fade-in">
                                <button onClick={() => setSelectedStaffId(null)} className="mb-6 bg-stone-800 hover:bg-stone-900 text-white px-5 py-2 rounded-full text-xs font-bold shadow-lg transition-transform active:scale-95">
                                    ← Torna al Tabellone
                                </button>
                                
                                <div className="bg-white p-6 rounded-2xl shadow-xl border-b-4 border-stone-200 w-full max-w-md text-center mb-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500"></div>
                                    <div className="text-5xl mb-2 filter drop-shadow-md">{selectedStaffMember?.icon}</div>
                                    <h2 className="text-2xl font-black text-stone-800">{selectedStaffMember?.name}</h2>
                                    <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-6">{myTickets.length} Cartelle in gioco</p>
                                    
                                    <div className="flex gap-3 justify-center items-center bg-stone-50 p-3 rounded-xl border border-stone-100">
                                        <div className="flex gap-2">
                                            <button onClick={() => setBuyQuantity(1)} className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm border-2 transition-all ${buyQuantity===1 ? 'bg-amber-500 text-white border-amber-600 shadow-md transform -translate-y-0.5' : 'bg-white text-stone-400 border-stone-200'}`}>1</button>
                                            <button onClick={() => setBuyQuantity(6)} className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm border-2 transition-all ${buyQuantity===6 ? 'bg-amber-500 text-white border-amber-600 shadow-md transform -translate-y-0.5' : 'bg-white text-stone-400 border-stone-200'}`}>6</button>
                                        </div>
                                        <button onClick={handleBuy} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-black text-xs uppercase shadow-md active:translate-y-0.5 transition-all">
                                            Compra
                                        </button>
                                    </div>
                                </div>

                                {/* LISTA CARTELLE REALISTICHE */}
                                <div className="w-full max-w-md space-y-6">
                                    {myTickets.map((ticket, idx) => {
                                        const theme = getTicketTheme(idx);
                                        return (
                                            <div 
                                                key={ticket.id} 
                                                className={`
                                                    relative p-3 rounded-lg shadow-xl transform transition-transform hover:scale-[1.02]
                                                    ${theme.bg} border-b-4 ${theme.border}
                                                `}
                                            >
                                                {/* Header Cartella */}
                                                <div className="flex justify-between items-center mb-2 text-white/90 px-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg filter drop-shadow-sm">{selectedStaffMember?.icon}</span>
                                                        <span className="font-bold text-xs uppercase tracking-widest text-white">{selectedStaffMember?.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono opacity-70">#{ticket.id.slice(-4)}</span>
                                                        {isSuperAdmin && config.status === 'pending' && (
                                                            <button onClick={() => handleSingleRefund(ticket.id)} className="bg-black/20 hover:bg-black/40 text-white p-1 rounded transition-colors">
                                                                <TrashIcon className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Corpo Cartella (Sfondo chiaro) */}
                                                <div className={`${theme.innerBg} rounded shadow-inner p-1`}>
                                                    {/* Griglia Numeri */}
                                                    <div className="border border-stone-300">
                                                        {formatTicketToGrid(ticket.numbers).map((row, rIdx) => (
                                                            <div key={rIdx} className="grid grid-cols-9 bg-stone-300 gap-px border-b border-stone-300 last:border-b-0">
                                                                {row.map((num, cIdx) => (
                                                                    <div key={cIdx} className="aspect-[4/3] bg-white relative flex items-center justify-center">
                                                                        {num !== null ? (
                                                                            <>
                                                                                <span className="text-sm md:text-base font-serif font-bold text-stone-800 z-0">{num}</span>
                                                                                {/* Segnalino numero estratto (Plastica rossa trasparente) */}
                                                                                {extractedNumbersSafe.includes(num) && (
                                                                                    <div className="absolute inset-0.5 bg-red-500/60 rounded-full shadow-sm z-10 backdrop-blur-[1px] border border-red-600/50"></div>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            // Cella vuota decorativa
                                                                            <div className="w-full h-full bg-stone-100 opacity-50 pattern-diagonal-lines"></div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    
                                    {myTickets.length === 0 && (
                                        <div className="text-center p-8 bg-white/50 rounded-xl border-2 border-dashed border-stone-300">
                                            <p className="text-stone-400 font-bold">Nessuna cartella acquistata</p>
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
