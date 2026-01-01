
import React, { useState, useEffect, useMemo } from 'react';
import { StaffMember, Shift, ShiftSettings, AttendanceRecord } from '../types';
import { BackArrowIcon, WalletIcon, CheckIcon } from './Icons';
import { useBar } from '../contexts/BarContext';

interface DiceGameProps {
    onGoBack: () => void;
    staff: StaffMember[];
    shiftSettings?: ShiftSettings;
    attendanceRecords?: AttendanceRecord[];
}

interface PlayerResult {
    id: string;
    name: string;
    icon: string;
    photoUrl?: string; // Support for photos
    dice1: number;
    dice2: number;
    total: number;
    isRolling: boolean;
}

const DiceGame: React.FC<DiceGameProps> = ({ onGoBack, staff, shiftSettings, attendanceRecords }) => {
    const { getNow } = useBar();
    const [participants, setParticipants] = useState<PlayerResult[]>([]);
    const [gameStatus, setGameStatus] = useState<'idle' | 'rolling' | 'finished'>('idle');
    const [loserScore, setLoserScore] = useState<number | null>(null);

    // CALCOLO TURNO ATTIVO (Rotazione Forward A->B->C->D con Ancoraggio Dec 20 2025 = B)
    const activeShift = useMemo(() => {
        const now = getNow();
        const hour = now.getHours();
        const calculationDate = new Date(now);
        if (hour < 8) {
            calculationDate.setDate(calculationDate.getDate() - 1);
        }
        calculationDate.setHours(12, 0, 0, 0);

        // BLINDATO 20 Dicembre 2025 = B
        const anchorDate = new Date(2025, 11, 20, 12, 0, 0);
        const anchorShift = 'b';

        const diffTime = calculationDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Round per DST

        const shifts = ['a', 'b', 'c', 'd'];
        const anchorIndex = shifts.indexOf(anchorShift.toLowerCase());
        
        // Rotazione Forward Day (A->B->C->D)
        let shiftIndex = (anchorIndex + diffDays) % 4;
        if (shiftIndex < 0) shiftIndex += 4;
        
        // Night is Previous Index
        if (hour >= 20 || hour < 8) {
            shiftIndex = (shiftIndex - 1 + 4) % 4;
        }

        return shifts[shiftIndex] as Shift;
    }, [getNow]);

    // Inizializza partecipanti in base al turno ATTIVO e alle PRESENZE
    useEffect(() => {
        const todayStr = getNow().toISOString().split('T')[0];
        const tillId = `T${activeShift.toUpperCase()}`;
        
        // Trova il record presenze di oggi per il turno attivo
        const todayRecord = attendanceRecords?.find(r => r.date === todayStr && r.tillId === tillId);

        // Filtra solo staff del turno attivo ED escludi utenti con nome "Cassa" e SUPER ADMIN
        let filtered = staff.filter(s => 
            s.shift === activeShift && 
            !s.name.toLowerCase().includes('cassa') &&
            s.role !== 'super-admin'
        );
        
        // SE ESISTE IL RECORD: Filtra ulteriormente per mostrare solo i PRESENTI
        if (todayRecord) {
            filtered = filtered.filter(s => {
                // Controllo status dettagliato (prioritario)
                if (todayRecord.attendanceDetails && todayRecord.attendanceDetails[s.id]) {
                    const status = todayRecord.attendanceDetails[s.id];
                    // Mostra solo chi è fisicamente presente (Presente, Sostituzione, Missione)
                    return status === 'present' || status === 'substitution' || status === 'mission';
                }
                // Fallback (Legacy): controlla lista ID
                return todayRecord.presentStaffIds.includes(s.id);
            });
        }
        
        setParticipants(filtered.map(s => ({
            id: s.id,
            name: s.name,
            icon: s.icon || '👤',
            photoUrl: s.photoUrl,
            dice1: 1,
            dice2: 1,
            total: 0,
            isRolling: false
        })));
        setGameStatus('idle');
        setLoserScore(null);
    }, [activeShift, staff, attendanceRecords, getNow]);

    const handleRoll = () => {
        if (participants.length < 2) return alert("Servono almeno 2 partecipanti!");
        setGameStatus('rolling');
        setLoserScore(null);

        // Set all to rolling
        const rollingParticipants = participants.map(p => ({...p, isRolling: true, total: 0}));
        setParticipants(rollingParticipants);

        // Simuliamo il tempo di lancio (animazione CSS gestisce il movimento)
        setTimeout(() => {
            finalizeResults();
        }, 1500); // 1.5 secondi di roll
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

        const minScore = Math.min(...finalResults.map(p => p.total));
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
                    photoUrl: s.photoUrl,
                    dice1: 1,
                    dice2: 1,
                    total: 0,
                    isRolling: false
                }]);
            }
        }
        setGameStatus('idle');
    };

    // Componente Dado 3D
    const Die3D = ({ val, rolling, seed }: { val: number, rolling: boolean, seed: string }) => {
        const rotationMap: {[key: number]: string} = {
            1: 'rotateX(0deg) rotateY(0deg)',
            6: 'rotateX(180deg) rotateY(0deg)',
            2: 'rotateY(-90deg)',
            5: 'rotateY(90deg)',
            3: 'rotateX(-90deg)',
            4: 'rotateX(90deg)'
        };

        const randomDuration = useMemo(() => {
            return `${0.3 + Math.random() * 0.5}s`;
        }, [rolling, seed]);

        const dotStyle = "absolute bg-slate-400 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]";

        return (
            <div className="scene w-8 h-8 md:w-10 md:h-10">
                <div className={`cube ${rolling ? 'rolling' : ''}`} 
                     style={{ 
                         transform: rolling ? undefined : rotationMap[val],
                         animationDuration: rolling ? randomDuration : undefined
                     }}>
                    <div className="cube-face cube-face-front"><div className={`${dotStyle} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}></div></div>
                    <div className="cube-face cube-face-right"><div className={`${dotStyle} top-1.5 left-1.5`}></div><div className={`${dotStyle} bottom-1.5 right-1.5`}></div></div>
                    <div className="cube-face cube-face-left"><div className={`${dotStyle} top-1.5 left-1.5`}></div><div className={`${dotStyle} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}></div><div className={`${dotStyle} bottom-1.5 right-1.5`}></div></div>
                    <div className="cube-face cube-face-bottom"><div className={`${dotStyle} top-1.5 left-1.5`}></div><div className={`${dotStyle} top-1.5 right-1.5`}></div><div className={`${dotStyle} bottom-1.5 left-1.5`}></div><div className={`${dotStyle} bottom-1.5 right-1.5`}></div></div>
                    <div className="cube-face cube-face-top"><div className={`${dotStyle} top-1.5 left-1.5`}></div><div className={`${dotStyle} top-1.5 right-1.5`}></div><div className={`${dotStyle} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}></div><div className={`${dotStyle} bottom-1.5 left-1.5`}></div><div className={`${dotStyle} bottom-1.5 right-1.5`}></div></div>
                    <div className="cube-face cube-face-back"><div className={`${dotStyle} top-1.5 left-1.5`}></div><div className={`${dotStyle} top-1.5 right-1.5`}></div><div className={`${dotStyle} top-1/2 left-1.5 transform -translate-y-1/2`}></div><div className={`${dotStyle} top-1/2 right-1.5 transform -translate-y-1/2`}></div><div className={`${dotStyle} bottom-1.5 left-1.5`}></div><div className={`${dotStyle} bottom-1.5 right-1.5`}></div></div>
                </div>
            </div>
        );
    };

    // Filtra lista staff globale per mostrare solo il turno corrente (Per la selezione manuale)
    const currentShiftStaffList = useMemo(() => {
        return staff.filter(s => s.shift === activeShift && !s.name.toLowerCase().includes('cassa') && s.role !== 'super-admin');
    }, [staff, activeShift]);

    return (
        <div className="flex flex-col min-h-screen bg-blue-50 font-sans">
            <header className="bg-blue-600 text-white p-3 shadow-lg sticky top-0 z-10 border-b-4 border-blue-800 flex justify-between items-center">
                <button onClick={onGoBack} className="flex items-center gap-1 font-bold hover:text-white/80 transition-colors text-sm">
                    <BackArrowIcon className="h-5 w-5" /> Esci
                </button>
                <h1 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="text-2xl">🎲</span> Chi Paga?
                </h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-grow p-3 w-full max-w-lg mx-auto flex flex-col gap-4">
                
                {/* SELEZIONE PARTECIPANTI (ORIZZONTALE COMPATTA + PULSANTE LANCIA) */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xs font-bold text-blue-800 uppercase flex items-center gap-2">
                            Partecipanti (Turno {activeShift.toUpperCase()})
                        </h2>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {participants.length}
                        </span>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-blue-200 mb-2">
                        {currentShiftStaffList.map(s => {
                            const isSelected = participants.some(p => p.id === s.id);
                            return (
                                <button 
                                    key={s.id} 
                                    onClick={() => toggleParticipant(s.id)}
                                    className={`
                                        relative flex flex-col items-center justify-center p-1 rounded-lg border min-w-[70px] transition-all
                                        ${isSelected 
                                            ? 'bg-blue-50 border-blue-500 shadow-sm scale-95' 
                                            : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100'
                                        }
                                    `}
                                >
                                    {isSelected && (
                                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm z-10">
                                            <CheckIcon className="h-2 w-2" />
                                        </div>
                                    )}
                                    {/* AVATAR CIRCOLARE IDENTICO A TABELLA PRESENZE */}
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-lg border border-slate-200 shadow-sm mb-1">
                                        {s.photoUrl ? (
                                            <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="">{s.icon || '👤'}</span>
                                        )}
                                    </div>
                                    <span className={`text-[9px] font-bold truncate w-full text-center leading-none ${isSelected ? 'text-blue-900' : 'text-slate-500'}`}>
                                        {s.name.split(' ')[0]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button 
                        onClick={handleRoll}
                        disabled={gameStatus === 'rolling' || participants.length < 2}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-2 rounded-lg shadow-md uppercase tracking-wider text-sm transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-b-2 border-blue-800 flex items-center justify-center gap-2"
                    >
                        {gameStatus === 'rolling' ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div> : <span className="text-xl">🎲</span>}
                        {gameStatus === 'rolling' ? 'Lancio in corso...' : 'Lancia Dadi'}
                    </button>
                </div>

                {/* GAME AREA (COMPATTA) */}
                <div className="space-y-2 pb-4">
                    {participants.length === 0 && (
                        <div className="text-center py-10 text-slate-400 italic text-sm">
                            Nessun partecipante selezionato. (Verifica presenze)
                        </div>
                    )}

                    {participants.map((player) => {
                        const isLoser = gameStatus === 'finished' && player.total === loserScore;
                        return (
                            <div 
                                key={player.id} 
                                className={`
                                    relative flex items-center justify-between p-2 rounded-lg border transition-all duration-300 h-16
                                    ${isLoser ? 'bg-red-50 border-red-500 shadow-md z-10' : 'bg-white border-slate-100 shadow-sm'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    {/* AVATAR CIRCOLARE */}
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-xl border border-slate-200 shadow-sm">
                                        {player.photoUrl ? (
                                            <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{player.icon}</span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{player.name}</div>
                                        {isLoser && <div className="text-[8px] font-black text-red-600 uppercase bg-red-100 px-1 py-px rounded inline-block animate-pulse">Paga!</div>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2">
                                        {/* Pass seed to create variation */}
                                        <Die3D val={player.dice1} rolling={player.isRolling} seed={player.id + '1'} />
                                        <Die3D val={player.dice2} rolling={player.isRolling} seed={player.id + '2'} />
                                    </div>
                                    <div className="w-8 text-center">
                                        {!player.isRolling && player.total > 0 && (
                                            <span className={`text-xl font-black animate-fade-in ${isLoser ? 'text-red-600' : 'text-slate-700'}`}>
                                                {player.total}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isLoser && (
                                    <div className="absolute -right-2 -top-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg animate-bounce">
                                        <WalletIcon className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

            </main>
        </div>
    );
};

export default DiceGame;
