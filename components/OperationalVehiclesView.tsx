
import React, { useState, useMemo } from 'react';
import { OperationalVehicle, Shift, VehicleCheck } from '../types';
import { BackArrowIcon, TruckIcon, CheckIcon, SaveIcon, EditIcon, ListIcon, CalendarIcon } from './Icons';
import { useBar } from '../contexts/BarContext';

interface OperationalVehiclesViewProps {
    onGoBack: () => void;
}

const OperationalVehiclesView: React.FC<OperationalVehiclesViewProps> = ({ onGoBack }) => {
    const { operationalVehicles, vehicleChecks, addVehicleCheck, updateVehicleCheck, getNow } = useBar();
    const [selectedVehicle, setSelectedVehicle] = useState<OperationalVehicle | null>(null);

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

    const today = getNow();
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const currentDayName = days[today.getDay()];

    const handleSelectVehicle = (v: OperationalVehicle) => {
        setSelectedVehicle(v);
        window.scrollTo(0,0);
    };

    if (selectedVehicle) {
        return (
            <VehicleChecklist 
                vehicle={selectedVehicle} 
                onBack={() => setSelectedVehicle(null)} 
                activeShift={activeShift}
                checks={vehicleChecks.filter(c => c.vehicleId === selectedVehicle.id).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
                onAddCheck={addVehicleCheck}
                onUpdateCheck={updateVehicleCheck}
            />
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <header className="bg-red-700 text-white px-4 py-4 shadow-lg sticky top-0 z-50 flex items-center justify-between mt-[env(safe-area-inset-top)]">
                <button 
                    onClick={onGoBack} 
                    className="flex items-center gap-2 font-bold text-white/90 hover:text-white bg-red-800/40 px-4 py-2 rounded-full hover:bg-red-800/60 transition-colors backdrop-blur-sm"
                >
                    <BackArrowIcon className="h-5 w-5" /> 
                    <span className="text-sm hidden md:inline">Indietro</span>
                </button>
                
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest flex items-center gap-3 drop-shadow-md">
                    <TruckIcon className="h-8 w-8" />
                    <span>Mezzi Operativi</span>
                </h1>
                
                <div className="w-12 md:w-24"></div> 
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {operationalVehicles.map(v => {
                        const isCheckDay = v.checkDay === currentDayName;
                        
                        return (
                            <div 
                                key={v.id} 
                                onClick={() => handleSelectVehicle(v)}
                                className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col group relative cursor-pointer hover:shadow-xl transition-all hover:scale-[1.01]"
                            >
                                {/* BADGE GIORNO CONTROLLO */}
                                <div className={`
                                    absolute top-3 right-3 z-10 font-black text-[10px] uppercase px-3 py-1 rounded-full shadow-lg border
                                    ${isCheckDay 
                                        ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_#ef4444] animate-pulse' 
                                        : 'bg-white/90 text-slate-500 border-slate-200 backdrop-blur-sm'
                                    }
                                `}>
                                    {isCheckDay ? 'DI CONTROLLO' : v.checkDay}
                                </div>

                                <div className="h-48 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                                    {v.photoUrl ? (
                                        <img src={v.photoUrl} alt={v.model} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                    ) : (
                                        <span className="text-6xl filter drop-shadow-md">🚒</span>
                                    )}
                                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                                        <span className="text-xs font-black text-white bg-red-600 px-2 py-0.5 rounded uppercase">{v.type}</span>
                                    </div>
                                </div>
                                
                                <div className="p-5 flex-grow flex flex-col">
                                    <h3 className="text-xl font-black text-slate-800 leading-tight">{v.model}</h3>
                                    <div className="mt-2">
                                        <span className="text-sm font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase tracking-wide">
                                            {v.plate}
                                        </span>
                                    </div>
                                    
                                    {v.notes && (
                                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-2">{v.notes}</p>
                                        </div>
                                    )}
                                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                                        <span className="text-xs font-bold text-blue-600 uppercase">Apri Checklist →</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {operationalVehicles.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300">
                            <p className="text-slate-400 font-bold text-lg">Nessun mezzo operativo registrato.</p>
                            <p className="text-sm text-slate-400">Accedi come Amministratore per aggiungere i mezzi.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// --- SUB-COMPONENT: Checklist & History ---

const VehicleChecklist: React.FC<{ 
    vehicle: OperationalVehicle, 
    onBack: () => void, 
    activeShift: Shift,
    checks: VehicleCheck[],
    onAddCheck: (c: Omit<VehicleCheck, 'id'>) => Promise<void>,
    onUpdateCheck: (id: string, u: Partial<VehicleCheck>) => Promise<void>
}> = ({ vehicle, onBack, activeShift, checks, onAddCheck, onUpdateCheck }) => {
    
    // State per checklist corrente (Key: CompartmentID_ItemID)
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [expandedCompartments, setExpandedCompartments] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState('');
    
    // State per modifica storico
    const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
    const [editNote, setEditNote] = useState('');

    const toggleCompartment = (id: string) => {
        setExpandedCompartments(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleItem = (compId: string, itemId: string) => {
        const key = `${compId}_${itemId}`;
        setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isCompartmentComplete = (comp: any) => {
        if (!comp.items || comp.items.length === 0) return true;
        return comp.items.every((item: any) => checkedItems[`${comp.id}_${item.id}`]);
    };

    const handleArchive = async () => {
        if(!confirm("Confermi l'archiviazione del controllo?")) return;

        const missingItems: { compartmentName: string, itemName: string, quantity: number }[] = [];
        
        vehicle.compartments?.forEach(comp => {
            comp.items.forEach(item => {
                const key = `${comp.id}_${item.id}`;
                if (!checkedItems[key]) {
                    missingItems.push({
                        compartmentName: comp.name,
                        itemName: item.name,
                        quantity: item.quantity || 1
                    });
                }
            });
        });

        const status = missingItems.length === 0 ? 'ok' : 'issues';
        
        try {
            await onAddCheck({
                vehicleId: vehicle.id,
                vehicleName: `${vehicle.model} (${vehicle.plate})`,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                shift: activeShift,
                status,
                missingItems,
                notes: notes.trim()
            });
            alert("Controllo archiviato con successo!");
            setCheckedItems({});
            setNotes('');
            setExpandedCompartments({});
        } catch (e) {
            console.error(e);
            alert("Errore salvataggio.");
        }
    };

    const handleSaveEditNote = async (checkId: string) => {
        await onUpdateCheck(checkId, { notes: editNote });
        setEditingCheckId(null);
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
            <header className="bg-slate-800 text-white p-4 shadow-lg sticky top-0 z-50 flex items-center gap-4 mt-[env(safe-area-inset-top)]">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                    <BackArrowIcon className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-lg font-bold leading-tight">{vehicle.model}</h1>
                    <p className="text-xs text-slate-400 font-mono">{vehicle.plate}</p>
                </div>
                <div className="ml-auto bg-slate-700 px-3 py-1 rounded text-xs font-bold uppercase border border-slate-600">
                    Turno {activeShift.toUpperCase()}
                </div>
            </header>

            <main className="flex-grow p-4 max-w-4xl mx-auto w-full space-y-8 pb-20">
                
                {/* SEZIONE 1: CHECKLIST */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                            <ListIcon className="h-5 w-5"/> Checklist Materiali
                        </h2>
                        <span className="text-xs text-slate-500 font-bold">{vehicle.compartments?.length || 0} Vani</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {vehicle.compartments?.map(comp => {
                            const isComplete = isCompartmentComplete(comp);
                            const isOpen = expandedCompartments[comp.id];
                            const totalItems = comp.items.length;
                            const checkedCount = comp.items.filter(i => checkedItems[`${comp.id}_${i.id}`]).length;

                            return (
                                <div key={comp.id} className="bg-white">
                                    {/* Header Vano */}
                                    <button 
                                        onClick={() => toggleCompartment(comp.id)}
                                        className={`w-full p-4 flex justify-between items-center hover:bg-slate-50 transition-colors text-left ${isOpen ? 'bg-slate-50' : ''}`}
                                    >
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-sm">{comp.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">{checkedCount}/{totalItems} oggetti</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {totalItems > 0 && (
                                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${isComplete ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                                    {isComplete ? 'Completato' : 'Non Completato'}
                                                </span>
                                            )}
                                            <span className="text-slate-400 text-lg">{isOpen ? '−' : '+'}</span>
                                        </div>
                                    </button>

                                    {/* Lista Oggetti */}
                                    {isOpen && (
                                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-2 animate-fade-in">
                                            {comp.items.map(item => {
                                                const isChecked = checkedItems[`${comp.id}_${item.id}`];
                                                return (
                                                    <label key={item.id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!isChecked} 
                                                            onChange={() => toggleItem(comp.id, item.id)}
                                                            className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500 mr-3"
                                                        />
                                                        <div className="flex-grow min-w-0">
                                                            <div className={`font-bold text-xs truncate ${isChecked ? 'text-green-800' : 'text-slate-700'}`}>{item.name}</div>
                                                            <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
                                                                <span className="bg-slate-100 px-1.5 rounded">Qt: {item.quantity}</span>
                                                                {item.expirationDate && (
                                                                    <span className="bg-orange-50 text-orange-600 px-1.5 rounded border border-orange-100">
                                                                        Scad: {new Date(item.expirationDate).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                            {comp.items.length === 0 && <p className="text-xs text-slate-400 italic p-2">Vano vuoto.</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {(!vehicle.compartments || vehicle.compartments.length === 0) && (
                            <div className="p-8 text-center text-slate-400 text-sm">Nessun vano configurato.</div>
                        )}
                    </div>

                    {/* Footer Check */}
                    <div className="p-4 bg-slate-100 border-t border-slate-200">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Note Controllo</label>
                        <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none mb-4" 
                            rows={3} 
                            placeholder="Segnala problemi o mancanze..."
                        />
                        <button 
                            onClick={handleArchive}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            <SaveIcon className="h-5 w-5" /> Archivia Controllo
                        </button>
                    </div>
                </div>

                {/* SEZIONE 2: REGISTRO STORICO */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                        <h2 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-slate-500"/> Registro Controlli
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                        {checks.length === 0 ? (
                            <p className="text-center text-slate-400 italic py-8 text-sm">Nessun controllo registrato.</p>
                        ) : (
                            checks.map(check => (
                                <div key={check.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="font-bold text-sm text-slate-800">
                                                {new Date(check.date).toLocaleDateString()} <span className="text-slate-400 font-normal text-xs">({new Date(check.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})</span>
                                            </div>
                                            <div className="text-xs text-slate-500 font-bold uppercase mt-0.5">
                                                Turno {check.shift.toUpperCase()}
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-black uppercase border ${check.status === 'ok' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                            {check.status === 'ok' ? 'Completo' : 'Mancanze'}
                                        </div>
                                    </div>

                                    {/* Lista Mancanze */}
                                    {check.missingItems && check.missingItems.length > 0 && (
                                        <div className="bg-red-50 border border-red-100 rounded p-2 mb-2">
                                            <p className="text-[10px] font-bold text-red-700 uppercase mb-1">Oggetti Mancanti:</p>
                                            <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                                                {check.missingItems.map((m, idx) => (
                                                    <li key={idx}><b>{m.compartmentName}:</b> {m.itemName} (x{m.quantity})</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Note Modificabili */}
                                    <div className="mt-2">
                                        {editingCheckId === check.id ? (
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={editNote} 
                                                    onChange={e => setEditNote(e.target.value)} 
                                                    className="flex-grow border rounded p-1 text-xs" 
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveEditNote(check.id)} className="bg-green-500 text-white p-1 rounded"><CheckIcon className="h-3 w-3"/></button>
                                                <button onClick={() => setEditingCheckId(null)} className="bg-slate-200 text-slate-500 p-1 rounded font-bold text-xs">X</button>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-start group">
                                                <span>{check.notes || 'Nessuna nota.'}</span>
                                                <button 
                                                    onClick={() => { setEditingCheckId(check.id); setEditNote(check.notes); }}
                                                    className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-600 transition-opacity"
                                                >
                                                    <EditIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default OperationalVehiclesView;
