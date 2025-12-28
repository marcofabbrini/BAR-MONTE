
import React, { useState, useRef } from 'react';
import { OperationalVehicle, OperationalVehicleType, CheckDay, VehicleCompartment } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, TruckIcon, BoxIcon, CalendarIcon, ListIcon } from './Icons';
import { APS_VF30217_LOADOUT, POL_VF29068_LOADOUT, CAPU_VF32356_LOADOUT, ABP_VF22456_LOADOUT } from '../constants';

interface OperationalVehicleManagementProps {
    vehicles: OperationalVehicle[];
    onAddVehicle: (v: Omit<OperationalVehicle, 'id'>) => Promise<void>;
    onUpdateVehicle: (v: OperationalVehicle) => Promise<void>;
    onDeleteVehicle: (id: string) => Promise<void>;
}

const emptyVehicle: Omit<OperationalVehicle, 'id'> = {
    plate: '',
    model: '',
    type: 'APS',
    checkDay: 'Lunedì',
    notes: '',
    photoUrl: '',
    compartments: []
};

// Interface for new item input state
interface NewItemInput {
    name: string;
    quantity: string;
    expirationDate: string;
}

const OperationalVehicleManagement: React.FC<OperationalVehicleManagementProps> = ({ vehicles, onAddVehicle, onUpdateVehicle, onDeleteVehicle }) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<OperationalVehicle, 'id'>>(emptyVehicle);
    const [isProcessingImg, setIsProcessingImg] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // State per l'input rapido di materiale (chiave = id vano)
    const [newItemInput, setNewItemInput] = useState<Record<string, NewItemInput>>({});

    const vehicleTypes: OperationalVehicleType[] = ['APS', 'ABP', 'POL', 'CA/PU', 'AV', 'AF', 'RIBA', 'CARRELLO', 'ALTRO'];
    const checkDays: CheckDay[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];

    const handleEdit = (v: OperationalVehicle) => {
        setIsEditing(v.id);
        const { id, ...data } = v;
        // Ensure compartments is initialized
        if (!data.compartments) data.compartments = [];
        setFormData(data);
        window.scrollTo(0,0);
        setNewItemInput({}); // Reset inputs
    };

    const handleCancel = () => {
        setIsEditing(null);
        setFormData(emptyVehicle);
        setNewItemInput({});
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Eliminare questo mezzo operativo?")) {
            await onDeleteVehicle(id);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // --- LOGICA VANI (COMPARTMENTS) ---

    const addCompartment = () => {
        const newComp: VehicleCompartment = {
            id: Date.now().toString(),
            name: `Vano ${formData.compartments ? formData.compartments.length + 1 : 1}`,
            items: []
        };
        setFormData(prev => ({
            ...prev,
            compartments: [...(prev.compartments || []), newComp]
        }));
    };

    const loadStandardAPS = () => {
        if(!confirm("ATTENZIONE: Questo sostituirà tutti i vani e materiali attuali con l'allestimento standard APS VF 30217. Continuare?")) return;
        
        // Deep copy the standard loadout to avoid reference issues
        const standardLoadout: VehicleCompartment[] = JSON.parse(JSON.stringify(APS_VF30217_LOADOUT)).map((comp: any, index: number) => ({
            ...comp,
            id: `std-aps-${index}-${Date.now()}` // Generate unique IDs for compartments
        }));

        setFormData(prev => ({
            ...prev,
            plate: prev.plate || 'VF 30217',
            model: prev.model || 'APS Mercedes/Iveco',
            type: 'APS',
            compartments: standardLoadout
        }));
    };

    const loadStandardPOL = () => {
        if(!confirm("ATTENZIONE: Questo sostituirà tutti i vani e materiali attuali con l'allestimento standard POL VF 29068. Continuare?")) return;
        
        const standardLoadout: VehicleCompartment[] = JSON.parse(JSON.stringify(POL_VF29068_LOADOUT)).map((comp: any, index: number) => ({
            ...comp,
            id: `std-pol-${index}-${Date.now()}`
        }));

        setFormData(prev => ({
            ...prev,
            plate: prev.plate || 'VF 29068',
            model: prev.model || 'POLISOC. Iveco Daily',
            type: 'POL',
            compartments: standardLoadout
        }));
    };

    const loadStandardCAPU = () => {
        if(!confirm("ATTENZIONE: Questo sostituirà tutti i vani e materiali attuali con l'allestimento standard CA/PU VF 32356. Continuare?")) return;
        
        const standardLoadout: VehicleCompartment[] = JSON.parse(JSON.stringify(CAPU_VF32356_LOADOUT)).map((comp: any, index: number) => ({
            ...comp,
            id: `std-capu-${index}-${Date.now()}`
        }));

        setFormData(prev => ({
            ...prev,
            plate: prev.plate || 'VF 32356',
            model: prev.model || 'CA/PU Toyota Hilux',
            type: 'CA/PU',
            compartments: standardLoadout
        }));
    };

    const loadStandardABP = () => {
        if(!confirm("ATTENZIONE: Questo sostituirà tutti i vani e materiali attuali con l'allestimento standard ABP VF 22456. Continuare?")) return;
        
        const standardLoadout: VehicleCompartment[] = JSON.parse(JSON.stringify(ABP_VF22456_LOADOUT)).map((comp: any, index: number) => ({
            ...comp,
            id: `std-abp-${index}-${Date.now()}`
        }));

        setFormData(prev => ({
            ...prev,
            plate: prev.plate || 'VF 22456',
            model: prev.model || 'ABP Iveco',
            type: 'ABP',
            compartments: standardLoadout
        }));
    };

    const removeCompartment = (compId: string) => {
        if(!confirm("Eliminare questo vano e tutto il suo contenuto?")) return;
        setFormData(prev => ({
            ...prev,
            compartments: (prev.compartments || []).filter(c => c.id !== compId)
        }));
    };

    const updateCompartmentName = (compId: string, newName: string) => {
        setFormData(prev => ({
            ...prev,
            compartments: (prev.compartments || []).map(c => c.id === compId ? { ...c, name: newName } : c)
        }));
    };

    // --- LOGICA MATERIALI (ITEMS) ---

    const handleItemInputChange = (compId: string, field: keyof NewItemInput, value: string) => {
        setNewItemInput(prev => ({
            ...prev,
            [compId]: {
                ...(prev[compId] || { name: '', quantity: '1', expirationDate: '' }),
                [field]: value
            }
        }));
    };

    const addItemToCompartment = (compId: string) => {
        const input = newItemInput[compId];
        if (!input || !input.name.trim()) return;

        const newItem = {
            id: Date.now().toString() + Math.random(),
            name: input.name.trim(),
            quantity: parseInt(input.quantity) || 1,
            expirationDate: input.expirationDate || undefined
        };

        setFormData(prev => ({
            ...prev,
            compartments: (prev.compartments || []).map(c => {
                if (c.id === compId) {
                    return {
                        ...c,
                        items: [...c.items, newItem]
                    };
                }
                return c;
            })
        }));

        // Reset inputs for this compartment
        setNewItemInput(prev => ({ ...prev, [compId]: { name: '', quantity: '1', expirationDate: '' } }));
    };

    const removeItemFromCompartment = (compId: string, itemId: string) => {
        setFormData(prev => ({
            ...prev,
            compartments: (prev.compartments || []).map(c => {
                if (c.id === compId) {
                    return {
                        ...c,
                        items: c.items.filter(i => i.id !== itemId)
                    };
                }
                return c;
            })
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.plate || !formData.model) return;

        try {
            if(isEditing) {
                await onUpdateVehicle({ id: isEditing, ...formData });
            } else {
                await onAddVehicle(formData);
            }
            handleCancel();
        } catch(e) {
            console.error(e);
            alert("Errore salvataggio mezzo.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsProcessingImg(true);
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 400; 
                    const MAX_HEIGHT = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
                    setIsProcessingImg(false);
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3 uppercase tracking-wide border-b border-slate-100 pb-4">
                    <TruckIcon className="h-8 w-8 text-red-600" />
                    {isEditing ? 'Modifica Mezzo' : 'Nuovo Mezzo'}
                </h3>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLONNA 1: FOTO */}
                    <div className="flex flex-col items-center justify-start gap-4">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-video lg:aspect-square rounded-xl border-4 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-red-300 transition-all overflow-hidden relative group shadow-inner"
                        >
                            {formData.photoUrl ? (
                                <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-slate-300">
                                    <span className="text-6xl block mb-2">📷</span>
                                    <span className="text-xs font-bold uppercase">Carica Foto</span>
                                </div>
                            )}
                            {isProcessingImg && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-b-4 border-red-600 rounded-full"></div></div>}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold uppercase text-sm">Cambia</span>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    </div>

                    {/* COLONNA 2: DATI PRINCIPALI */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 block">Targa</label>
                                <input name="plate" value={formData.plate} onChange={handleChange} placeholder="VF 12345" className="w-full border-2 border-slate-200 p-3 rounded-lg font-mono font-bold uppercase text-lg focus:border-red-500 focus:ring-red-200 outline-none transition-all" required />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 block">Modello / Marca</label>
                                <input name="model" value={formData.model} onChange={handleChange} placeholder="Iveco Eurocargo" className="w-full border-2 border-slate-200 p-3 rounded-lg font-bold text-slate-700 text-lg focus:border-red-500 focus:ring-red-200 outline-none transition-all" required />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 block">Tipologia</label>
                                <select name="type" value={formData.type} onChange={handleChange} className="w-full border-2 border-slate-200 p-3 rounded-lg bg-white font-bold text-slate-700 outline-none focus:border-red-500">
                                    {vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 block">Giorno Controllo</label>
                                <select name="checkDay" value={formData.checkDay} onChange={handleChange} className="w-full border-2 border-slate-200 p-3 rounded-lg bg-white font-bold text-slate-700 outline-none focus:border-red-500">
                                    {checkDays.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1 block">Note Operative</label>
                            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} placeholder="Note aggiuntive..." className="w-full border-2 border-slate-200 p-3 rounded-lg text-sm font-medium focus:border-red-500 outline-none" rows={3} />
                        </div>
                    </div>

                    {/* COLONNA 3: GESTIONE VANI E MATERIALI (Full Width below) */}
                    <div className="lg:col-span-3 border-t-2 border-slate-100 pt-6 mt-2">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h4 className="font-bold text-slate-700 uppercase flex items-center gap-2">
                                <BoxIcon className="h-5 w-5 text-slate-500" /> Configurazione Caricamento (Vani & Materiali)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    type="button"
                                    onClick={loadStandardAPS}
                                    className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1"
                                >
                                    <ListIcon className="h-3 w-3" /> Load APS VF 30217
                                </button>
                                <button 
                                    type="button"
                                    onClick={loadStandardABP}
                                    className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                >
                                    <ListIcon className="h-3 w-3" /> Load ABP VF 22456
                                </button>
                                <button 
                                    type="button"
                                    onClick={loadStandardPOL}
                                    className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-200 hover:bg-orange-100 transition-colors flex items-center gap-1"
                                >
                                    <ListIcon className="h-3 w-3" /> Load POL VF 29068
                                </button>
                                <button 
                                    type="button"
                                    onClick={loadStandardCAPU}
                                    className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                >
                                    <ListIcon className="h-3 w-3" /> Load CA/PU VF 32356
                                </button>
                                <button 
                                    type="button" 
                                    onClick={addCompartment}
                                    className="bg-green-50 text-green-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-green-200 hover:bg-green-100 transition-colors flex items-center gap-1"
                                >
                                    <PlusIcon className="h-3 w-3" /> Aggiungi Vano
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formData.compartments?.map((comp, index) => (
                                <div key={comp.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative group hover:shadow-md transition-all flex flex-col h-full">
                                    {/* Header Vano */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="bg-slate-200 text-slate-500 w-6 h-6 flex items-center justify-center rounded font-bold text-xs">
                                            {index + 1}
                                        </div>
                                        <input 
                                            type="text" 
                                            value={comp.name} 
                                            onChange={(e) => updateCompartmentName(comp.id, e.target.value)}
                                            className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none flex-grow"
                                            placeholder="Nome Vano (es. 1SX)"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => removeCompartment(comp.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                            title="Elimina Vano"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Lista Materiali */}
                                    <div className="bg-white rounded-lg border border-slate-200 p-2 min-h-[80px] max-h-[240px] overflow-y-auto space-y-1 mb-3 flex-grow">
                                        {comp.items.length === 0 && <p className="text-center text-xs text-slate-300 italic py-4">Nessun materiale</p>}
                                        {comp.items.map(item => (
                                            <div key={item.id} className="flex justify-between items-center text-xs bg-slate-50 px-2 py-2 rounded border border-slate-100 group/item hover:border-slate-300">
                                                <div className="flex items-center gap-2 flex-grow min-w-0">
                                                    <span className="font-bold bg-slate-200 text-slate-600 px-1.5 rounded text-[10px]">x{item.quantity}</span>
                                                    <span className="font-medium text-slate-700 truncate">{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {item.expirationDate && (
                                                        <span className="text-[10px] text-orange-600 font-mono bg-orange-50 px-1 rounded border border-orange-100 flex items-center gap-1" title="Scadenza">
                                                            <CalendarIcon className="h-3 w-3" />
                                                            {new Date(item.expirationDate).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' })}
                                                        </span>
                                                    )}
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeItemFromCompartment(comp.id, item.id)}
                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    >
                                                        &times;
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Input Nuovo Materiale (Compact Grid) */}
                                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                                        <div className="grid grid-cols-4 gap-2 mb-2">
                                            <input 
                                                type="text" 
                                                value={newItemInput[comp.id]?.name || ''}
                                                onChange={(e) => handleItemInputChange(comp.id, 'name', e.target.value)}
                                                placeholder="Nome materiale..."
                                                className="col-span-3 bg-white border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-400 font-bold"
                                            />
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={newItemInput[comp.id]?.quantity || '1'}
                                                onChange={(e) => handleItemInputChange(comp.id, 'quantity', e.target.value)}
                                                className="col-span-1 bg-white border border-slate-200 rounded px-1 py-1 text-xs outline-none focus:border-blue-400 text-center font-mono"
                                                placeholder="Qt"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="date"
                                                value={newItemInput[comp.id]?.expirationDate || ''}
                                                onChange={(e) => handleItemInputChange(comp.id, 'expirationDate', e.target.value)}
                                                className="flex-grow bg-white border border-slate-200 rounded px-2 py-1 text-[10px] outline-none focus:border-blue-400 text-slate-500"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => addItemToCompartment(comp.id)}
                                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-blue-700 shadow-sm"
                                            >
                                                + Aggiungi
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {(!formData.compartments || formData.compartments.length === 0) && (
                                <div className="col-span-full text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-sm">Nessun vano configurato per questo mezzo.</p>
                                    <button type="button" onClick={addCompartment} className="text-blue-500 text-xs font-bold hover:underline mt-2">Crea il primo vano</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-3 flex gap-4 pt-4">
                        {isEditing && <button type="button" onClick={handleCancel} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">Annulla</button>}
                        <button type="submit" disabled={isProcessingImg} className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-xl font-bold hover:from-red-700 hover:to-red-800 flex items-center justify-center gap-2 shadow-lg shadow-red-200 transition-all transform active:scale-95">
                            <SaveIcon className="h-5 w-5" /> {isEditing ? 'Salva Modifiche' : 'Crea Veicolo'}
                        </button>
                    </div>
                </form>
            </div>

            {/* LISTA VEICOLI ESISTENTI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vehicles.map(v => (
                    <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-slate-100 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg text-slate-500 border-l border-b border-slate-200 z-10">
                            {v.checkDay}
                        </div>
                        
                        <div className="flex gap-4 items-start">
                            <div className="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                                {v.photoUrl ? <img src={v.photoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl">🚒</span>}
                            </div>
                            <div className="flex-grow min-w-0 pt-1">
                                <span className="text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded uppercase tracking-wider">{v.type}</span>
                                <h4 className="font-bold text-slate-800 truncate mt-1 text-lg leading-tight">{v.model}</h4>
                                <p className="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-1 rounded inline-block border border-slate-200">{v.plate}</p>
                            </div>
                        </div>

                        {/* Riepilogo Vani */}
                        <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex gap-2 items-center text-xs text-slate-500">
                            <BoxIcon className="h-4 w-4 text-slate-400" />
                            <span className="font-bold">{v.compartments?.length || 0}</span> Vani configurati
                        </div>

                        {v.notes && <p className="text-[10px] text-slate-400 italic truncate border-t border-slate-100 pt-2">{v.notes}</p>}
                        
                        <div className="flex justify-end gap-2 mt-auto pt-2 border-t border-slate-100">
                            <button onClick={() => handleEdit(v)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-bold text-xs flex items-center gap-1 transition-colors">
                                <EditIcon className="h-3 w-3" /> Modifica
                            </button>
                            <button onClick={() => handleDelete(v.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold text-xs flex items-center gap-1 transition-colors">
                                <TrashIcon className="h-3 w-3" /> Elimina
                            </button>
                        </div>
                    </div>
                ))}
                {vehicles.length === 0 && <p className="col-span-full text-center text-slate-400 italic py-10">Nessun mezzo operativo inserito.</p>}
            </div>
        </div>
    );
};

export default OperationalVehicleManagement;
