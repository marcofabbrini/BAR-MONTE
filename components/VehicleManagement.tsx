
import React, { useState, useRef } from 'react';
import { Vehicle, CheckDay } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, TruckIcon, ListIcon } from './Icons';

interface VehicleManagementProps {
    vehicles: Vehicle[];
    onAddVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>;
    onUpdateVehicle: (v: Vehicle) => Promise<void>;
    onDeleteVehicle: (id: string) => Promise<void>;
}

const emptyVehicle: Omit<Vehicle, 'id'> = {
    plate: '',
    model: '',
    fuelType: 'diesel',
    checkDay: 'Lunedì',
    photoUrl: '',
    customChecklist: []
};

const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicles, onAddVehicle, onUpdateVehicle, onDeleteVehicle }) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Vehicle, 'id'>>(emptyVehicle);
    const [isProcessingImg, setIsProcessingImg] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // State per nuova voce checklist
    const [newCheckItem, setNewCheckItem] = useState('');

    const checkDays: CheckDay[] = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    const handleEdit = (v: Vehicle) => {
        setIsEditing(v.id);
        const { id, ...data } = v;
        // Ensure checklist array exists
        if (!data.customChecklist) data.customChecklist = [];
        setFormData(data);
    };

    const handleCancel = () => {
        setIsEditing(null);
        setFormData(emptyVehicle);
        setNewCheckItem('');
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Eliminare questo veicolo?")) {
            await onDeleteVehicle(id);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Checklist logic
    const handleAddCheckItem = () => {
        if (!newCheckItem.trim()) return;
        setFormData(prev => ({
            ...prev,
            customChecklist: [...(prev.customChecklist || []), newCheckItem.trim()]
        }));
        setNewCheckItem('');
    };

    const handleRemoveCheckItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            customChecklist: (prev.customChecklist || []).filter((_, i) => i !== index)
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
            alert("Errore salvataggio veicolo.");
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
                    const MAX_WIDTH = 300; 
                    const MAX_HEIGHT = 300;
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
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <TruckIcon className="h-6 w-6 text-red-600" />
                    {isEditing ? 'Modifica Veicolo' : 'Nuovo Veicolo'}
                </h3>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center md:row-span-3">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer hover:bg-slate-100 overflow-hidden relative"
                        >
                            {formData.photoUrl ? (
                                <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl text-slate-300">📷</span>
                            )}
                            {isProcessingImg && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-b-2 border-slate-500 rounded-full"></div></div>}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        <span className="text-xs text-slate-400 mt-2">Clicca per foto</span>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Targa</label>
                            <input name="plate" value={formData.plate} onChange={handleChange} placeholder="VF 12345" className="w-full border p-2 rounded font-mono font-bold" required />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500">Modello</label>
                            <input name="model" value={formData.model} onChange={handleChange} placeholder="Fiat Punto" className="w-full border p-2 rounded" required />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Alimentazione</label>
                                <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="w-full border p-2 rounded">
                                    <option value="diesel">Diesel</option>
                                    <option value="benzina">Benzina</option>
                                    <option value="elettrica">Elettrica</option>
                                    <option value="ibrida">Ibrida</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500">Giorno Controllo</label>
                                <select name="checkDay" value={formData.checkDay || 'Lunedì'} onChange={handleChange} className="w-full border p-2 rounded">
                                    {checkDays.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* CHECKLIST SECTION */}
                    <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2 flex items-center gap-1">
                            <ListIcon className="h-4 w-4"/> Lista Controlli Rapidi (es. Livelli, Gomme)
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                value={newCheckItem} 
                                onChange={(e) => setNewCheckItem(e.target.value)} 
                                placeholder="Nuovo controllo (es. Olio Motore)" 
                                className="flex-grow border rounded p-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddCheckItem(); }}}
                            />
                            <button type="button" onClick={handleAddCheckItem} className="bg-green-500 text-white px-4 rounded font-bold hover:bg-green-600">+</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(formData.customChecklist || []).map((item, index) => (
                                <span key={index} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-slate-200">
                                    {item}
                                    <button type="button" onClick={() => handleRemoveCheckItem(index)} className="text-red-400 hover:text-red-600 font-black">&times;</button>
                                </span>
                            ))}
                            {(formData.customChecklist || []).length === 0 && <span className="text-xs text-slate-400 italic">Nessun controllo inserito.</span>}
                        </div>
                    </div>

                    <div className="md:col-span-2 flex gap-2 pt-2">
                        {isEditing && <button type="button" onClick={handleCancel} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded font-bold">Annulla</button>}
                        <button type="submit" disabled={isProcessingImg} className="flex-1 bg-slate-800 text-white py-2 rounded font-bold hover:bg-slate-700 flex items-center justify-center gap-2">
                            <SaveIcon className="h-4 w-4" /> {isEditing ? 'Aggiorna' : 'Salva'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map(v => (
                    <div key={v.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 items-center group relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-slate-100 px-2 py-0.5 rounded-bl-lg text-[9px] font-bold text-slate-500 border-b border-l border-slate-200">
                            {v.checkDay || 'Non pianificato'}
                        </div>
                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                            {v.photoUrl ? <img src={v.photoUrl} className="w-full h-full object-cover" /> : <TruckIcon className="h-8 w-8 text-slate-300" />}
                        </div>
                        <div className="flex-grow min-w-0">
                            <h4 className="font-bold text-slate-800 truncate">{v.model}</h4>
                            <p className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-1 rounded inline-block">{v.plate}</p>
                            <p className="text-[10px] text-slate-400 uppercase mt-1">{v.fuelType}</p>
                            {v.customChecklist && v.customChecklist.length > 0 && (
                                <p className="text-[9px] text-blue-500 font-bold mt-1">{v.customChecklist.length} controlli definiti</p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(v)} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><EditIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(v.id)} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
                {vehicles.length === 0 && <p className="col-span-full text-center text-slate-400 italic">Nessun veicolo presente.</p>}
            </div>
        </div>
    );
};

export default VehicleManagement;
