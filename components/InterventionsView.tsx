
import React, { useState, useMemo } from 'react';
import { StaffMember, Shift, InterventionTypology, DutyOfficer } from '../types';
import { useBar } from '../contexts/BarContext';
import { BackArrowIcon, CheckIcon, FireIcon, TrashIcon, PlusIcon, CalendarIcon } from './Icons';
import { VVF_GRADES } from '../constants';

interface InterventionsViewProps {
    onGoBack: () => void;
    staff: StaffMember[];
    isSuperAdmin?: boolean | null;
}

const InterventionsView: React.FC<InterventionsViewProps> = ({ onGoBack, staff, isSuperAdmin }) => {
    const { interventions, interventionTypologies, dutyOfficers, addIntervention, deleteIntervention, getNow } = useBar();

    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [step, setStep] = useState(1);

    // Form Data
    const [date, setDate] = useState(getNow().toISOString().split('T')[0]);
    const [exitTime, setExitTime] = useState('');
    const [returnTime, setReturnTime] = useState('');
    
    const [typology, setTypology] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [municipality, setMunicipality] = useState('Montepulciano');
    const [locality, setLocality] = useState('');

    const [teamLeaderId, setTeamLeaderId] = useState('');
    const [officerId, setOfficerId] = useState('');

    // CALCOLO TURNO ATTIVO (Logica condivisa)
    const activeShift = useMemo(() => {
        const now = getNow();
        const hour = now.getHours();
        
        // Data operativa
        const calculationDate = new Date(now);
        if (hour < 8) calculationDate.setDate(calculationDate.getDate() - 1);
        calculationDate.setHours(12, 0, 0, 0);

        // Ancoraggio: 20 Dic 2025 = B
        const anchorDate = new Date(2025, 11, 20, 12, 0, 0); 
        const diffTime = calculationDate.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
        const shifts = ['a', 'b', 'c', 'd'];
        const anchorIndex = 1; // B
        
        let shiftIndex = (anchorIndex + diffDays) % 4;
        if (shiftIndex < 0) shiftIndex += 4;
        if (hour >= 20 || hour < 8) shiftIndex = (shiftIndex - 1 + 4) % 4;

        return shifts[shiftIndex] as Shift;
    }, [getNow]);

    // FILTRO CAPO PARTENZA (CS, CQE, CR, CRE)
    const eligibleLeaders = useMemo(() => {
        return staff.filter(s => {
            const grade = s.grade || '';
            // Gradi validi: CS, CQE, CR, CRE
            // VVF_GRADES: VIG, VE, VESC, VC, VCSC, CS, CQE, CR, CRE
            return ['CS', 'CQE', 'CR', 'CRE'].includes(grade) && s.shift === activeShift;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [staff, activeShift]);

    // Handle Wizard Navigation
    const nextStep = () => {
        if (step === 1) {
            if (!date || !exitTime || !returnTime) return alert("Compila tutti i campi orari.");
            if (returnTime <= exitTime) return alert("L'orario di rientro deve essere successivo all'uscita.");
        }
        if (step === 2) {
            if (!typology || !street || !municipality) return alert("Compila tipologia e indirizzo.");
        }
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        if (!teamLeaderId || !officerId) return alert("Seleziona Capo Partenza e Funzionario.");

        const leader = staff.find(s => s.id === teamLeaderId);
        
        try {
            await addIntervention({
                date,
                exitTime,
                returnTime,
                typology,
                street,
                number,
                municipality,
                locality,
                teamLeaderId,
                teamLeaderName: leader?.name || 'Sconosciuto',
                dutyOfficer: dutyOfficers.find(o => o.id === officerId)?.name || 'Sconosciuto',
                shift: activeShift,
                timestamp: new Date().toISOString()
            });
            
            // Reset & Close
            setIsWizardOpen(false);
            setStep(1);
            setExitTime('');
            setReturnTime('');
            setStreet('');
            setNumber('');
            setLocality('');
            setTeamLeaderId('');
            // Keep Municipality & Typology/Officer might be sticky
            
            alert("Intervento registrato!");
        } catch (e) {
            console.error(e);
            alert("Errore salvataggio.");
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Eliminare definitivamente questo intervento?")) {
            await deleteIntervention(id);
        }
    };

    // Render Wizard Step
    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-orange-800 uppercase text-sm border-b border-orange-200 pb-2">Step 1: Tempi</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Intervento</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded p-3 font-bold text-slate-700 bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Uscita</label>
                                <input type="time" value={exitTime} onChange={e => setExitTime(e.target.value)} className="w-full border rounded p-3 font-bold text-slate-700 bg-white" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Rientro</label>
                                <input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} className="w-full border rounded p-3 font-bold text-slate-700 bg-white" />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-orange-800 uppercase text-sm border-b border-orange-200 pb-2">Step 2: Dettagli</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipologia</label>
                            <select value={typology} onChange={e => setTypology(e.target.value)} className="w-full border rounded p-3 bg-white">
                                <option value="">-- Seleziona --</option>
                                {interventionTypologies.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Via / Piazza</label>
                                <input type="text" value={street} onChange={e => setStreet(e.target.value)} className="w-full border rounded p-3 bg-white" placeholder="Via Roma" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Civico</label>
                                <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full border rounded p-3 bg-white" placeholder="10" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Comune</label>
                                <input type="text" value={municipality} onChange={e => setMunicipality(e.target.value)} className="w-full border rounded p-3 bg-white" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Località</label>
                                <input type="text" value={locality} onChange={e => setLocality(e.target.value)} className="w-full border rounded p-3 bg-white" placeholder="(Opzionale)" />
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-orange-800 uppercase text-sm border-b border-orange-200 pb-2">Step 3: Personale</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Capo Partenza (Turno {activeShift.toUpperCase()})</label>
                            <select value={teamLeaderId} onChange={e => setTeamLeaderId(e.target.value)} className="w-full border rounded p-3 bg-white font-bold">
                                <option value="">-- Seleziona CS/CR --</option>
                                {eligibleLeaders.map(s => <option key={s.id} value={s.id}>{s.grade} {s.name}</option>)}
                            </select>
                            {eligibleLeaders.length === 0 && <p className="text-[10px] text-red-500 mt-1 italic">Nessun Capo Squadra/Reparto trovato nel turno {activeShift.toUpperCase()}.</p>}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Funzionario di Servizio</label>
                            <select value={officerId} onChange={e => setOfficerId(e.target.value)} className="w-full border rounded p-3 bg-white">
                                <option value="">-- Seleziona --</option>
                                {dutyOfficers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <header className="bg-orange-600 text-white p-4 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)]">
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white bg-orange-700/40 px-4 py-2 rounded-full hover:bg-orange-700/60 transition-colors backdrop-blur-sm"
                >
                    <BackArrowIcon className="h-5 w-5" /> 
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
                    <FireIcon className="h-8 w-8" />
                    <span>Registro Interventi</span>
                </h1>
                
                <div className="w-12 md:w-24"></div> 
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
                
                {/* BUTTON NUOVO INTERVENTO */}
                {!isWizardOpen && (
                    <button 
                        onClick={() => setIsWizardOpen(true)}
                        className="w-full bg-white p-6 rounded-xl shadow-md border-l-8 border-orange-500 flex items-center justify-between hover:bg-orange-50 transition-all group"
                    >
                        <div className="text-left">
                            <h2 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                                <PlusIcon className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform"/> Nuovo Intervento
                            </h2>
                            <p className="text-sm text-slate-500 mt-1 font-medium">Registra uscita squadra turno {activeShift.toUpperCase()}</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-full text-orange-600 group-hover:bg-orange-200">
                            <FireIcon className="h-8 w-8" />
                        </div>
                    </button>
                )}

                {/* WIZARD FORM */}
                {isWizardOpen && (
                    <div className="bg-white rounded-xl shadow-xl border border-orange-200 overflow-hidden animate-slide-up">
                        <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
                            <h2 className="font-bold text-orange-900 uppercase">Nuovo Intervento - Step {step}/3</h2>
                            <button onClick={() => { setIsWizardOpen(false); setStep(1); }} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6">
                            {renderStep()}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
                            {step > 1 ? (
                                <button onClick={prevStep} className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors">Indietro</button>
                            ) : (
                                <div></div>
                            )}
                            
                            {step < 3 ? (
                                <button onClick={nextStep} className="px-6 py-2 rounded-lg font-bold bg-orange-600 text-white hover:bg-orange-700 shadow-md transition-colors">Avanti</button>
                            ) : (
                                <button onClick={handleSubmit} className="px-6 py-2 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 shadow-md transition-colors flex items-center gap-2">
                                    <CheckIcon className="h-5 w-5"/> Salva nel Registro
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* LISTA STORICO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-slate-500"/> Registro Storico
                        </h3>
                        <span className="text-xs font-bold bg-white px-2 py-1 rounded text-slate-500 border">{interventions.length} Record</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Orari</th>
                                    <th className="p-3">Tipologia</th>
                                    <th className="p-3">Luogo</th>
                                    <th className="p-3">Squadra</th>
                                    <th className="p-3 text-center">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {interventions.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nessun intervento registrato.</td></tr>
                                ) : (
                                    interventions.map(int => (
                                        <tr key={int.id} className="hover:bg-orange-50/30 transition-colors">
                                            <td className="p-3 whitespace-nowrap font-mono font-bold text-slate-700">
                                                {new Date(int.date).toLocaleDateString('it-IT')}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                <span className="text-green-700 font-bold">{int.exitTime}</span> - <span className="text-red-700 font-bold">{int.returnTime}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                                                    {int.typology}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs text-slate-600">
                                                <b>{int.street} {int.number}</b><br/>
                                                {int.municipality} {int.locality && `(${int.locality})`}
                                            </td>
                                            <td className="p-3 text-xs">
                                                <div className="font-bold text-slate-700">CP: {int.teamLeaderName}</div>
                                                <div className="text-slate-500">Funz: {int.dutyOfficer}</div>
                                                <div className="mt-1 text-[10px] font-bold bg-slate-100 inline-block px-1 rounded border">Turno {int.shift.toUpperCase()}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {isSuperAdmin && (
                                                    <button onClick={() => handleDelete(int.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors">
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default InterventionsView;
