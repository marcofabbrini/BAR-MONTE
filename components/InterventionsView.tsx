
import React, { useState, useMemo, useEffect } from 'react';
import { StaffMember, Shift, InterventionTypology, DutyOfficer, Intervention } from '../types';
import { useBar } from '../contexts/BarContext';
import { BackArrowIcon, CheckIcon, FireIcon, TrashIcon, PlusIcon, CalendarIcon, ChartBarIcon, TrophyIcon, EditIcon, FilterIcon, SortIcon, WrenchIcon } from './Icons';
import { VVF_GRADES } from '../constants';
import { GradeBadge } from './StaffManagement';

interface InterventionsViewProps {
    onGoBack: () => void;
    staff: StaffMember[];
    isSuperAdmin?: boolean | null;
}

const ADDRESS_TYPES = ['Via', 'Viale', 'Piazza', 'Vicolo', 'Corso', 'S.S.', 'S.R.', 'S.P.', 'Loc.', 'Autostrada'];

const MUNICIPALITIES = [
    'MONTEPULCIANO',
    'CETONA',
    'CHIANCIANO TERME',
    'CHIUSI',
    'PIENZA',
    'SARTEANO',
    'SINALUNGA',
    'TORRITA DI SIENA',
    'TREQUANDA',
    'FOIANO DELLA CHIANA (AR)',
    'ALTRO...'
];

// --- EXTINGUISHER ANIMATION COMPONENT ---
const ExtinguisherHeader = () => {
    // Genera sbuffi di fumo/CO2
    const puffs = useMemo(() => {
        return Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            delay: Math.random() * 2, // Delay casuale per flusso continuo
            size: 10 + Math.random() * 20, // Dimensione variabile
            duration: 0.8 + Math.random() * 0.5 // Velocità dello sbuffo
        }));
    }, []);

    return (
        <div className="relative flex items-center justify-center w-16 h-16 mr-4">
            <style>
                {`
                @keyframes spray-jet {
                    0% { transform: translate(0, 0) scale(0.2); opacity: 0.8; }
                    50% { opacity: 0.6; }
                    100% { transform: translate(40px, -30px) scale(2.5); opacity: 0; }
                }
                @keyframes shake-extinguisher {
                    0%, 100% { transform: rotate(-15deg); }
                    50% { transform: rotate(-20deg) translate(-1px, 1px); }
                }
                `}
            </style>
            
            {/* ESTINTORE */}
            <div className="text-5xl z-20 relative" style={{ animation: 'shake-extinguisher 0.2s infinite' }}>
                🧯
            </div>

            {/* SBUFFI DI FUMO (Partono dalla bocchetta dell'estintore) */}
            <div className="absolute top-0 left-8 w-full h-full pointer-events-none z-10">
                {puffs.map(p => (
                    <div 
                        key={p.id}
                        className="absolute rounded-full bg-white/80 blur-sm"
                        style={{
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            left: '0px',
                            top: '10px',
                            animation: `spray-jet ${p.duration}s linear infinite`,
                            animationDelay: `-${p.delay}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

const InterventionsView: React.FC<InterventionsViewProps> = ({ onGoBack, staff, isSuperAdmin }) => {
    const { interventions, interventionTypologies, dutyOfficers, addIntervention, updateIntervention, deleteIntervention, permanentDeleteIntervention, getNow } = useBar();

    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [step, setStep] = useState<number>(1);
    
    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form Data
    const [interventionNumber, setInterventionNumber] = useState('');
    const [date, setDate] = useState(getNow().toISOString().split('T')[0]);
    const [exitTime, setExitTime] = useState('');
    const [returnTime, setReturnTime] = useState('');
    
    const [typology, setTypology] = useState('');
    const [notes, setNotes] = useState(''); // NEW: Note aggiuntive
    
    // Address Parts
    const [addressType, setAddressType] = useState('Via');
    const [streetName, setStreetName] = useState(''); // "Indirizzo"
    const [civicNumber, setCivicNumber] = useState(''); // "Civico o Km"
    
    const [municipality, setMunicipality] = useState('MONTEPULCIANO');
    const [isCustomMunicipality, setIsCustomMunicipality] = useState(false); // Per gestire "ALTRO..."
    const [locality, setLocality] = useState('');

    const [teamLeaderId, setTeamLeaderId] = useState('');
    const [isExternalLeader, setIsExternalLeader] = useState(false); // NEW: Capo partenza altra sede
    const [externalLeaderName, setExternalLeaderName] = useState(''); // NEW: Nome capo esterno

    const [officerId, setOfficerId] = useState('');

    // FILTER STATE
    const [showFilters, setShowFilters] = useState(false);
    const [filterNumber, setFilterNumber] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterTypology, setFilterTypology] = useState('');
    const [filterMunicipality, setFilterMunicipality] = useState('');
    const [filterLeader, setFilterLeader] = useState('');

    // SCROLL TO TOP ON MOUNT
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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

    // FILTRO CAPO PARTENZA (CS, CQE, CR, CRE) con FALLBACK
    const eligibleLeaders = useMemo(() => {
        // Prima prova a filtrare per grado
        const leaders = staff.filter(s => {
            const grade = s.grade || '';
            return ['CS', 'CQE', 'CR', 'CRE'].includes(grade) && s.shift === activeShift;
        }).sort((a,b) => a.name.localeCompare(b.name));

        // Se non trova nessuno (es. gradi non settati), ritorna tutto lo staff del turno (esclusa cassa)
        if (leaders.length === 0) {
            return staff.filter(s => s.shift === activeShift && !s.name.toLowerCase().includes('cassa')).sort((a,b) => a.name.localeCompare(b.name));
        }
        return leaders;
    }, [staff, activeShift]);

    // LISTE UNIVIOCHE PER FILTRI (POPOLATE DALLO STORICO + CONFIGURAZIONI)
    const uniqueTypologies = useMemo(() => {
        const set = new Set<string>();
        // Aggiungi quelli configurati
        interventionTypologies.forEach(t => set.add(t.name));
        // Aggiungi quelli usati nello storico (anche se cancellati dalla config)
        interventions.forEach(i => set.add(i.typology));
        return Array.from(set).sort();
    }, [interventionTypologies, interventions]);

    const uniqueMunicipalities = useMemo(() => {
        const set = new Set<string>();
        // Aggiungi lista standard
        MUNICIPALITIES.forEach(m => {
            if(m !== 'ALTRO...') set.add(m);
        });
        // Aggiungi quelli usati nello storico
        interventions.forEach(i => set.add(i.municipality.toUpperCase()));
        return Array.from(set).sort();
    }, [interventions]);

    const uniqueLeaders = useMemo(() => {
        const set = new Set<string>();
        interventions.forEach(i => set.add(i.teamLeaderName));
        return Array.from(set).sort();
    }, [interventions]);

    // CALCOLO PROGRESSIVI DINAMICI (GLOBAL COUNTER)
    // Mappa ID intervento -> Numero Progressivo Unico
    const progressiveMap = useMemo(() => {
        const map = new Map<string, number>();
        let globalCounter = 0;

        // Ordina dal più vecchio al più nuovo per assegnare i numeri 1, 2, 3...
        // Filtra solo quelli non cancellati per il conteggio
        const sortedAsc = [...interventions]
            .filter(i => !i.isDeleted)
            .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                if (dateA !== dateB) return dateA - dateB;
                return a.exitTime.localeCompare(b.exitTime);
            });

        sortedAsc.forEach(int => {
            globalCounter++;
            map.set(int.id, globalCounter);
        });

        return map;
    }, [interventions]);

    // LISTA FILTRATA
    const filteredInterventions = useMemo(() => {
        return interventions.filter(int => {
            if (filterDate && int.date !== filterDate) return false;
            // Includes usato per sicurezza, ma con le select sarà quasi sempre match esatto
            if (filterTypology && !int.typology.toLowerCase().includes(filterTypology.toLowerCase())) return false;
            if (filterMunicipality && !int.municipality.toLowerCase().includes(filterMunicipality.toLowerCase())) return false;
            if (filterLeader && !int.teamLeaderName.toLowerCase().includes(filterLeader.toLowerCase())) return false;
            if (filterNumber && (!int.interventionNumber || !int.interventionNumber.toLowerCase().includes(filterNumber.toLowerCase()))) return false;
            return true;
        });
    }, [interventions, filterDate, filterTypology, filterMunicipality, filterLeader, filterNumber]);

    // STATISTICHE DASHBOARD (Esclude cancellati)
    const stats = useMemo(() => {
        const shiftCounts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
        const leaderCounts: Record<string, number> = {};

        interventions.filter(i => !i.isDeleted).forEach(i => {
            // Count Shifts
            if (i.shift && shiftCounts[i.shift.toLowerCase()] !== undefined) {
                shiftCounts[i.shift.toLowerCase()]++;
            }
            // Count Leaders (Se non esterno)
            if (i.teamLeaderId && i.teamLeaderId !== 'EXTERNAL') {
                leaderCounts[i.teamLeaderId] = (leaderCounts[i.teamLeaderId] || 0) + 1;
            }
        });

        // Find Top Leader
        let topLeaderId = '';
        let maxCount = 0;
        Object.entries(leaderCounts).forEach(([id, count]) => {
            if (count > maxCount) {
                maxCount = count;
                topLeaderId = id;
            }
        });
        
        const topLeader = staff.find(s => s.id === topLeaderId);

        return { shiftCounts, topLeader, maxCount };
    }, [interventions, staff]);

    const resetForm = () => {
        setEditingId(null);
        setInterventionNumber('');
        setDate(getNow().toISOString().split('T')[0]);
        setExitTime('');
        setReturnTime('');
        setTypology('');
        setNotes(''); // Reset Notes
        setAddressType('Via');
        setStreetName('');
        setCivicNumber('');
        setLocality('');
        setTeamLeaderId('');
        setIsExternalLeader(false); // Reset External
        setExternalLeaderName('');  // Reset External Name
        setOfficerId('');
        setMunicipality('MONTEPULCIANO');
        setIsCustomMunicipality(false);
        setStep(1);
    };

    const handleOpenEdit = (i: Intervention) => {
        setEditingId(i.id);
        setInterventionNumber(i.interventionNumber || '');
        setDate(i.date);
        setExitTime(i.exitTime);
        setReturnTime(i.returnTime);
        setTypology(i.typology);
        setNotes(i.notes || ''); // Load Notes
        setAddressType(i.addressType || 'Via');
        setStreetName(i.street || '');
        setCivicNumber(i.number || '');
        
        // Handle Municipality Edit
        if (MUNICIPALITIES.includes(i.municipality.toUpperCase())) {
            setMunicipality(i.municipality.toUpperCase());
            setIsCustomMunicipality(false);
        } else {
            setMunicipality(i.municipality);
            setIsCustomMunicipality(true);
        }

        setLocality(i.locality || '');
        
        // Handle External Leader
        if (i.isExternalLeader) {
            setIsExternalLeader(true);
            setExternalLeaderName(i.teamLeaderName);
            setTeamLeaderId('');
        } else {
            setIsExternalLeader(false);
            setTeamLeaderId(i.teamLeaderId || '');
            setExternalLeaderName('');
        }

        // Trova ID funzionario dal nome (se possibile)
        const off = dutyOfficers.find(o => o.name === i.dutyOfficer);
        setOfficerId(off ? off.id : '');
        
        setIsWizardOpen(true);
        setStep(1);
    };

    // Handle Wizard Navigation
    const nextStep = () => {
        if (step === 1) {
            // Step 1: Quando
            if (!date || !exitTime || !returnTime) return alert("Compila tutti i campi orari.");
        }
        if (step === 2) {
            // Step 2: Dettagli
            if (!typology) return alert("Seleziona la tipologia.");
            if (!streetName) return alert("Inserisci l'indirizzo.");
            if (!municipality) return alert("Inserisci il comune.");
        }
        setStep((prev: number) => prev + 1);
    };

    const prevStep = () => setStep((prev: number) => prev - 1);

    const handleSubmit = async () => {
        let finalLeaderName = 'Sconosciuto';
        let finalLeaderId = '';

        if (isExternalLeader) {
            if (!externalLeaderName.trim()) return alert("Inserisci Grado Nome e Cognome del Capo Partenza esterno.");
            finalLeaderName = externalLeaderName.trim();
            finalLeaderId = 'EXTERNAL';
        } else {
            if (!teamLeaderId) return alert("Seleziona il Capo Partenza.");
            const leader = staff.find(s => s.id === teamLeaderId);
            finalLeaderName = leader?.name || 'Sconosciuto';
            finalLeaderId = teamLeaderId;
        }
        
        // Risoluzione Nome Funzionario
        let finalOfficerName = 'N/D';
        if (officerId) {
            const officer = dutyOfficers.find(o => o.id === officerId);
            if (officer) finalOfficerName = officer.name;
        }

        const payload = {
            interventionNumber,
            date,
            exitTime,
            returnTime,
            typology,
            notes: notes.trim(), // Save notes
            addressType,
            street: streetName,
            number: civicNumber,
            municipality,
            locality,
            teamLeaderId: finalLeaderId,
            teamLeaderName: finalLeaderName,
            isExternalLeader, // Save flag
            dutyOfficer: finalOfficerName,
            shift: activeShift,
            timestamp: new Date().toISOString()
        };

        try {
            if (editingId) {
                await updateIntervention({ id: editingId, ...payload });
                alert("Intervento aggiornato!");
            } else {
                await addIntervention(payload);
                alert("Intervento registrato con successo!");
            }
            
            // Reset & Close
            setIsWizardOpen(false);
            resetForm();
        } catch (e: any) {
            console.error(e);
            alert("Errore salvataggio: " + e.message);
        }
    };

    const handleSoftDelete = async (id: string) => {
        if(confirm("Annullare questo intervento? Rimarrà visibile nel registro ma barrato.")) {
            await deleteIntervention(id);
        }
    };

    const handleHardDelete = async (id: string) => {
        if(isSuperAdmin && confirm("ELIMINAZIONE DEFINITIVA. Procedere?")) {
            await permanentDeleteIntervention(id);
        }
    };

    // Render Wizard Step
    const renderStep = () => {
        switch(step) {
            case 1:
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-orange-800 uppercase text-sm border-b border-orange-200 pb-2">Step 1: Quando</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nr. Intervento (S.O.)</label>
                            <input type="text" value={interventionNumber} onChange={e => setInterventionNumber(e.target.value)} placeholder="Es. 1234" className="w-full border rounded p-3 font-mono font-bold text-slate-700 bg-white focus:ring-2 focus:ring-orange-200 outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Data Uscita</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded p-3 font-bold text-slate-700 bg-white focus:ring-2 focus:ring-orange-200 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ora Uscita</label>
                                <input type="time" value={exitTime} onChange={e => setExitTime(e.target.value)} className="w-full border rounded p-3 font-bold text-slate-700 bg-white focus:ring-2 focus:ring-orange-200 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Ora Rientro</label>
                                <input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} className="w-full border rounded p-3 font-bold text-slate-700 bg-white focus:ring-2 focus:ring-orange-200 outline-none" />
                            </div>
                        </div>
                        {exitTime && returnTime && exitTime > returnTime && (
                            <p className="text-[10px] text-orange-600 italic bg-orange-50 p-2 rounded border border-orange-100">
                                ⚠️ Nota: L'orario di rientro è precedente all'uscita. Si assume che l'intervento sia terminato il giorno successivo.
                            </p>
                        )}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="font-bold text-orange-800 uppercase text-sm border-b border-orange-200 pb-2">Step 2: Dettagli</h3>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipologia</label>
                            <input 
                                value={typology} 
                                onChange={e => setTypology(e.target.value)} 
                                className="w-full border rounded p-3 bg-white focus:ring-2 focus:ring-orange-200 outline-none font-bold"
                                placeholder="Seleziona dalla lista..."
                            />
                            {/* VERTICAL SCROLLABLE LIST OF TYPOLOGIES */}
                            <div className="max-h-32 overflow-y-auto border rounded mt-1 bg-slate-50 shadow-inner scrollbar-thin scrollbar-thumb-orange-200 mb-2">
                                {interventionTypologies.length > 0 ? (
                                    interventionTypologies.map(t => (
                                        <div 
                                            key={t.id} 
                                            onClick={() => setTypology(t.name)}
                                            className="p-2 hover:bg-orange-100 cursor-pointer text-xs border-b border-slate-100 last:border-0 font-medium text-slate-700"
                                        >
                                            {t.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-2 text-xs text-slate-400 italic">Nessuna tipologia disponibile.</div>
                                )}
                            </div>
                            
                            {/* NEW NOTES FIELD */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                                    <WrenchIcon className="h-3 w-3"/> Note Aggiuntive
                                </label>
                                <textarea 
                                    value={notes} 
                                    onChange={e => setNotes(e.target.value)} 
                                    className="w-full border rounded p-2 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-200"
                                    placeholder="Dettagli extra sulla tipologia (es. rimozione nido vespe)"
                                    rows={2}
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 items-end">
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                                <select value={addressType} onChange={e => setAddressType(e.target.value)} className="w-full border rounded p-3 bg-white text-xs font-bold outline-none">
                                    {ADDRESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Indirizzo *</label>
                                <input type="text" value={streetName} onChange={e => setStreetName(e.target.value)} className="w-full border rounded p-3 bg-white text-sm outline-none" placeholder="Nome via" />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Civico/Km</label>
                                <input type="text" value={civicNumber} onChange={e => setCivicNumber(e.target.value)} className="w-full border rounded p-3 bg-white text-sm outline-none" placeholder="Nr/Km" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Comune</label>
                                {isCustomMunicipality ? (
                                    <div className="flex gap-1">
                                        <input 
                                            type="text" 
                                            value={municipality} 
                                            onChange={e => setMunicipality(e.target.value.toUpperCase())} 
                                            className="w-full border rounded p-3 bg-white outline-none text-sm font-bold" 
                                            placeholder="Inserisci comune..."
                                            autoFocus
                                        />
                                        <button onClick={() => { setIsCustomMunicipality(false); setMunicipality('MONTEPULCIANO'); }} className="bg-slate-200 px-2 rounded text-xs">x</button>
                                    </div>
                                ) : (
                                    <select 
                                        value={municipality} 
                                        onChange={e => {
                                            if (e.target.value === 'ALTRO...') {
                                                setIsCustomMunicipality(true);
                                                setMunicipality('');
                                            } else {
                                                setMunicipality(e.target.value);
                                            }
                                        }} 
                                        className="w-full border rounded p-3 bg-white outline-none text-sm font-bold"
                                    >
                                        {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Località</label>
                                <input type="text" value={locality} onChange={e => setLocality(e.target.value)} className="w-full border rounded p-3 bg-white outline-none" placeholder="(Opzionale)" />
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-fade-in">
                        <h3 className="font-bold text-orange-800 uppercase text-sm border-b border-orange-200 pb-2">Step 3: Personale</h3>
                        
                        {/* TEAM LEADER SECTION */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Capo Partenza</label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={isExternalLeader} 
                                        onChange={() => setIsExternalLeader(!isExternalLeader)}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                                    />
                                    <span className="text-xs text-slate-600 font-bold">Altra Sede</span>
                                </label>
                            </div>

                            {isExternalLeader ? (
                                <input 
                                    type="text" 
                                    value={externalLeaderName} 
                                    onChange={e => setExternalLeaderName(e.target.value)} 
                                    placeholder="Grado Nome Cognome (es. CR Mario Rossi)" 
                                    className="w-full border rounded p-3 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-200 font-bold"
                                    autoFocus
                                />
                            ) : (
                                <div className="grid grid-cols-4 gap-3 max-h-40 overflow-y-auto p-1">
                                    {eligibleLeaders.map(s => {
                                        const isSelected = teamLeaderId === s.id;
                                        return (
                                            <button 
                                                key={s.id}
                                                onClick={() => setTeamLeaderId(s.id)}
                                                className={`
                                                    flex flex-col items-center p-2 rounded-xl border-2 transition-all
                                                    ${isSelected ? 'bg-orange-100 border-orange-500 shadow-md transform scale-105' : 'bg-white border-slate-200 hover:border-orange-300'}
                                                `}
                                            >
                                                {/* Wrapper RELATIVE senza overflow hidden per contenere il badge */}
                                                <div className="relative w-10 h-10">
                                                    {/* Avatar Container con overflow hidden per la foto tonda */}
                                                    <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center">
                                                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <span className="text-lg">{s.icon || '👤'}</span>}
                                                    </div>
                                                    {/* Badge fuori dal container overflow */}
                                                    <div className="absolute -top-2 -right-2 scale-75 z-10">
                                                        <GradeBadge grade={s.grade} />
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] font-bold mt-1 text-center w-full truncate ${isSelected ? 'text-orange-800' : 'text-slate-600'}`}>{s.name.split(' ')[0]}</span>
                                            </button>
                                        )
                                    })}
                                    {eligibleLeaders.length === 0 && <p className="text-xs text-red-400 italic col-span-4">Nessun personale idoneo nel turno.</p>}
                                </div>
                            )}
                        </div>

                        {/* OFFICER ICON GRID - RESIZED AND CONTAINED */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Funzionario di Servizio</label>
                            <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto p-1">
                                {dutyOfficers.map(o => {
                                    const isSelected = officerId === o.id;
                                    return (
                                        <button 
                                            key={o.id}
                                            onClick={() => setOfficerId(o.id)}
                                            className={`
                                                flex flex-col items-center p-2 rounded-xl border-2 transition-all w-full overflow-hidden
                                                ${isSelected ? 'bg-blue-100 border-blue-500 shadow-md scale-[1.02]' : 'bg-white border-slate-200 hover:border-blue-300'}
                                            `}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                                                <span className="text-base">👮‍♂️</span>
                                            </div>
                                            <span className={`text-[9px] font-bold mt-1 text-center w-full truncate px-1 ${isSelected ? 'text-blue-800' : 'text-slate-600'}`} title={o.name}>
                                                {o.name}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    // PIE CHART COMPONENT (Local)
    const SimplePieChart = () => {
        const counts = stats.shiftCounts as Record<string, number>;
        const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);
        if (total === 0) return <div className="text-center text-xs text-slate-400 py-8">Nessun dato</div>;

        const colors: Record<string, string> = { a: '#ef4444', b: '#3b82f6', c: '#22c55e', d: '#eab308' };
        let currentAngle = 0;
        
        const gradient = Object.entries(counts).map(([shift, count]) => {
            const val = Number(count);
            const percentage = (val / total) * 100;
            const endAngle = currentAngle + percentage;
            const str = `${colors[shift]} ${currentAngle}% ${endAngle}%`;
            currentAngle = endAngle;
            return str;
        }).join(', ');

        return (
            <div className="flex items-center gap-4">
                <div 
                    className="w-20 h-20 rounded-full border-4 border-slate-100 shadow-sm"
                    style={{ background: `conic-gradient(${gradient})` }}
                ></div>
                <div className="flex flex-col gap-1">
                    {(['a','b','c','d'] as Shift[]).map(s => (
                        <div key={s} className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-600">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[s] }}></div>
                            Turno {s}: {stats.shiftCounts[s]}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <header className="bg-orange-600 text-white p-4 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)] relative overflow-hidden">
                
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white transition-colors relative z-10"
                >
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <BackArrowIcon className="h-5 w-5" />
                    </div>
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <div className="flex items-center gap-3 drop-shadow-md relative z-10">
                    {/* ANIMATED EXTINGUISHER */}
                    <ExtinguisherHeader />
                    
                    <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest">
                        <span>Registro Interventi</span>
                    </h1>
                </div>
                
                <div className="w-12 md:w-24 relative z-10"></div> 
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
                
                {/* BUTTON NUOVO INTERVENTO - REDESIGNED */}
                {!isWizardOpen && (
                    <button 
                        onClick={() => { resetForm(); setIsWizardOpen(true); }}
                        className="w-full bg-white p-4 rounded-2xl shadow-md border-2 border-orange-100 hover:border-orange-300 hover:shadow-lg transition-all group active:scale-[0.99] flex items-center gap-4 relative overflow-hidden"
                    >
                        <div className="bg-orange-100 p-4 rounded-full border-2 border-orange-200 group-hover:bg-orange-200 group-hover:scale-110 transition-transform z-10">
                            <FireIcon className="h-8 w-8 text-orange-600 drop-shadow-sm" />
                        </div>
                        
                        <div className="text-left z-10 flex-grow">
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight group-hover:text-orange-700 transition-colors">
                                Nuovo Intervento
                            </h2>
                            <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-wide">
                                Registra uscita squadra turno {activeShift.toUpperCase()}
                            </p>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute right-[-20px] bottom-[-20px] opacity-5 transform rotate-12 group-hover:rotate-0 transition-all duration-500">
                            <FireIcon className="h-32 w-32" />
                        </div>
                    </button>
                )}

                {/* WIZARD FORM */}
                {isWizardOpen && (
                    <div className="bg-white rounded-xl shadow-xl border border-orange-200 overflow-hidden animate-slide-up">
                        <div className="bg-orange-50 p-4 border-b border-orange-100 flex justify-between items-center">
                            <h2 className="font-bold text-orange-900 uppercase">
                                {editingId ? 'Modifica Intervento' : 'Nuovo Intervento'} - Step {step}/3
                            </h2>
                            <button onClick={() => { setIsWizardOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
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
                                    <CheckIcon className="h-5 w-5"/> {editingId ? 'Aggiorna' : 'Salva nel Registro'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* DASHBOARD STATISTICHE */}
                {!isWizardOpen && interventions.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. GRAFICO TORTA */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-4 border-b pb-2">
                                <ChartBarIcon className="h-4 w-4"/> Interventi per Turno
                            </h3>
                            <SimplePieChart />
                        </div>

                        {/* 2. TOP LEADER */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <TrophyIcon className="h-24 w-24 text-yellow-500" />
                            </div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-4 border-b pb-2">
                                <TrophyIcon className="h-4 w-4 text-yellow-500"/> Top Capo Partenza
                            </h3>
                            {stats.topLeader ? (
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-yellow-400 flex items-center justify-center text-3xl shadow-md overflow-hidden">
                                        {stats.topLeader.photoUrl ? (
                                            <img src={stats.topLeader.photoUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            stats.topLeader.icon || '👤'
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 text-lg">{stats.topLeader.name}</p>
                                        <p className="text-xs font-bold text-slate-500 uppercase">{stats.topLeader.grade} - Turno {stats.topLeader.shift.toUpperCase()}</p>
                                        <div className="mt-2 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full inline-block">
                                            {stats.maxCount} Interventi
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-slate-400 text-xs italic">Dati insufficienti.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* LISTA STORICO AGGIORNATA */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5 text-slate-500"/> Registro Storico
                            </h3>
                            <div className="flex gap-2 items-center">
                                <button 
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showFilters ? 'bg-orange-100 text-orange-600 shadow-inner' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}
                                    title="Filtri"
                                >
                                    <FilterIcon className="h-4 w-4" />
                                </button>
                                <span className="text-xs font-bold bg-white px-2 py-1 rounded text-slate-500 border">{filteredInterventions.length} Record</span>
                            </div>
                        </div>

                        {/* FILTER BAR (DROPDOWNS) */}
                        {showFilters && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 animate-slide-up">
                                <input
                                    type="text"
                                    value={filterNumber}
                                    onChange={e => setFilterNumber(e.target.value)}
                                    className="border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-orange-200"
                                    placeholder="Cerca Nr. S.O."
                                />
                                <input 
                                    type="date" 
                                    value={filterDate} 
                                    onChange={e => setFilterDate(e.target.value)} 
                                    className="border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-orange-200" 
                                    placeholder="Data"
                                />
                                <select 
                                    value={filterTypology} 
                                    onChange={e => setFilterTypology(e.target.value)} 
                                    className="border rounded px-2 py-1 text-xs bg-white outline-none focus:ring-1 focus:ring-orange-200"
                                >
                                    <option value="">Tutte le Tipologie</option>
                                    {uniqueTypologies.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select 
                                    value={filterMunicipality} 
                                    onChange={e => setFilterMunicipality(e.target.value)} 
                                    className="border rounded px-2 py-1 text-xs bg-white outline-none focus:ring-1 focus:ring-orange-200"
                                >
                                    <option value="">Tutti i Comuni</option>
                                    {uniqueMunicipalities.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select 
                                    value={filterLeader} 
                                    onChange={e => setFilterLeader(e.target.value)} 
                                    className="border rounded px-2 py-1 text-xs bg-white outline-none focus:ring-1 focus:ring-orange-200"
                                >
                                    <option value="">Tutti i Capi Partenza</option>
                                    {uniqueLeaders.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-600 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-3 text-center">Turno</th>
                                    <th className="p-3">Nr. / Data</th>
                                    <th className="p-3">Tipologia / Luogo</th>
                                    <th className="p-3">Squadra</th>
                                    <th className="p-3 text-center">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredInterventions.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Nessun intervento trovato.</td></tr>
                                ) : (
                                    filteredInterventions.map((int) => {
                                        const shiftColor = {
                                            'a': 'bg-red-100 text-red-700 border-red-200',
                                            'b': 'bg-blue-100 text-blue-700 border-blue-200',
                                            'c': 'bg-green-100 text-green-700 border-green-200',
                                            'd': 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                        }[int.shift.toLowerCase()] || 'bg-slate-100 text-slate-600';

                                        const progNum = progressiveMap.get(int.id);

                                        return (
                                            <tr key={int.id} className={`transition-colors ${int.isDeleted ? 'bg-red-50' : 'hover:bg-orange-50/30'}`}>
                                                <td className="p-3 text-center align-top">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${shiftColor}`}>
                                                            {int.shift.toUpperCase()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200">
                                                            N° {progNum}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 align-top">
                                                    {int.interventionNumber && (
                                                        <div className={`font-mono text-xs font-bold mb-1 ${int.isDeleted ? 'line-through text-red-400' : 'text-slate-800'}`}>
                                                            S.O. Nr. {int.interventionNumber}
                                                        </div>
                                                    )}
                                                    <div className={`text-xs ${int.isDeleted ? 'text-red-400' : 'text-slate-600'}`}>
                                                        <div className="font-bold">{new Date(int.date).toLocaleDateString('it-IT')}</div>
                                                        <div className="font-mono text-[10px]">{int.exitTime} - {int.returnTime}</div>
                                                    </div>
                                                </td>
                                                <td className="p-3 align-top">
                                                    <span className={`font-bold uppercase text-xs block ${int.isDeleted ? 'line-through text-red-400' : 'text-slate-800'}`}>
                                                        {int.typology}
                                                    </span>
                                                    {int.notes && (
                                                        <div className="text-[10px] text-slate-500 italic mt-0.5 bg-slate-50 px-1 rounded inline-block border border-slate-100">
                                                            Note: {int.notes}
                                                        </div>
                                                    )}
                                                    <div className={`text-[11px] mt-1 ${int.isDeleted ? 'text-red-300' : 'text-slate-500'}`}>
                                                        {int.addressType} {int.street} {int.number}, {int.municipality}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-xs text-slate-500 align-top">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold text-[9px] uppercase tracking-wide opacity-70">CP:</span>
                                                        <span className={int.isDeleted ? 'line-through' : ''}>{int.teamLeaderName}</span>
                                                    </div>
                                                    {int.dutyOfficer && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="font-bold text-[9px] uppercase tracking-wide opacity-70">FUNZ:</span>
                                                            <span className={int.isDeleted ? 'line-through' : ''}>{int.dutyOfficer}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center align-middle">
                                                    {int.isDeleted ? (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[9px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded border border-red-200 mb-1">ANNULLATO</span>
                                                            {isSuperAdmin && (
                                                                <button onClick={() => handleHardDelete(int.id)} className="text-slate-400 hover:text-black p-1 transition-colors" title="Elimina definitivamente">
                                                                    <TrashIcon className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleOpenEdit(int)} className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors" title="Modifica">
                                                                <EditIcon className="h-4 w-4" />
                                                            </button>
                                                            <button onClick={() => handleSoftDelete(int.id)} className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors" title="Elimina">
                                                                <TrashIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
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
