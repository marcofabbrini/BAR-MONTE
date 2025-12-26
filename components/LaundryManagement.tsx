
import React, { useState } from 'react';
import { LaundryItemDef } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, ShirtIcon } from './Icons';

interface LaundryManagementProps {
    items: LaundryItemDef[];
    onAddItem: (item: Omit<LaundryItemDef, 'id'>) => Promise<void>;
    onUpdateItem: (item: LaundryItemDef) => Promise<void>;
    onDeleteItem: (id: string) => Promise<void>;
}

const LaundryManagement: React.FC<LaundryManagementProps> = ({ items, onAddItem, onUpdateItem, onDeleteItem }) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [name, setName] = useState('');

    const handleEdit = (item: LaundryItemDef) => {
        setIsEditing(item.id);
        setName(item.name);
    };

    const handleCancel = () => {
        setIsEditing(null);
        setName('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!name.trim()) return;

        try {
            if (isEditing) {
                await onUpdateItem({ id: isEditing, name: name.trim() });
            } else {
                await onAddItem({ name: name.trim() });
            }
            handleCancel();
        } catch (e) {
            console.error(e);
            alert("Errore salvataggio capo.");
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Vuoi eliminare questo capo dalla lista?")) {
            await onDeleteItem(id);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ShirtIcon className="h-6 w-6 text-blue-600" />
                    {isEditing ? 'Modifica Capo' : 'Aggiungi Nuovo Capo'}
                </h3>
                
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Es. Divisa Estiva" 
                        className="flex-grow border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200" 
                        required
                        autoFocus={!!isEditing}
                    />
                    <button 
                        type="submit" 
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                    >
                        <SaveIcon className="h-5 w-5" /> {isEditing ? 'Salva' : 'Aggiungi'}
                    </button>
                    {isEditing && (
                        <button 
                            type="button" 
                            onClick={handleCancel}
                            className="bg-slate-200 text-slate-600 px-4 py-3 rounded-lg font-bold hover:bg-slate-300"
                        >
                            Annulla
                        </button>
                    )}
                </form>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                    <h3 className="font-bold text-slate-700">Elenco Capi Lavanderia</h3>
                </div>
                <ul className="divide-y divide-slate-100">
                    {items.map(item => (
                        <li key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                            <span className="font-medium text-slate-800">{item.name}</span>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                    <EditIcon className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </li>
                    ))}
                    {items.length === 0 && (
                        <li className="p-8 text-center text-slate-400 italic">
                            Nessun capo inserito. Aggiungine uno sopra.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default LaundryManagement;
