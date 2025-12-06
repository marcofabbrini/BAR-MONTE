
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
    const [shift, setShift] = useState<Shift>('a');
    const [icon, setIcon] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    
    // Filtri
    const [filterShifts, setFilterShifts] = useState<Set<Shift>>(new Set(['a', 'b', 'c', 'd']));

    useEffect(() => {
        if (isEditing) {
            const memberToEdit = staff.find(member => member.id === isEditing);
            if (memberToEdit) {
                setName(memberToEdit.name);
                setShift(memberToEdit.shift);
                setIcon(memberToEdit.icon || '');
            }
        } else {
            setName('');
            setShift('a');
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
                if (memberToUpdate) await onUpdateStaff({ ...memberToUpdate, name: name.trim(), shift, icon });
            } else {
                await onAddStaff({ name: name.trim(), shift, icon });
            }
            handleCancel();
        } catch (error) { console.error(error); alert("Errore nel salvataggio."); }
    };
    
    const handleEdit = (member: StaffMember) => { setIsEditing(member.id); };
    const handleCancel = () => { setIsEditing(null); setName(''); setShift('a'); setIcon(''); };
    const handleDeleteStaff = async (id: string) => { if (window.confirm('Eliminare membro?')) await onDeleteStaff(id); };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Form Aggiunta */}
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-slate-200 print:hidden">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">{isEditing ? 'Modifica Personale' : 'Aggiungi Personale'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-24">
                        <label className="text-sm font-medium text-slate-600">Icona</label>
                         <input type="text" placeholder="😀" value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full mt-1 bg-slate-100 rounded-md px-4 py-2 text-center text-xl" />
                    </div>
                    <div className="flex-grow w-full">
                         <label className="text-sm font-medium text-slate-600">Nome e Cognome</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 bg-slate-100 rounded-md px-4 py-2" required />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="text-sm font-medium text-slate-600">Turno</label>
                        <select value={shift} onChange={(e) => setShift(e.target.value as Shift)} className="w-full mt-1 bg-slate-100 rounded-md px-4 py-2">
                            <option value="a">Turno A</option>
                            <option value="b">Turno B</option>
                            <option value="c">Turno C</option>
                            <option value="d">Turno D</option>
                        </select>
                    </div>
                    <div className="w-full md:w-auto flex gap-2">
                        <button type="submit" className="flex-grow bg-secondary hover:bg-secondary-dark text-white font-bold py-2 px-6 rounded-md flex items-center justify-center gap-2">
                           {isEditing ? <SaveIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />} {isEditing ? 'Salva' : 'Aggiungi'}
                        </button>
                        {isEditing && <button type="button" onClick={handleCancel} className="flex-grow bg-slate-500 text-white font-bold py-2 px-6 rounded-md">Annulla</button>}
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
                            <li key={member.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-xl shadow-sm border border-orange-100">{member.icon || member.name.charAt(0)}</div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{member.name}</p>
                                        <p className="text-sm text-slate-600">Turno: <span className="font-bold text-primary">{member.shift.toUpperCase()}</span></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 print:hidden">
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
