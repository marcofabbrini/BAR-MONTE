
import React, { useState, useMemo, useEffect } from 'react';
import { AnalottoConfig, AnalottoBet, AnalottoExtraction, AnalottoWheel, StaffMember } from '../types';
import { BackArrowIcon, CloverIcon, CheckIcon, TrashIcon, BanknoteIcon, InfoIcon, SaveIcon, EditIcon } from './Icons';

interface AnalottoViewProps {
    onGoBack: () => void;
    config?: AnalottoConfig;
    bets: AnalottoBet[];
    extractions: AnalottoExtraction[];
    staff: StaffMember[];
    onPlaceBet: (bet: Omit<AnalottoBet, 'id' | 'timestamp'>) => Promise<void>;
    onRunExtraction: () => Promise<void>;
    isSuperAdmin: boolean;
    onTransferFunds: (amount: number, gameName: string) => Promise<void>;
    onUpdateConfig?: (cfg: Partial<AnalottoConfig>) => Promise<void>;
}

const AnalottoView: React.FC<AnalottoViewProps> = ({ onGoBack, config, bets, extractions, staff, onPlaceBet, onRunExtraction, isSuperAdmin, onTransferFunds, onUpdateConfig }) => {
    
    // UI State
    const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
    const [selectedWheels, setSelectedWheels] = useState<AnalottoWheel[]>([]);
    const [betAmount, setBetAmount] = useState(1);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
    const [viewMode, setViewMode] = useState<'play' | 'extractions'>('play');
    
    // Info Modal State
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [editRules, setEditRules] = useState('');
    const [editSchedule, setEditSchedule] = useState('');
    const [isEditingInfo, setIsEditingInfo] = useState(false);

    useEffect(() => {
        if (config) {
            setEditRules(config.rules || '');
            setEditSchedule(config.extractionSchedule || '');
        }
    }, [config]);

    const availableWheels: AnalottoWheel[] = ['APS', 'Campagnola', 'Autoscala', 'Autobotte', 'Direttivo'];

    // Calcola quali giocatori hanno scommesse attive (fatte dopo l'ultima estrazione)
    const activePlayerData = useMemo(() => {
        const lastExtractionTime = new Date(config?.lastExtraction || 0).getTime();
        const activeBets = bets.filter(b => new Date(b.timestamp).getTime() > lastExtractionTime);
        
        const playerStats: Record<string, number> = {};
        activeBets.forEach(b => {
            playerStats[b.playerId] = (playerStats[b.playerId] || 0) + 1;
        });
        
        return playerStats;
    }, [bets, config]);

    const toggleNumber = (n: number) => {
        if (selectedNumbers.includes(n)) {
            setSelectedNumbers(selectedNumbers.filter(x => x !== n));
        } else {
            if (selectedNumbers.length < 10) {
                setSelectedNumbers([...selectedNumbers, n].sort((a,b) => a-b));
            }
        }
    };

    const toggleWheel = (w: AnalottoWheel) => {
        if (selectedWheels.includes(w)) {
            setSelectedWheels(selectedWheels.filter(x => x !== w));
        } else {
            setSelectedWheels([...selectedWheels, w]);
        }
    };

    const handleConfirmBet = async () => {
        if (!selectedPlayerId) return alert("Seleziona chi sta giocando.");
        if (selectedNumbers.length === 0) return alert("Seleziona almeno un numero.");
        if (selectedWheels.length === 0) return alert("Seleziona almeno una ruota.");
        if (betAmount <= 0) return alert("Importo non valido.");

        const player = staff.find(s => s.id === selectedPlayerId);
        if (!player) return;

        try {
            await onPlaceBet({
                playerId: selectedPlayerId,
                playerName: player.name,
                numbers: selectedNumbers,
                wheels: selectedWheels,
                amount: betAmount
            });
            alert("Giocata registrata con successo!");
            setSelectedNumbers([]);
            setSelectedWheels([]);
            setBetAmount(1);
        } catch (e: any) {
            alert("Errore: " + e.message);
        }
    };

    const handleSaveInfo = async () => {
        if (!onUpdateConfig) return;
        try {
            await onUpdateConfig({
                rules: editRules,
                extractionSchedule: editSchedule
            });
            setIsEditingInfo(false);
        } catch (e) {
            console.error(e);
            alert("Errore salvataggio info.");
        }
    };

    const getLastExtraction = () => extractions.length > 0 ? extractions[0] : null;

    const renderExtractionBall = (n: number) => (
        <div key={n} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-md border-2 border-slate-200 flex items-center justify-center font-bold text-slate-800 text-sm md:text-lg">
            {n}
        </div>
    );

    const handleTransfer = async () => {
        if((config?.jackpot || 0) <= 0) return;
        if(window.confirm(`Versare €${(config?.jackpot || 0).toFixed(2)} in Cassa Bar?`)) {
            await onTransferFunds(config?.jackpot || 0, 'Analotto');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-emerald-50 font-sans relative">
            
            {/* INFO MODAL */}
            {isInfoOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-emerald-500 flex flex-col max-h-[80vh]">
                        <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2"><InfoIcon className="h-6 w-6"/> Regolamento & Orari</h2>
                            <button onClick={() => setIsInfoOpen(false)} className="text-2xl leading-none hover:text-emerald-200">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {isSuperAdmin && !isEditingInfo && (
                                <button onClick={() => setIsEditingInfo(true)} className="mb-4 text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-slate-200">
                                    <EditIcon className="h-3 w-3" /> Modifica Testi
                                </button>
                            )}

                            <div className="mb-6">
                                <h3 className="text-emerald-800 font-bold uppercase text-sm mb-2 border-b border-emerald-100 pb-1">Orari Estrazione</h3>
                                {isEditingInfo ? (
                                    <input value={editSchedule} onChange={e => setEditSchedule(e.target.value)} className="w-full border p-2 rounded" />
                                ) : (
                                    <p className="text-slate-700 font-medium whitespace-pre-wrap">{config?.extractionSchedule || "Non definito"}</p>
                                )}
                            </div>

                            <div>
                                <h3 className="text-emerald-800 font-bold uppercase text-sm mb-2 border-b border-emerald-100 pb-1">Regolamento</h3>
                                {isEditingInfo ? (
                                    <textarea value={editRules} onChange={e => setEditRules(e.target.value)} className="w-full border p-2 rounded h-32" />
                                ) : (
                                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{config?.rules || "Nessun regolamento."}</p>
                                )}
                            </div>
                        </div>
                        {isEditingInfo && (
                            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                                <button onClick={() => setIsEditingInfo(false)} className="px-4 py-2 text-slate-500 font-bold">Annulla</button>
                                <button onClick={handleSaveInfo} className="px-4 py-2 bg-emerald-600 text-white rounded font-bold">Salva</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <header className="bg-emerald-800 text-emerald-100 p-4 shadow-xl sticky top-0 z-50 border-b-4 border-yellow-500">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <button onClick={onGoBack} className="flex items-center gap-1 font-bold hover:text-white transition-colors">
                        <BackArrowIcon className="h-5 w-5" /> Esci
                    </button>
                    <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-2 drop-shadow-md">
                        <CloverIcon className="h-6 w-6 text-yellow-400" /> Analotto VVF
                    </h1>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsInfoOpen(true)} className="p-2 bg-emerald-700/50 hover:bg-emerald-700 rounded-full text-emerald-200 hover:text-white transition-colors">
                            <InfoIcon className="h-6 w-6" />
                        </button>
                        <div className="text-right bg-black/20 px-3 py-1 rounded-lg">
                            <p className="text-[9px] uppercase opacity-80 font-bold text-yellow-200">Jackpot</p>
                            <p className="text-xl font-black text-yellow-400">€{(config?.jackpot || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="bg-white border-b border-emerald-100 p-2 shadow-sm sticky top-[70px] z-40">
                <div className="max-w-4xl mx-auto flex justify-center gap-4">
                    <button onClick={() => setViewMode('play')} className={`px-6 py-2 rounded-full font-bold text-sm ${viewMode === 'play' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 hover:bg-emerald-50'}`}>Gioca Schedina</button>
                    <button onClick={() => setViewMode('extractions')} className={`px-6 py-2 rounded-full font-bold text-sm ${viewMode === 'extractions' ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-700 hover:bg-emerald-50'}`}>Estrazioni</button>
                </div>
            </div>

            <main className="flex-grow p-4 w-full max-w-5xl mx-auto space-y-6">

                {viewMode === 'play' && (
                    <>
                        {/* LISTA RAPIDA PARTECIPANTI ATTIVI */}
                        {Object.keys(activePlayerData).length > 0 && (
                            <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm animate-fade-in">
                                <p className="text-xs font-bold text-emerald-800 uppercase mb-2">Partecipanti per la prossima estrazione:</p>
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {Object.keys(activePlayerData).map(pid => {
                                        const s = staff.find(staff => staff.id === pid);
                                        return (
                                            <div key={pid} className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 flex-shrink-0">
                                                <div className="text-sm">{s?.icon || '👤'}</div>
                                                <span className="text-xs font-bold text-emerald-700">{s?.name.split(' ')[0]}</span>
                                                <span className="bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                                    {activePlayerData[pid]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* COLONNA SX: SCHEDINA */}
                            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-emerald-200 overflow-hidden">
                                <div className="bg-emerald-100 p-3 border-b border-emerald-200 flex justify-between items-center">
                                    <span className="font-bold text-emerald-900 uppercase">1. Scegli i Numeri</span>
                                    <span className="text-xs font-bold bg-white text-emerald-800 px-2 py-0.5 rounded-full">{selectedNumbers.length}/10</span>
                                </div>
                                <div className="p-4 grid grid-cols-10 gap-2">
                                    {Array.from({length: 90}, (_, i) => i + 1).map(n => (
                                        <button 
                                            key={n} 
                                            onClick={() => toggleNumber(n)}
                                            className={`aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all ${selectedNumbers.includes(n) ? 'bg-emerald-600 text-white shadow-inner scale-95 ring-2 ring-emerald-300' : 'bg-slate-50 text-slate-600 hover:bg-emerald-50'}`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* COLONNA DX: OPZIONI E CONFERMA */}
                            <div className="space-y-6">
                                
                                {/* SELEZIONE RUOTE */}
                                <div className="bg-white rounded-xl shadow-lg border border-emerald-200 overflow-hidden">
                                    <div className="bg-emerald-100 p-3 border-b border-emerald-200">
                                        <span className="font-bold text-emerald-900 uppercase">2. Scegli Ruote</span>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {availableWheels.map(w => (
                                            <button 
                                                key={w} 
                                                onClick={() => toggleWheel(w)}
                                                className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm border flex justify-between items-center transition-all ${selectedWheels.includes(w) ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                <span>Ruota {w}</span>
                                                {selectedWheels.includes(w) && <CheckIcon className="h-5 w-5 text-emerald-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SELEZIONE GIOCATORE E IMPORTO */}
                                <div className="bg-white rounded-xl shadow-lg border border-emerald-200 overflow-hidden">
                                    <div className="bg-emerald-100 p-3 border-b border-emerald-200">
                                        <span className="font-bold text-emerald-900 uppercase">3. Conferma Giocata</span>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Chi Gioca?</label>
                                            <select 
                                                value={selectedPlayerId} 
                                                onChange={(e) => setSelectedPlayerId(e.target.value)} 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-700"
                                            >
                                                <option value="">Seleziona...</option>
                                                {staff.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} {activePlayerData[s.id] ? '✅' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* VISUAL INDICATOR IF ACTIVE */}
                                            {selectedPlayerId && activePlayerData[selectedPlayerId] && (
                                                <div className="mt-2 bg-green-100 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                                                    <CheckIcon className="h-4 w-4" />
                                                    <span>Questo utente ha già <strong>{activePlayerData[selectedPlayerId]}</strong> ticket attivi.</span>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Importo (€)</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 5, 10].map(amt => (
                                                    <button key={amt} onClick={() => setBetAmount(amt)} className={`flex-1 py-2 rounded-lg font-bold text-sm border ${betAmount === amt ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'}`}>€{amt}</button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={handleConfirmBet}
                                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black py-4 rounded-xl shadow-md uppercase tracking-wide text-lg transition-colors mt-2"
                                        >
                                            Gioca €{betAmount}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {viewMode === 'extractions' && (
                    <div className="space-y-8">
                        {/* ULTIMA ESTRAZIONE (Tabellone) */}
                        <div className="bg-white rounded-xl shadow-2xl border-4 border-emerald-700 overflow-hidden">
                            <div className="bg-emerald-800 p-4 text-center">
                                <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-widest drop-shadow-md">Estrazione Ufficiale</h2>
                                <p className="text-emerald-200 font-medium">del {getLastExtraction() ? new Date(getLastExtraction()!.timestamp).toLocaleString() : '--/--/----'}</p>
                            </div>
                            
                            <div className="p-6 md:p-8 space-y-6 bg-emerald-50/50">
                                {getLastExtraction() ? availableWheels.map(wheel => (
                                    <div key={wheel} className="flex flex-col md:flex-row items-center gap-4 md:gap-8 border-b border-emerald-200 last:border-0 pb-4 last:pb-0">
                                        <div className="w-full md:w-48 text-center md:text-right">
                                            <span className="font-black text-emerald-900 uppercase text-lg md:text-xl tracking-wider">Ruota {wheel}</span>
                                        </div>
                                        <div className="flex gap-3 justify-center md:justify-start flex-grow">
                                            {getLastExtraction()!.numbers[wheel]?.map(n => renderExtractionBall(n))}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center text-slate-500 py-10 italic">Nessuna estrazione presente.</p>
                                )}
                            </div>
                        </div>

                        {/* CONTROLLI ADMIN */}
                        {isSuperAdmin && (
                            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">Pannello Controllo (Admin)</h3>
                                    <p className="text-slate-400 text-sm">Gestione estrazioni e fondi.</p>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={onRunExtraction} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold shadow-md uppercase text-sm">
                                        Esegui Nuova Estrazione
                                    </button>
                                    <button onClick={handleTransfer} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md uppercase text-sm flex items-center gap-2">
                                        <BanknoteIcon className="h-5 w-5" /> Versa Utile
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* STORICO GIOCATE RECENTI */}
                        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
                            <h3 className="font-bold text-slate-800 mb-4">Ultime Giocate</h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {bets.map(bet => (
                                    <div key={bet.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                        <div>
                                            <span className="font-bold text-slate-700">{bet.playerName}</span>
                                            <span className="text-slate-400 text-xs ml-2">{new Date(bet.timestamp).toLocaleDateString()}</span>
                                            <div className="text-xs text-emerald-600 mt-1 font-mono">
                                                {bet.wheels.join(', ')}: [{bet.numbers.join('-')}]
                                            </div>
                                        </div>
                                        <div className="font-bold text-slate-800">€{bet.amount}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default AnalottoView;
