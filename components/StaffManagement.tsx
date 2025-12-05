import React, { useState, useEffect } from 'react';
import { StaffMember, Shift } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon } from './Icons';

interface StaffManagementProps {
    staff: StaffMember[];
    onAddStaff: (staffData: Omit<StaffMember, 'id'>) => Promise<void>;
    onUpdateStaff: (staffMember: StaffMember) => Promise<void>;
    onDeleteStaff: (staffId: string) => Promise<void>;
}

const StaffManagement: React.FC<StaffManagementProps> = ({ staff, onAddStaff, onUpdateStaff, onDeleteStaff }) => {
    const [name, setName] = useState('');
    const [shift, setShift] = useState<Shift>('a');
    const [isEditing, setIsEditing] = useState<string | null>(null);

    useEffect(() => {
        if (isEditing) {
            const memberToEdit = staff.find(member => member.id === isEditing);
            if (memberToEdit) {
                setName(memberToEdit.name);
                setShift(memberToEdit.shift);
            }
        } else {
            setName('');
            setShift('a');
        }
    }, [isEditing, staff]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        try {
            if (isEditing) {
                const memberToUpdate = staff.find(m => m.id === isEditing);
                if (memberToUpdate) {
                    await onUpdateStaff({ ...memberToUpdate, name: name.trim(), shift });
                }
            } else {
                await onAddStaff({ name: name.trim(), shift });
            }
            handleCancel();
        } catch (error) {
            console.error("Error saving staff member:", error);
            alert("Errore nel salvataggio del membro dello staff.");
        }
    };
    
    const handleEdit = (member: StaffMember) => {
        setIsEditing(member.id);
    };
    
    const handleCancel = () => {
        setIsEditing(null);
        setName('');
        setShift('a');
    };

    const handleDeleteStaff = async (id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo membro del personale?')) {
            try {
                await onDeleteStaff(id);
            } catch (error) {
                console.error("Error deleting staff member:", error);
                alert("Errore nell'eliminazione del membro dello staff.");
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">{isEditing ? 'Modifica Personale' : 'Aggiungi Personale'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-grow w-full">
                         <label htmlFor="staff-name" className="text-sm font-medium text-slate-600">Nome e Cognome</label>
                        <input
                            id="staff-name"
                            type="text"
                            placeholder="Nome e Cognome"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full mt-1 bg-slate-100 text-slate-800 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
                            required
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label htmlFor="staff-shift" className="text-sm font-medium text-slate-600">Turno</label>
                        <select
                            id="staff-shift"
                            value={shift}
                            onChange={(e) => setShift(e.target.value as Shift)}
                            className="w-full mt-1 bg-slate-100 text-slate-800 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-secondary"
                        >
                            <option value="a">Turno A</option>
                            <option value="b">Turno B</option>
                            <option value="c">Turno C</option>
                            <option value="d">Turno D</option>
                        </select>
                    </div>
                    <div className="w-full md:w-auto flex gap-2">
                        <button type="submit" className="flex-grow bg-secondary hover:bg-secondary-dark text-white font-bold py-2 px-6 rounded-md transition-colors duration-200 flex items-center justify-center gap-2">
                           {isEditing ? <SaveIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
                           {isEditing ? 'Salva' : 'Aggiungi'}
                        </button>
                        {isEditing && (
                             <button type="button" onClick={handleCancel} className="flex-grow bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200">
                                Annulla
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Elenco Personale</h2>
                {staff.length === 0 ? (
                    <p className="text-slate-500">Nessun membro del personale inserito.</p>
                ) : (
                    <ul className="space-y-3">
                        {staff.map(member => (
                            <li key={member.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                                <div>
                                    <p className="font-semibold text-slate-800">{member.name}</p>
                                    <p className="text-sm text-slate-600">Turno: {member.shift.toUpperCase()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button onClick={() => handleEdit(member)} className="w-9 h-9 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 transition-colors" aria-label="Modifica">
                                        <EditIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDeleteStaff(member.id)} className="w-9 h-9 flex items-center justify-center rounded-full text-red-600 hover:bg-red-100 transition-colors" aria-label="Elimina">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
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