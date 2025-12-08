
import React, { useState, useEffect } from 'react';
import { StaffMember, Shift } from '../types';
import { BackArrowIcon, DiceIcon, WalletIcon } from './Icons';

interface DiceGameProps {
    onGoBack: () => void;
    staff: StaffMember[];
}

interface PlayerResult {
    id: string;
    name: string;
    icon: string;
    dice1: number;
    dice2: number;
    total: number;
    isRolling: boolean;
}

const DiceGame: React.FC<DiceGameProps> = ({ onGoBack, staff }) => {
    const [selectedShift, setSelectedShift] = useState<Shift | 'all'>('all');
    const [participants, setParticipants] = useState<PlayerResult[]>([]);
    const [gameStatus, setGameStatus] = useState<'idle' | 'rolling' | 'finished'>('idle');
    const [loserScore, setLoserScore] = useState<number | null>(null);

    // Inizializza partecipanti in base al turno selezionato
    useEffect(() => {
        const filtered = staff.filter(s => selectedShift === 'all' || s.shift === selectedShift);
        setParticipants(filtered.map(s => ({
            id: s.id,
            name: s.name,
            icon: s.icon || '👤',
            dice1: 1,
            dice2: 1,
            total: 0,
            isRolling: false
        })));
        setGameStatus('idle');
        setLoserScore(null);
    }, [selectedShift, staff]);

    const handleRoll = () => {
        if (participants.length < 2) return alert("Servono almeno 2 partecipanti!");
        setGameStatus('rolling');
        setLoserScore(null);

        // Reset
        const rollingParticipants = participants.map(p => ({...p, isRolling: true, total: 0}));
        setParticipants(rollingParticipants);

        // Animation Loop
        let ticks = 0;
        const interval = setInterval(() => {
            ticks++;
            setParticipants(prev => prev.map(p => ({
                ...p,
                dice1: Math.floor(Math.random() * 6) + 1,
                dice2: Math.floor(Math.random() * 6) + 1
            })));

            if (ticks > 20) { // Dopo circa 2 secondi
                clearInterval(interval);
                finalizeResults();
            }
        }, 100);
    };

    const finalizeResults = () => {
        const finalResults = participants.map(p => {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            return {
                ...p,
                dice1: d1,
                dice2: d2,
                total: d1 + d2,
                isRolling: false
            };
        });

        // Trova il punteggio più basso
        const minScore = Math.min(...finalResults.map(p => p.total));
        
        // Ordina: dal più basso (perdente) al più alto
        finalResults.sort((a,b) => a.total - b.total);

        setParticipants(finalResults);
        setLoserScore(minScore);
        setGameStatus('finished');
    };

    const toggleParticipant = (id: string) => {
        if (gameStatus === 'rolling') return;
        const exists = participants.find(p => p.id === id);
        if (exists) {
            setParticipants(participants.filter(p => p.id !== id));
        } else {
            const s = staff.find(st => st.id === id);
            if (s) {
                setParticipants([...participants, {
                    id: s.id,
                    name: s.name,
                    icon: s.icon || '👤',
                    dice1: 1,
                    dice2: 1,
                    total: 0,
                    isRolling: false
                }]);
            }
        }
        setGameStatus('idle');
    };

    const DiceFace = ({ val }: { val: number }) => {
        // Mappa posizioni puntini per un dado classico
        const dots = {
            1: ['justify-center items-center'],
            2: ['justify-start items-start', 'justify-end items-end'],
            3: ['justify-start items-start', 'justify-center items-center', 'justify-end items-end'],
            4: ['justify-start items-start', 'justify-end items-start', 'justify-start items-end', 'justify-end items-end'],
            5: ['justify-start items-start', 'justify-end items-start', 'justify-center items-center', 'justify-start items-end', 'justify-end items-end'],
            6: ['justify-start items-start', 'justify-end items-start', 'justify-start items-center', 'justify-end items-center', 'justify-start items-end', 'justify-end items-end']
        };
        
        const currentDots = dots[val as keyof typeof dots] || [];

        return (
            <div className="w-10 h-10 bg-white border-2 border-slate-300 rounded-lg shadow-md grid grid-cols-3 grid-rows-3 p-1 gap-0.5">
                {/* 3x3 Grid invisibile, riempiamo solo dove serve */}
                {/* Questo è un approccio semplificato per CSS Grid dots */}
                {/* Usiamo un layout flex assoluto per ogni dot per semplicità */}
                {val === 1 && <div className="col-start-2 row-start-2 bg-black rounded-full w-2 h-2 place-self-center"></div>}
                {val === 2 && <><div className="col-start-1 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div></>}
                {val === 3 && <><div className="col-start-1 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-2 row-start-2 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div></>}
                {val === 4 && <><div className="col-start-1 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-1 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div></>}
                {val === 5 && <><div className="col-start-1 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-2 row-start-2 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-1 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div></>}
                {val === 6 && <><div className="col-start-1 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-1 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-1 row-start-2 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-2 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-1 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div><div className="col-start-3 row-start-3 bg-black rounded-full w-2 h-2 place-self-center"></div></>}
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-blue-50 font-sans">
            <header className="bg-blue-600 text-white p-4 shadow-lg sticky top-0 z-10 border-b-4 border-blue-800 flex justify-between items-center">
                <button onClick={onGoBack} className="flex items-center gap-1 font-bold hover:text-white/80 transition-colors">
                    <BackArrowIcon className="h-5 w-5" /> Esci
                </button>
                <h1 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                    <DiceIcon className="h-6 w-6" /> Chi Paga?
                </h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-grow p-4 w-full max-w-4xl mx-auto space-y-6">
                
                {/* SETUP */}
                <div className="bg-white p-4 rounded-xl shadow-md border border-blue-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-blue-800 uppercase">Partecipanti ({participants.length})</h2>
                        <select 
                            value={selectedShift} 
                            onChange={(e) => setSelectedShift(e.target.value as any)}
                            className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded px-2 py-1"
                        >
                            <option value="all">Tutti</option>
                            <option value="a">Turno A</option>
                            <option value="b">Turno B</option>
                            <option value="c">Turno C</option>
                            <option value="d">Turno D</option>
                        </select>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {staff.map(s => {
                            const isSelected = participants.some(p => p.id === s.id);
                            return (
                                <button 
                                    key={s.id} 
                                    onClick={() => toggleParticipant(s.id)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${isSelected ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'}`}
                                >
                                    {s.name.split(' ')[0]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* GAME AREA */}
                <div className="space-y-4">
                    {participants.map((player, idx) => {
                        const isLoser = gameStatus === 'finished' && player.total === loserScore;
                        return (
                            <div 
                                key={player.id} 
                                className={`
                                    relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300
                                    ${isLoser ? 'bg-red-50 border-red-500 shadow-xl scale-105 z-10' : 'bg-white border-slate-100 shadow-sm'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{player.icon}</div>
                                    <div>
                                        <div className="font-bold text-slate-800">{player.name}</div>
                                        {isLoser && <div className="text-[10px] font-black text-red-600 uppercase bg-red-100 px-2 py-0.5 rounded inline-block animate-pulse">Paga Tutto!</div>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`flex gap-2 transition-transform duration-100 ${player.isRolling ? 'animate-bounce' : ''}`}>
                                        <DiceFace val={player.dice1} />
                                        <DiceFace val={player.dice2} />
                                    </div>
                                    <div className="w-12 text-center">
                                        <span className={`text-2xl font-black ${isLoser ? 'text-red-600' : 'text-slate-700'}`}>
                                            {player.total}
                                        </span>
                                    </div>
                                </div>

                                {isLoser && (
                                    <div className="absolute -right-2 -top-2 bg-red-600 text-white p-2 rounded-full shadow-lg">
                                        <WalletIcon className="h-6 w-6" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </main>

            <div className="sticky bottom-4 px-4 w-full max-w-4xl mx-auto">
                <button 
                    onClick={handleRoll}
                    disabled={gameStatus === 'rolling' || participants.length < 2}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-wider text-xl transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {gameStatus === 'rolling' ? 'Lancio in corso...' : '🎲 Lancia Dadi'}
                </button>
            </div>
        </div>
    );
};

export default DiceGame;
