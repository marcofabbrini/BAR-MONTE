
import React, { useState, useEffect, useRef } from 'react';
import { StaffMember, Shift } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, CheckIcon, StaffIcon, UserPlusIcon } from './Icons';

interface StaffManagementProps {
    staff: StaffMember[];
    onAddStaff: (staffData: Omit<StaffMember, 'id'>) => Promise<void>;
    onUpdateStaff: (staffMember: StaffMember) => Promise<void>;
    onDeleteStaff: (staffId: string) => Promise<void>;
}

// Configurazione Gradi VVF
const VVF_GRADES = [
    { id: 'VIG', label: 'Vigile del Fuoco', short: 'VIG', color: 'bg-red-600 border-red-800' },
    { id: 'VE', label: 'Vigile Esperto', short: 'VE', color: 'bg-red-600 border-red-800' },
    { id: 'VESC', label: 'Vigile Esperto Scatto', short: 'VESC', color: 'bg-red-600 border-red-800' },
    { id: 'VC', label: 'Vigile Coord.', short: 'VC', color: 'bg-red-700 border-red-900' },
    { id: 'VCSC', label: 'Vigile Coord. Scatto', short: 'VCSC', color: 'bg-red-700 border-red-900' },
    { id: 'CS', label: 'Capo Squadra', short: 'CS', color: 'bg-amber-500 border-amber-700' },
    { id: 'CQE', label: 'Capo Squadra Esp.', short: 'CQE', color: 'bg-amber-500 border-amber-700' },
    { id: 'CR', label: 'Capo Reparto', short: 'CR', color: 'bg-slate-400 border-slate-600' },
    { id: 'CRE', label: 'Capo Reparto Esp.', short: 'CRE', color: 'bg-slate-400 border-slate-600' },
];

export const GradeBadge = ({ grade }: { grade?: string }) => {
    if (!grade) return null;
    const conf = VVF_GRADES.find(g => g.id === grade || g.short === grade) || { short: grade, color: 'bg-slate-500 border-slate-700' };
    
    return (
        <div className={`
            absolute -top-1 -right-1 z-10 
            flex items-center justify-center
            min-w-[24px] h-[16px] px-1
            rounded text-[8px] font-black text-white
            border-b-2 shadow-sm
            uppercase tracking-tighter
            ${conf.color}
        `} style={{ fontSize: '0.55rem', lineHeight: 1 }}>
            {conf.short}
        </div>
    );
};

const StaffManagement: React.FC<StaffManagementProps> = ({ staff, onAddStaff, onUpdateStaff, onDeleteStaff }) => {
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [shift, setShift] = useState<Shift>('a');
    const [rcSubGroup, setRcSubGroup] = useState<number>(1);
    const [icon, setIcon] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    
    // File Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filtri
    const [filterShifts, setFilterShifts] = useState<Set<Shift>>(new Set(['a', 'b', 'c', 'd']));

    useEffect(() => {
        if (isEditing) {
            const memberToEdit = staff.find(member => member.id === isEditing);
            if (memberToEdit) {
                setName(memberToEdit.name);
                setGrade(memberToEdit.grade || '');
                setShift(memberToEdit.shift);
                setRcSubGroup(memberToEdit.rcSubGroup || 1);
                setIcon(memberToEdit.icon || '');
                setPhotoUrl(memberToEdit.photoUrl || '');
            }
        } else {
            resetForm();
        }
    }, [isEditing, staff]);

    const resetForm = () => {
        setName('');
        setGrade('');
        setShift('a');
        setRcSubGroup(1);
        setIcon('');
        setPhotoUrl('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const toggleFilter = (s: Shift) => {
        const newFilters = new Set(filterShifts);
        if (newFilters.has(s)) newFilters.delete(s);
        else newFilters.add(s);
        setFilterShifts(newFilters);
    };

    const filteredStaff = staff.filter(m => filterShifts.has(m.shift));

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoUrl(reader.result as string);
                // Se carichi una foto, resetta l'icona emoji per evitare conflitti visivi (opzionale)
                setIcon(''); 
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            const dataToSave = { 
                name: name.trim(), 
                grade: grade.trim(), 
                shift, 
                rcSubGroup, 
                icon,
                photoUrl 
            };

            if (isEditing) {
                const memberToUpdate = staff.find(m => m.id === isEditing);
                if (memberToUpdate) await onUpdateStaff({ ...memberToUpdate, ...dataToSave });
            } else {
                await onAddStaff(dataToSave);
            }
            setIsEditing(null);
            resetForm();
        } catch (error) { 
            console.error(error); 
            alert("Errore nel salvataggio."); 
        }
    };
    
    const handleEdit = (member: StaffMember) => { setIsEditing(member.id); };
    const handleCancel = () => { setIsEditing(null); resetForm(); };
    const handleDeleteStaff = async (id: string) => { if (window.confirm('Eliminare membro?')) await onDeleteStaff(id); };

    return (
        <div className="max-w-5xl mx-auto">
            
            {/* Form Aggiunta/Modifica */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8 border border-slate-200 print:hidden relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    {isEditing ? <EditIcon className="h-6 w-6 text-blue-500"/> : <UserPlusIcon className="h-6 w-6 text-green-500"/>}
                    {isEditing ? 'Modifica Scheda Utente' : 'Nuova Anagrafica VVF'}
                </h2>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* AVATAR UPLOAD SECTION */}
                    <div className="col-span-1 md:col-span-3 flex flex-col items-center gap-3">
                        <div className="relative w-24 h-24 rounded-full border-4 border-slate-100 shadow-inner bg-slate-50 flex items-center justify-center overflow-hidden group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {photoUrl ? (
                                <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl">{icon || '👤'}</span>
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-bold">Carica</span>
                            </div>
                            
                            {/* LIVE PREVIEW BADGE */}
                            {grade && <GradeBadge grade={grade} />}
                        </div>
                        
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        
                        <div className="w-full">
                            <label className="text-[10px] font-bold text-slate-400 uppercase text-center block mb-1">Oppure Emoji</label>
                            <input type="text" placeholder="Es. 👨‍🚒" value={icon} onChange={(e) => { setIcon(e.target.value); if(e.target.value) setPhotoUrl(''); }} className="w-full bg-slate-100 rounded-md px-2 py-1.5 text-center text-lg border-transparent focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all" />
                        </div>
                    </div>

                    {/* FIELDS SECTION */}
                    <div className="col-span-1 md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="text-xs font-bold text-slate-500 uppercase">Cognome e Nome</label>
                             <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Es. Rossi Mario" required />
                        </div>

                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Qualifica / Grado</label>
                             <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">-- Seleziona Grado --</option>
                                {VVF_GRADES.map(g => (
                                    <option key={g.id} value={g.id}>{g.label} ({g.short})</option>
                                ))}
                             </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Turno</label>
                                <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-bold uppercase">
                                    <option value="a">A</option>
                                    <option value="b">B</option>
                                    <option value="c">C</option>
                                    <option value="d">D</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Salto (1-8)</label>
                                <select value={rcSubGroup} onChange={(e) => setRcSubGroup(parseInt(e.target.value))} className="w-full mt-1 bg-purple-50 text-purple-700 font-bold border border-purple-200 rounded-lg px-3 py-2.5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                        <option key={num} value={num}>Gr. {num}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="col-span-2 flex gap-3 mt-4">
                            <button type="submit" className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-95">
                               {isEditing ? <SaveIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />} 
                               {isEditing ? 'Aggiorna Scheda' : 'Salva Personale'}
                            </button>
                            {isEditing && <button type="button" onClick={handleCancel} className="bg-slate-200 text-slate-600 font-bold py-3 px-6 rounded-lg hover:bg-slate-300 transition-colors">Annulla</button>}
                        </div>
                    </div>
                </form>
            </div>

            {/* Filtri */}
            <div className="mb-6 flex gap-3 items-center flex-wrap">
                <span className="text-xs font-bold text-slate-400 uppercase mr-2">Visualizza Turno:</span>
                {(['a', 'b', 'c', 'd'] as Shift[]).map(s => (
                    <button 
                        key={s} 
                        onClick={() => toggleFilter(s)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${filterShifts.has(s) ? 'bg-white border-slate-300 text-slate-800 shadow-sm' : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                        <div className={`w-3 h-3 rounded-full flex items-center justify-center ${filterShifts.has(s) ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        Turno {s.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Lista Griglia */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStaff.length === 0 ? <p className="col-span-full text-center text-slate-400 italic py-10">Nessun personale trovato.</p> : 
                    filteredStaff.map(member => (
                        <div key={member.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 group hover:shadow-md transition-all">
                            
                            {/* AVATAR IN LISTA */}
                            <div className="relative w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-visible">
                                <div className="w-full h-full rounded-full overflow-hidden">
                                    {member.photoUrl ? (
                                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl flex items-center justify-center w-full h-full pb-1">{member.icon || '👤'}</span>
                                    )}
                                </div>
                                {/* Badge Grado */}
                                {member.grade && <GradeBadge grade={member.grade} />}
                            </div>

                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm truncate">{member.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{VVF_GRADES.find(g=>g.id===member.grade)?.label || member.grade || 'Personale'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center mt-2">
                                    <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono">
                                        {member.shift.toUpperCase()}
                                    </span>
                                    <span className="text-[10px] bg-purple-50 border border-purple-100 px-2 py-0.5 rounded text-purple-700 font-bold">
                                        Salto {member.rcSubGroup || 1}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleEdit(member)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><EditIcon className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteStaff(member.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><TrashIcon className="h-4 w-4" /></button>
                            </div>
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

export default StaffManagement;
