
import React, { useState, useMemo } from 'react';
import { Order, Till, TillColors } from '../types';
import { BackArrowIcon, TrashIcon, SaveIcon, EditIcon } from './Icons';

interface AdminViewProps {
    onGoBack: () => void;
    orders: Order[];
    tills: Till[];
    tillColors: TillColors;
    onUpdateTillColors: (colors: TillColors) => Promise<void>;
    onDeleteOrders: (orderIds: string[]) => Promise<void>;
    onUpdateOrder: (order: Order) => Promise<void>;
}

const AdminView: React.FC<AdminViewProps> = ({ 
    onGoBack, 
    orders, 
    tills, 
    tillColors,
    onUpdateTillColors, 
    onDeleteOrders,
    onUpdateOrder 
}) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'movements' | 'settings'>('movements');
    
    // States for Movements
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ total: number, date: string, time: string }>({ total: 0, date: '', time: '' });

    // States for Settings
    const [colors, setColors] = useState<TillColors>(tillColors);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '31.10.75') {
            setIsAuthenticated(true);
        } else {
            alert('Password errata');
            setPassword('');
        }
    };

    // Movement Handlers
    const toggleOrderSelection = (id: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedOrderIds(newSet);
    };

    const toggleAllSelection = () => {
        if (selectedOrderIds.size === orders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(orders.map(o => o.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedOrderIds.size === 0) return;
        if (window.confirm(`Sei sicuro di voler eliminare ${selectedOrderIds.size} movimenti?`)) {
            await onDeleteOrders(Array.from(selectedOrderIds));
            setSelectedOrderIds(new Set());
        }
    };

    const startEditOrder = (order: Order) => {
        const dateObj = new Date(order.timestamp);
        setEditingOrderId(order.id);
        setEditForm({
            total: order.total,
            date: dateObj.toISOString().split('T')[0],
            time: dateObj.toTimeString().slice(0, 5)
        });
    };

    const saveEditOrder = async () => {
        if (!editingOrderId) return;
        const originalOrder = orders.find(o => o.id === editingOrderId);
        if (!originalOrder) return;

        const newTimestamp = new Date(`${editForm.date}T${editForm.time}`).toISOString();
        
        await onUpdateOrder({
            ...originalOrder,
            total: editForm.total,
            timestamp: newTimestamp
        });
        setEditingOrderId(null);
    };

    // Settings Handlers
    const handleColorChange = (tillId: string, color: string) => {
        setColors(prev => ({ ...prev, [tillId]: color }));
    };

    const saveSettings = async () => {
        await onUpdateTillColors(colors);
        alert('Impostazioni salvate!');
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold mb-6 text-slate-800">Area Riservata</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Inserisci Password" 
                            className="w-full p-4 border border-slate-200 rounded-xl text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                        />
                        <div className="flex gap-2">
                             <button type="button" onClick={onGoBack} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Annulla</button>
                             <button type="submit" className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark">Accedi</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <button onClick={onGoBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <BackArrowIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl font-bold">Amministrazione</h1>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('movements')} 
                        className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'movements' ? 'bg-white text-slate-800' : 'text-slate-400 hover:text-white'}`}
                    >
                        Movimenti
                    </button>
                    <button 
                         onClick={() => setActiveTab('settings')} 
                         className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'settings' ? 'bg-white text-slate-800' : 'text-slate-400 hover:text-white'}`}
                    >
                        Impostazioni Casse
                    </button>
                </div>
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'movements' && (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="font-bold text-lg text-slate-700">Gestione Movimenti ({orders.length})</h2>
                            {selectedOrderIds.size > 0 && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                    Elimina ({selectedOrderIds.size})
                                </button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-slate-600 text-sm">
                                <thead className="bg-slate-100 text-slate-800 uppercase text-xs">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <input type="checkbox" checked={selectedOrderIds.size === orders.length && orders.length > 0} onChange={toggleAllSelection} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                                        </th>
                                        <th className="p-4">Data/Ora</th>
                                        <th className="p-4">Cassa</th>
                                        <th className="p-4">Utente</th>
                                        <th className="p-4 text-right">Totale</th>
                                        <th className="p-4 text-center">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.map(order => (
                                        <tr key={order.id} className={`hover:bg-slate-50 ${selectedOrderIds.has(order.id) ? 'bg-orange-50' : ''}`}>
                                            <td className="p-4">
                                                <input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={() => toggleOrderSelection(order.id)} className="w-4 h-4 rounded text-primary focus:ring-primary" />
                                            </td>
                                            <td className="p-4">
                                                {editingOrderId === order.id ? (
                                                    <div className="flex flex-col gap-1">
                                                        <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="border rounded px-2 py-1 text-xs" />
                                                        <input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} className="border rounded px-2 py-1 text-xs" />
                                                    </div>
                                                ) : (
                                                    <span>{new Date(order.timestamp).toLocaleString('it-IT')}</span>
                                                )}
                                            </td>
                                            <td className="p-4"><span className="font-mono bg-slate-100 px-2 py-1 rounded">{order.tillId}</span></td>
                                            <td className="p-4">{order.staffName}</td>
                                            <td className="p-4 text-right font-bold">
                                                 {editingOrderId === order.id ? (
                                                     <input type="number" step="0.01" value={editForm.total} onChange={e => setEditForm({...editForm, total: parseFloat(e.target.value)})} className="border rounded px-2 py-1 text-right w-24" />
                                                 ) : (
                                                     `€${order.total.toFixed(2)}`
                                                 )}
                                            </td>
                                            <td className="p-4 flex justify-center gap-2">
                                                {editingOrderId === order.id ? (
                                                    <>
                                                        <button onClick={saveEditOrder} className="text-green-600 hover:bg-green-100 p-2 rounded-full"><SaveIcon className="h-4 w-4" /></button>
                                                        <button onClick={() => setEditingOrderId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full">✕</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => startEditOrder(order)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full"><EditIcon className="h-4 w-4" /></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Personalizza Colori Casse</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {tills.map(till => (
                                    <div key={till.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: colors[till.id] || '#f97316' }}>
                                                {till.shift.toUpperCase()}
                                            </div>
                                            <span className="font-bold text-slate-700">{till.name}</span>
                                        </div>
                                        <input 
                                            type="color" 
                                            value={colors[till.id] || '#f97316'} 
                                            onChange={(e) => handleColorChange(till.id, e.target.value)}
                                            className="h-10 w-20 cursor-pointer rounded border border-slate-300"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button 
                                    onClick={saveSettings}
                                    className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                                >
                                    <SaveIcon className="h-5 w-5" />
                                    Salva Impostazioni
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminView;
