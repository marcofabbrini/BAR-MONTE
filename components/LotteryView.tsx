import React, { useMemo } from 'react';
import { LotteryConfig, LotteryTicket, StaffMember } from '../types';
import { BackArrowIcon, GamepadIcon, TicketIcon, StarIcon } from './Icons';

interface LotteryViewProps {
    onGoBack: () => void;
    config?: LotteryConfig;
    tickets?: LotteryTicket[];
    staff: StaffMember[];
}

const LotteryView: React.FC<LotteryViewProps> = ({ onGoBack, config, tickets = [], staff }) => {
    
    const staffMap = useMemo(() => {
        const map: Record<string, string> = {};
        staff.forEach(s => map[s.id] = s.name);
        return map;
    }, [staff]);

    if (!config || !config.isActive) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
                    <div className="text-6xl mb-4">🎟️</div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Lotteria Chiusa</h2>
                    <p className="text-slate-500 mb-6 font-medium">Al momento non ci sono lotterie attive.</p>
                    <button onClick={onGoBack} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-md w-full">
                        Torna Indietro
                    </button>
                </div>
            </div>
        );
    }

    const extractionDate = config.extractionDate ? new Date(config.extractionDate) : null;
    const isExtracted = config.extractedNumbers && config.extractedNumbers.length > 0;

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-white shadow-sm p-4 flex items-center gap-2 sticky top-0 z-10">
                <button
                    onClick={onGoBack}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    <BackArrowIcon className="h-5 w-5" />
                    <span className="font-bold text-sm">Indietro</span>
                </button>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">🎟️</span> Lotteria
                </h1>
            </header>

            <div className="flex-grow p-4 md:p-8 max-w-4xl mx-auto w-full animate-fade-in space-y-6">
                
                {/* INFO LOTTERIA */}
                <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 md:p-8 overflow-hidden relative">
                    <div className="absolute -top-10 -right-10 text-[150px] opacity-5 pointer-events-none">🎟️</div>
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2">Grande Lotteria</h2>
                        <div className="flex flex-wrap gap-4 mb-6">
                            <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl font-bold text-sm border border-green-100 flex items-center gap-2">
                                <span>Costo Biglietto:</span>
                                <span className="text-lg">€{config.ticketPrice.toFixed(2)}</span>
                            </div>
                            {extractionDate && (
                                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold text-sm border border-blue-100 flex items-center gap-2">
                                    <span>Estrazione:</span>
                                    <span className="text-lg">{extractionDate.toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>

                        {/* PREMI */}
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                                <StarIcon className="h-5 w-5 text-yellow-500" /> Premi in Palio
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {config.prizes?.map((prize, idx) => {
                                    const isWinningPrize = isExtracted && prize.winningNumber;
                                    const winnerTicket = isWinningPrize ? tickets.find(t => t.ticketNumber === prize.winningNumber) : null;
                                    
                                    return (
                                        <div key={prize.id} className={`p-4 rounded-2xl border-2 flex flex-col gap-1 transition-all ${isWinningPrize ? 'bg-yellow-50 border-yellow-300 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex justify-between items-start">
                                                <span className="font-black text-slate-400 text-sm">{idx + 1}° Premio</span>
                                                {isWinningPrize && <span className="bg-yellow-400 text-yellow-900 text-[10px] font-black px-2 py-1 rounded-full uppercase animate-pulse">Estratto</span>}
                                            </div>
                                            <span className="font-bold text-slate-800 text-lg">{prize.name}</span>
                                            
                                            {isWinningPrize && (
                                                <div className="mt-2 pt-2 border-t border-yellow-200/50">
                                                    <div className="text-xs font-bold text-yellow-800">Biglietto Vincente: <span className="text-lg font-black bg-white px-2 py-0.5 rounded shadow-sm">#{prize.winningNumber}</span></div>
                                                    {winnerTicket && (
                                                        <div className="text-sm font-bold text-green-700 mt-1">
                                                            Vinto da: {winnerTicket.playerName}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {(!config.prizes || config.prizes.length === 0) && (
                                    <p className="text-slate-500 italic text-sm">Nessun premio ancora configurato.</p>
                                )}
                            </div>
                        </div>

                        {/* NUMERI ESTRATTI */}
                        {isExtracted && (
                            <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-inner">
                                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-3">Numeri Estratti</h3>
                                <div className="flex flex-wrap gap-2">
                                    {config.extractedNumbers?.map((num, i) => (
                                        <div key={i} className="w-12 h-12 bg-white text-slate-800 rounded-full flex items-center justify-center font-black text-xl shadow-md border-4 border-slate-700">
                                            {num}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* LISTA BIGLIETTI VENDUTI */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wider flex justify-between items-center">
                        <span>Biglietti Venduti ({tickets.length})</span>
                    </h3>
                    
                    {tickets.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {tickets.map(ticket => {
                                const isWinner = config.extractedNumbers?.includes(ticket.ticketNumber);
                                return (
                                    <div key={ticket.id} className={`p-3 rounded-xl border-2 flex flex-col items-center text-center relative overflow-hidden ${isWinner ? 'bg-green-50 border-green-400 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                                        {isWinner && <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>}
                                        <span className="text-xs font-bold text-slate-500 mb-1 truncate w-full">{ticket.playerName}</span>
                                        <span className={`text-2xl font-black ${isWinner ? 'text-green-600' : 'text-slate-700'}`}>#{ticket.ticketNumber}</span>
                                        <span className="text-[9px] text-slate-400 mt-1">{new Date(ticket.purchaseTime).toLocaleDateString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nessun biglietto venduto finora.</p>
                    )}
                </div>

            </div>
        </div>
    );
};

export default LotteryView;
