import React, { useState, useEffect, useMemo } from 'react';
import { TombolaConfig, TombolaTicket, TombolaWin, StaffMember, TillColors } from '../types';
import { BackArrowIcon, TrophyIcon, TrashIcon, BoxIcon } from './Icons';
import { useTombola } from '../contexts/TombolaContext';

interface TombolaViewProps {
    onGoBack: () => void;
    config: TombolaConfig;
    tickets: TombolaTicket[];
    wins: TombolaWin[];
    onBuyTicket: (staffId: string, quantity: number) => Promise<void>;
    onRefundTicket: (ticketId: string) => Promise<void>;
    staff: StaffMember[];
    onStartGame: (targetDate?: string) => Promise<void>;
    isSuperAdmin: boolean | null;
    onTransferFunds: (amount: number, gameName: string) => Promise<void>;
    onUpdateTombolaConfig: (cfg: Partial<TombolaConfig>) => Promise<void>;
    tillColors?: TillColors;
    onManualExtraction?: () => Promise<void>;
}

const TombolaView: React.FC<TombolaViewProps> = ({ onGoBack, config, tickets, wins, onBuyTicket, onRefundTicket, staff, onStartGame, isSuperAdmin, onTransferFunds, onUpdateTombolaConfig, tillColors, onManualExtraction }) => {
    const { refundPlayerTickets, refundAllGameTickets, endGame } = useTombola();
    
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [buyQuantity, setBuyQuantity] = useState(1);
    const [targetDateInput, setTargetDateInput] = useState('');

    useEffect(() => {
        // Default target date: Today 20:00 or Tomorrow 20:00
        const d = new Date();
        d.setHours(20, 0, 0, 0);
        if (Date.now() > d.getTime()) {
            d.setDate(d.getDate() + 1);
        }
        const iso = d.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
        setTargetDateInput(iso);
    }, []);

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
        
        if (window.confirm(`ATTENZIONE ADMIN:\nVuoi revocare TUTTE le cartelle di ${playerName}?\nL'importo verrà rimborsato e il montepremi aggiornato.`)) {
            try {
                await refundPlayerTickets(playerId, playerName);
                alert("Rimborso completato.");
            } catch (e: any) {
                console.error(e);
                alert("Errore durante il rimborso massivo: " + e.message);
            }
        }
    };

    const handleRefundEntireGame = async () => {
        if(!isSuperAdmin) return;
        const confirmCode = Math.floor(Math.random() * 9000 + 1000);
        const input = prompt(`PERICOLO: Stai per annullare L'INTERA TOMBOLA.\nTutti i biglietti saranno cancellati e i soldi rimborsati virtualmente.\nInserisci il codice ${confirmCode} per confermare:`);
        if(input === confirmCode.toString()) {
            try {
                await refundAllGameTickets();
                alert("Tombola annullata e resettata.");
            } catch(e: any) {
                alert("Errore reset: " + e.message);
            }
        }
    };

    const handleEndGame = async () => {
        if(!isSuperAdmin) return;
        if(window.confirm("Terminare la partita? L'estrazione si fermerà e lo stato passerà a completato.")) {
            await endGame();
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

    // Sorting Logic for Winners - SHOW ONLY FIRST WINNER PER TYPE
    const uniqueSortedWins = useMemo(() => {
        const importance: Record<string, number> = { 'Tombola': 0, 'Cinquina': 1, 'Quaterna': 2, 'Terno': 3, 'Ambo': 4 };
        
        // 1. Sort by Time Ascending (to find first winner)
        const chronoWins = [...wins].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // 2. Filter unique types (first one wins)
        const seenTypes = new Set<string>();
        const unique = chronoWins.filter(w => {
            if (seenTypes.has(w.type)) return false;
            seenTypes.add(w.type);
            return true;
        });

        // 3. Sort by Importance for display
        return unique.sort((a, b) => importance[a.type] - importance[b.type]);
    }, [wins]);

    const handleTransfer = async () => {
        if((config?.jackpot || 0) <= 0) return;
        if(window.confirm(`Versare €${(config.jackpot || 0).toFixed(2)} in Cassa Bar?`)) {
            await onTransferFunds(config.jackpot, 'Tombola');
        }
    };

    const handleManualExtract = async () => {
        if (config.status !== 'active') return alert("Il gioco non è attivo!");
        if (onManualExtraction) await onManualExtraction();
    };

    const handleStartWithTime = async () => {
        if (ticketsNeededToStart > 0) return;
        if (!targetDateInput) {
            if(!window.confirm("Nessuna data di fine impostata. L'estrazione sarà manuale?")) return;
            await onStartGame();
        } else {
            await onStartGame(targetDateInput);
        }
    };

    const getTicketStyle = (playerId: string) => {
        const member = staff.find(s => s.id === playerId);
        const shift = member?.shift || 'a';
        const tillId = `T${shift.toUpperCase()}`;
        const baseColor = tillColors ? (tillColors[tillId] || '#94a3b8') : '#94a3b8';
        
        return {
            borderColor: baseColor,
            backgroundColor: `${baseColor}26`, 
            headerBg: baseColor
        };
    };
    
    if (!config) return <div className="flex items-center justify-center min-h-screen">Caricamento Tombola...</div>;

    return (
        <div className="flex flex-col min-h-screen bg-stone-200 relative font-sans">
            <header className="bg-red-900 text-yellow-100 p-3 shadow-2xl sticky top-0 z-50 border-b-4 border-yellow-600">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold hover:text-white transition-colors">
                        <BackArrowIcon className="h-5 w-5" /> Esci
                    </button>
                    <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-2 drop-shadow-md text-yellow-400" style={{ textShadow: '2px 2px 0px #7f1d1d' }}>
                        <TrophyIcon className="h-6 w-6" /> Tombola VVF
                    </h1>
                    <div className="flex items-center gap-3">
                        {isSuperAdmin && config.status === 'active' && (
                            <button onClick={handleManualExtract} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-lg border-2 border-green-400 animate-pulse" title="Estrai Numero">
                                <BoxIcon className="h-5 w-5" />
                            </button>
                        )}
                        <div className="text-right bg-black/30 px-4 py-1 rounded-lg border border-yellow-600/30">
                            <p className="text-[9px] uppercase opacity-80 font-bold text-yellow-200">Montepremi</p>
                            <p className="text-xl font-black text-yellow-400 tracking-wider">€{(config.jackpot || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 w-full max-w-7xl mx-auto space-y-6">
                
                {/* Status Bar & Admin Controls */}
                {!selectedStaffId && (
                    <div className="bg-white p-4 rounded-xl shadow-lg border-b-4 border-stone-300">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-stone-600 uppercase">Avanzamento Vendite</span>
                            <span className="text-sm font-black text-stone-800">{totalTickets} / {config.maxTickets}</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-4 overflow-hidden border-inner shadow-inner mb-4">
                            <div className="bg-gradient-to-r from-green-600 to-emerald-400 h-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        
                        {/* Admin Controls Area */}
                        {isSuperAdmin && (
                            <div className="bg-stone-100 p-3 rounded-lg border border-stone-200">
                                <h4 className="text-[10px] font-black text-stone-500 uppercase mb-2">Gestione Gioco</h4>
                                <div className="flex flex-col md:flex-row gap-2 items-center flex-wrap">
                                    
                                    {/* START CONTROLS (Only when pending) */}
                                    {config.status === 'pending' && (
                                        <>
                                            <div className="flex-grow w-full md:w-auto">
                                                <input 
                                                    type="datetime-local" 
                                                    value={targetDateInput} 
                                                    onChange={(e) => setTargetDateInput(e.target.value)} 
                                                    className="w-full bg-white border border-stone-300 rounded p-2 text-xs h-10"
                                                    title="Data Fine Automatica"
                                                />
                                            </div>
                                            <button 
                                                onClick={handleStartWithTime} 
                                                disabled={ticketsNeededToStart > 0} 
                                                className={`w-full md:w-auto px-6 py-2 rounded-lg font-bold shadow-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all uppercase text-xs h-10 ${ticketsNeededToStart > 0 ? 'bg-stone-300 text-stone-500 border-stone-400' : 'bg-green-600 border-green-800 text-white animate-pulse'}`}
                                            >
                                                Avvia Gioco
                                            </button>
                                            <button 
                                                onClick={handleRefundEntireGame} 
                                                className="w-full md:w-auto px-4 bg-red-100 border-b-4 border-red-300 text-red-600 font-bold py-2 rounded-lg shadow-sm active:border-b-0 active:translate-y-1 transition-all uppercase text-xs h-10"
                                            >
                                                Annulla Tutto
                                            </button>
                                        </>
                                    )}

                                    {/* ACTIVE CONTROLS */}
                                    {config.status === 'active' && (
                                        <>
                                            <button onClick={handleEndGame} className="w-full md:w-auto px-6 bg-stone-700 border-b-4 border-stone-900 text-white font-bold py-2 rounded-lg shadow-sm active:border-b-0 active:translate-y-1 transition-all uppercase text-xs h-10">
                                                Termina Partita
                                            </button>
                                            <span className="text-[10px] text-green-600 font-bold animate-pulse px-2">● In Corso</span>
                                        </>
                                    )}

                                    {/* ALWAYS VISIBLE IF MONEY EXISTS */}
                                    <button onClick={handleTransfer} className="w-full md:w-auto px-6 bg-amber-500 border-b-4 border-amber-700 text-white font-bold py-2 rounded-lg shadow-sm active:border-b-0 active:translate-y-1 transition-all uppercase text-xs h-10 ml-auto">
                                        Versa Utile
                                    </button>
                                </div>
                            </div>
                        )}

                        {config.status === 'active' && config.targetDate && (
                            <p className="text-center text-[10px] text-stone-400 mt-2 font-mono">
                                Estrazione automatica attiva fino al: {new Date(config.targetDate).toLocaleString()}
                            </p>
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
                                            aspect-square flex items-center justify-center font-black rounded-full text-sm shadow-md transition-all duration-300 font-sans
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

                        {/* VINCITORI (2 Colonne, Ordinati, UNICI) */}
                        <div className="mt-6 bg-white rounded-xl shadow-lg border-b-4 border-stone-200 p-4">
                            <h3 className="font-bold text-stone-700 text-xs uppercase flex items-center gap-2 mb-3">
                                <TrophyIcon className="h-5 w-5 text-yellow-500" /> Vincite Registrate (Primi Assegnatari)
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {uniqueSortedWins.map(win => (
                                    <div key={win.id} className="bg-yellow-50 pl-2 pr-4 py-1.5 rounded-lg border border-yellow-200 flex items-center gap-2 shadow-sm animate-fade-in">
                                        <div className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${win.type === 'Tombola' ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-400 text-yellow-900'}`}>
                                            {win.type}
                                        </div>
                                        <span className="font-bold text-stone-800 text-xs truncate">{win.playerName}</span>
                                        <span className="text-[9px] text-stone-400 ml-auto">{new Date(win.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                ))}
                                {uniqueSortedWins.length === 0 && <span className="col-span-2 text-xs text-stone-400 italic py-2 text-center">Nessuna vincita ancora...</span>}
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
                                        const style = getTicketStyle(ticket.playerId);
                                        return (
                                            <div 
                                                key={ticket.id} 
                                                className="relative p-3 rounded-lg shadow-xl transform transition-transform hover:scale-[1.02] border-b-4"
                                                style={{ 
                                                    backgroundColor: style.backgroundColor, 
                                                    borderColor: style.borderColor 
                                                }}
                                            >
                                                {/* Header Cartella */}
                                                <div 
                                                    className="flex justify-between items-center mb-2 px-2 py-1 rounded text-white shadow-sm"
                                                    style={{ backgroundColor: style.headerBg }}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg filter drop-shadow-sm">{selectedStaffMember?.icon}</span>
                                                        <span className="font-bold text-xs uppercase tracking-widest text-white">{selectedStaffMember?.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-mono opacity-90">#{ticket.id.slice(-4)}</span>
                                                        {isSuperAdmin && config.status === 'pending' && (
                                                            <button onClick={() => handleSingleRefund(ticket.id)} className="bg-black/20 hover:bg-black/40 text-white p-1 rounded transition-colors">
                                                                <TrashIcon className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Corpo Cartella (Sfondo chiaro) */}
                                                <div className="bg-white rounded shadow-inner p-1">
                                                    {/* Griglia Numeri */}
                                                    <div className="border border-stone-300">
                                                        {formatTicketToGrid(ticket.numbers).map((row, rIdx) => (
                                                            <div key={rIdx} className="grid grid-cols-9 bg-stone-300 gap-px border-b border-stone-300 last:border-b-0">
                                                                {row.map((num, cIdx) => (
                                                                    <div key={cIdx} className="aspect-[4/3] bg-white relative flex items-center justify-center">
                                                                        {num !== null ? (
                                                                            <>
                                                                                <span className="text-sm md:text-base font-bold text-stone-800 z-0 font-sans">{num}</span>
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