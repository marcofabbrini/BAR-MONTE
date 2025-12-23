
import React, { useState, useEffect } from 'react';
import { StaffMember, Shift } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, CheckIcon } from './Icons';

interface StaffManagementProps {
    staff: StaffMember[];
    onAddStaff: (staffData: Omit<StaffMember, 'id'>) => Promise<void>;
    onUpdateStaff: (staffMember: StaffMember) => Promise<void>;
    onDeleteStaff: (staffId: string) => Promise<void>;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ staff, onAddStaff, onUpdateStaff, onDeleteStaff }) => {
    const [name, setName] = useState('');
    const [grade, setGrade] = useState('');
    const [shift, setShift] = useState<Shift>('a');
    const [rcSubGroup, setRcSubGroup] = useState<number>(1); // 1-8
    const [icon, setIcon] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    
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
            }
        } else {
            setName('');
            setGrade('');
            setShift('a');
            setRcSubGroup(1);
            setIcon('');
        }
    }, [isEditing, staff]);

    const toggleFilter = (s: Shift) => {
        const newFilters = new Set(filterShifts);
        if (newFilters.has(s)) newFilters.delete(s);
        else newFilters.add(s);
        setFilterShifts(newFilters);
    };

    const filteredStaff = staff.filter(m => filterShifts.has(m.shift));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
            if (isEditing) {
                const memberToUpdate = staff.find(m => m.id === isEditing);
                if (memberToUpdate) await onUpdateStaff({ ...memberToUpdate, name: name.trim(), grade: grade.trim(), shift, rcSubGroup, icon });
            } else {
                await onAddStaff({ name: name.trim(), grade: grade.trim(), shift, rcSubGroup, icon });
            }
            handleCancel();
        } catch (error) { console.error(error); alert("Errore nel salvataggio."); }
    };
    
    const handleEdit = (member: StaffMember) => { setIsEditing(member.id); };
    const handleCancel = () => { setIsEditing(null); setName(''); setGrade(''); setShift('a'); setRcSubGroup(1); setIcon(''); };
    const handleDeleteStaff = async (id: string) => { if (window.confirm('Eliminare membro?')) await onDeleteStaff(id); };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Form Aggiunta */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-slate-200 print:hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">{isEditing ? 'Modifica Personale' : 'Aggiungi Personale'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="col-span-1 md:col-span-1">
                        <label className="text-sm font-medium text-slate-600">Icona</label>
                         <input type="text" placeholder="😀" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full mt-1 bg-slate-100 rounded-md px-2 py-2 text-center text-xl" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                         <label className="text-sm font-medium text-slate-600">Grado</label>
                        <input type="text" placeholder="Es. VESC" value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full mt-1 bg-slate-100 rounded-md px-3 py-2 uppercase font-bold" />
                    </div>
                    <div className="col-span-1 md:col-span-4">
                         <label className="text-sm font-medium text-slate-600">Cognome e Nome</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 bg-slate-100 rounded-md px-4 py-2" required />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="text-sm font-medium text-slate-600">Turno</label>
                        <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="w-full mt-1 bg-slate-100 rounded-md px-3 py-2 font-bold">
                            <option value="a">A</option>
                            <option value="b">B</option>
                            <option value="c">C</option>
                            <option value="d">D</option>
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                        <label className="text-sm font-medium text-slate-600">Salto (1-8)</label>
                        <select value={rcSubGroup} onChange={(e) => setRcSubGroup(parseInt(e.target.value))} className="w-full mt-1 bg-purple-50 text-purple-700 font-bold border border-purple-200 rounded-md px-4 py-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                <option key={num} value={num}>Gruppo {num}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-12 flex gap-2 mt-2">
                        <button type="submit" className="flex-grow bg-secondary hover:bg-secondary-dark text-white font-bold py-3 px-6 rounded-md flex items-center justify-center gap-2 transition-colors">
                           {isEditing ? <SaveIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />} {isEditing ? 'Salva Modifiche' : 'Aggiungi Membro'}
                        </button>
                        {isEditing && <button type="button" onClick={handleCancel} className="flex-grow bg-slate-500 text-white font-bold py-3 px-6 rounded-md hover:bg-slate-600 transition-colors">Annulla</button>}
                    </div>
                </form>
            </div>

            {/* Filtri */}
            <div className="mb-6 flex gap-4 items-center flex-wrap">
                <span className="font-bold text-slate-600">Filtra per turno:</span>
                {(['a', 'b', 'c', 'd'] as Shift[]).map(s => (
                    <button 
                        key={s} 
                        onClick={() => toggleFilter(s)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${filterShifts.has(s) ? 'bg-orange-50 border-orange-200 text-orange-700 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${filterShifts.has(s) ? 'bg-orange-500 border-orange-500' : 'bg-white border-slate-300'}`}>
                            {filterShifts.has(s) && <CheckIcon className="h-3 w-3 text-white" />}
                        </div>
                        Turno {s.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Lista */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Elenco Personale ({filteredStaff.length})</h2>
                {filteredStaff.length === 0 ? <p className="text-slate-500">Nessun membro trovato.</p> : (
                    <ul className="space-y-3">
                        {filteredStaff.map(member => (
                            <li key={member.id} className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-3 rounded-md border border-slate-200 gap-3">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm border border-slate-200 flex-shrink-0">{member.icon || member.name.charAt(0)}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {member.grade && <span className="bg-slate-200 text-slate-600 text-xs font-black px-1.5 py-0.5 rounded uppercase">{member.grade}</span>}
                                            <p className="font-bold text-slate-800 text-lg">{member.name}</p>
                                        </div>
                                        <div className="flex gap-2 items-center text-sm mt-1">
                                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                                                Turno: <span className="font-bold text-primary">{member.shift.toUpperCase()}</span>
                                            </span>
                                            <span className="bg-purple-100 px-2 py-0.5 rounded border border-purple-200 text-purple-700 font-bold text-xs flex items-center gap-1">
                                                Salto: {member.rcSubGroup || 1}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 print:hidden w-full sm:w-auto justify-end">
                                     <button onClick={() => handleEdit(member)} className="w-9 h-9 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 transition-colors"><EditIcon className="h-5 w-5" /></button>
                                    <button onClick={() => handleDeleteStaff(member.id)} className="w-9 h-9 flex items-center justify-center rounded-full text-red-600 hover:bg-red-100 transition-colors"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default StaffManagement;
