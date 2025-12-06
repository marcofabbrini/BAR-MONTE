
import React, { useState, useMemo } from 'react';
import { Order, Till, TillColors, Product, StaffMember, CashMovement, AdminUser } from '../types';
import { User } from 'firebase/auth';
import { BackArrowIcon, TrashIcon, SaveIcon, EditIcon, ListIcon, BoxIcon, StaffIcon, CashIcon, SettingsIcon, StarIcon, GoogleIcon, UserPlusIcon } from './Icons';
import ProductManagement from './ProductManagement';
import StaffManagement from './StaffManagement';
import StockControl from './StockControl';
import CashManagement from './CashManagement';

interface AdminViewProps {
    onGoBack: () => void;
    orders: Order[];
    tills: Till[];
    tillColors: TillColors;
    products: Product[];
    staff: StaffMember[];
    cashMovements: CashMovement[];
    onUpdateTillColors: (colors: TillColors) => Promise<void>;
    onDeleteOrders: (orderIds: string[]) => Promise<void>;
    onUpdateOrder: (order: Order) => Promise<void>;
    onAddProduct: (p: Omit<Product, 'id'>) => Promise<void>;
    onUpdateProduct: (p: Product) => Promise<void>;
    onDeleteProduct: (id: string) => Promise<void>;
    onAddStaff: (s: Omit<StaffMember, 'id'>) => Promise<void>;
    onUpdateStaff: (s: StaffMember) => Promise<void>;
    onDeleteStaff: (id: string) => Promise<void>;
    onAddCashMovement: (m: Omit<CashMovement, 'id'>) => Promise<void>;
    onStockPurchase: (productId: string, quantity: number, unitCost: number) => Promise<void>;
    
    // Auth
    isAuthenticated: boolean;
    currentUser: User | null;
    onLogin: () => void;
    onLogout: () => void;
    adminList: AdminUser[];
    onAddAdmin: (email: string) => Promise<void>;
    onRemoveAdmin: (id: string) => Promise<void>;
}

type AdminTab = 'movements' | 'stock' | 'products' | 'staff' | 'cash' | 'settings' | 'admins';

const AdminView: React.FC<AdminViewProps> = ({ 
    onGoBack, orders, tills, tillColors, products, staff, cashMovements,
    onUpdateTillColors, onDeleteOrders, onUpdateOrder,
    onAddProduct, onUpdateProduct, onDeleteProduct,
    onAddStaff, onUpdateStaff, onDeleteStaff,
    onAddCashMovement, onStockPurchase,
    isAuthenticated, currentUser, onLogin, onLogout, adminList, onAddAdmin, onRemoveAdmin
}) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('movements');
    
    // States for Movements
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ total: number, date: string, time: string }>({ total: 0, date: '', time: '' });

    // States for Settings
    const [colors, setColors] = useState<TillColors>(tillColors);
    
    // States for Admin Mgmt
    const [newAdminEmail, setNewAdminEmail] = useState('');

    const activeOrders = useMemo(() => orders.filter(o => !o.isDeleted), [orders]);
    const totalActiveRevenue = useMemo(() => activeOrders.reduce((sum, o) => sum + o.total, 0), [activeOrders]);

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
        if (window.confirm(`Sei sicuro di voler annullare ${selectedOrderIds.size} movimenti?`)) {
            await onDeleteOrders(Array.from(selectedOrderIds));
            setSelectedOrderIds(new Set());
        }
    };
    
    const handleSingleDelete = async (orderId: string) => {
        if (window.confirm("Sei sicuro di voler annullare questo movimento?")) {
            await onDeleteOrders([orderId]);
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
        await onUpdateOrder({ ...originalOrder, total: editForm.total, timestamp: newTimestamp });
        setEditingOrderId(null);
    };

    const handleColorChange = (tillId: string, color: string) => {
        setColors(prev => ({ ...prev, [tillId]: color }));
    };

    const saveSettings = async () => {
        await onUpdateTillColors(colors);
        alert('Impostazioni salvate!');
    };
    
    const handleAddAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!newAdminEmail.trim()) return;
        await onAddAdmin(newAdminEmail.trim());
        setNewAdminEmail('');
    };

    const TabButton = ({ tab, label, icon }: { tab: AdminTab, label: string, icon: React.ReactNode }) => (
        <button 
            onClick={() => setActiveTab(tab)} 
            className={`
                flex flex-col items-center justify-center p-2 rounded-xl transition-all w-24 h-20 text-xs font-bold gap-1
                ${activeTab === tab 
                    ? 'bg-white text-slate-800 shadow-lg scale-105' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-105'
                }
            `}
        >
            <div className={`${activeTab === tab ? 'text-primary' : 'text-current'}`}>
                {icon}
            </div>
            <span className="text-center leading-tight">{label}</span>
        </button>
    );

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold mb-6 text-slate-800">Area Riservata</h2>
                    <p className="text-slate-500 mb-6">Accedi per gestire il sistema</p>
                    
                    {currentUser ? (
                         <div className="mb-4 text-red-500 bg-red-50 p-3 rounded">
                             <p>Accesso negato. L'utente <b>{currentUser.email}</b> non è un amministratore.</p>
                             <button onClick={onLogout} className="block w-full mt-2 text-sm text-slate-400 underline">Logout</button>
                         </div>
                    ) : null}

                    <div className="flex gap-2">
                         <button type="button" onClick={onGoBack} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Indietro</button>
                         <button type="button" onClick={onLogin} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm">
                            <GoogleIcon className="h-5 w-5" /> Accedi con Google
                         </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-slate-800 text-white p-4 shadow-lg sticky top-0 z-50">
                <div className="flex flex-col items-center gap-4 max-w-7xl mx-auto w-full">
                    <div className="flex items-center justify-between w-full">
                         <div className="flex items-center gap-3">
                            <button onClick={onGoBack} className="p-2 hover:bg-slate-700 rounded-full transition-colors"><BackArrowIcon className="h-6 w-6" /></button>
                            <h1 className="text-xl font-bold">Amministrazione</h1>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="text-right hidden md:block">
                                 <p className="text-xs text-slate-400 uppercase">Admin</p>
                                 <p className="text-sm font-bold">{currentUser?.email}</p>
                             </div>
                             <button onClick={onLogout} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full">Esci</button>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-2 w-full">
                        <TabButton tab="movements" label="Movimenti" icon={<ListIcon className="h-6 w-6" />} />
                        <TabButton tab="stock" label="Acquisto Mag." icon={<BoxIcon className="h-6 w-6" />} />
                        <TabButton tab="products" label="Prodotti" icon={<StarIcon className="h-6 w-6" />} />
                        <TabButton tab="staff" label="Personale" icon={<StaffIcon className="h-6 w-6" />} />
                        <TabButton tab="cash" label="Cassa" icon={<CashIcon className="h-6 w-6" />} />
                        <TabButton tab="settings" label="Config" icon={<SettingsIcon className="h-6 w-6" />} />
                        <TabButton tab="admins" label="Gestione Admin" icon={<UserPlusIcon className="h-6 w-6" />} />
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
                {activeTab === 'movements' && (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="font-bold text-lg text-slate-700">Gestione Movimenti</h2>
                                <p className="text-xs text-slate-500">Totale Attivo: <span className="font-bold text-green-600">€{totalActiveRevenue.toFixed(2)}</span></p>
                            </div>
                            {selectedOrderIds.size > 0 && (
                                <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><TrashIcon className="h-4 w-4" /> Annulla ({selectedOrderIds.size})</button>
                            )}
                        </div>
                        <div className="overflow-x-auto max-h-[70vh]">
                            <table className="w-full text-left text-slate-600 text-sm">
                                <thead className="bg-slate-100 text-slate-800 uppercase text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 w-10"><input type="checkbox" checked={selectedOrderIds.size === orders.length && orders.length > 0} onChange={toggleAllSelection} className="w-4 h-4 rounded text-primary focus:ring-primary" /></th>
                                        <th className="p-4">Data/Ora</th>
                                        <th className="p-4">Cassa</th>
                                        <th className="p-4">Utente</th>
                                        <th className="p-4 text-right">Totale</th>
                                        <th className="p-4 text-center">Stato</th>
                                        <th className="p-4 text-center">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.map(order => (
                                        <tr key={order.id} className={`hover:bg-slate-50 ${selectedOrderIds.has(order.id) ? 'bg-orange-50' : ''} ${order.isDeleted ? 'bg-red-50 text-red-800' : ''}`}>
                                            <td className="p-4"><input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={() => toggleOrderSelection(order.id)} className="w-4 h-4 rounded text-primary focus:ring-primary" /></td>
                                            <td className={`p-4 ${order.isDeleted ? 'line-through opacity-50' : ''}`}>
                                                {editingOrderId === order.id ? (
                                                    <div className="flex flex-col gap-1"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="border rounded px-2 py-1 text-xs" /><input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} className="border rounded px-2 py-1 text-xs" /></div>
                                                ) : <span>{new Date(order.timestamp).toLocaleString('it-IT')}</span>}
                                            </td>
                                            <td className={`p-4 ${order.isDeleted ? 'opacity-50' : ''}`}><span className="font-mono bg-slate-100 px-2 py-1 rounded">{order.tillId}</span></td>
                                            <td className={`p-4 ${order.isDeleted ? 'opacity-50' : ''}`}>{order.staffName}</td>
                                            <td className={`p-4 text-right font-bold ${order.isDeleted ? 'line-through opacity-50' : ''}`}>
                                                 {editingOrderId === order.id ? <input type="number" step="0.01" value={editForm.total} onChange={e => setEditForm({...editForm, total: parseFloat(e.target.value)})} className="border rounded px-2 py-1 text-right w-24" /> : `€${order.total.toFixed(2)}`}
                                            </td>
                                            <td className="p-4 text-center">
                                                {order.isDeleted ? <span className="bg-red-200 text-red-800 text-[10px] px-2 py-1 rounded-full font-bold uppercase">Annullato</span> : <span className="bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase">Valido</span>}
                                            </td>
                                            <td className="p-4 flex justify-center gap-2">
                                                {editingOrderId === order.id ? (
                                                    <>
                                                        <button onClick={saveEditOrder} className="text-green-600 hover:bg-green-100 p-2 rounded-full"><SaveIcon className="h-4 w-4" /></button>
                                                        <button onClick={() => setEditingOrderId(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full">✕</button>
                                                    </>
                                                ) : (
                                                    !order.isDeleted && (
                                                        <>
                                                            <button onClick={() => startEditOrder(order)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-full" title="Modifica"><EditIcon className="h-4 w-4" /></button>
                                                            <button onClick={() => handleSingleDelete(order.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full" title="Annulla Movimento"><TrashIcon className="h-4 w-4" /></button>
                                                        </>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'stock' && <StockControl products={products} onStockPurchase={onStockPurchase} />}
                {activeTab === 'products' && <ProductManagement products={products} onAddProduct={onAddProduct} onUpdateProduct={onUpdateProduct} onDeleteProduct={onDeleteProduct} />}
                {activeTab === 'staff' && <StaffManagement staff={staff} onAddStaff={onAddStaff} onUpdateStaff={onUpdateStaff} onDeleteStaff={onDeleteStaff} />}
                {activeTab === 'cash' && <CashManagement orders={orders} movements={cashMovements} onAddMovement={onAddCashMovement} />}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6">Personalizza Colori Casse</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {tills.map(till => (
                                <div key={till.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: colors[till.id] || '#f97316' }}>{till.shift.toUpperCase()}</div>
                                        <span className="font-bold text-slate-700">{till.name}</span>
                                    </div>
                                    <input type="color" value={colors[till.id] || '#f97316'} onChange={(e) => handleColorChange(till.id, e.target.value)} className="h-10 w-20 cursor-pointer rounded border border-slate-300" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={saveSettings} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2"><SaveIcon className="h-5 w-5" /> Salva Impostazioni</button>
                        </div>
                    </div>
                )}
                {activeTab === 'admins' && (
                     <div className="max-w-3xl mx-auto">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 mb-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">Aggiungi Amministratore</h2>
                            <form onSubmit={handleAddAdminSubmit} className="flex gap-4">
                                <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="email@gmail.com" className="flex-grow border rounded-lg p-3 bg-slate-50" required />
                                <button type="submit" className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2"><UserPlusIcon className="h-5 w-5" /> Aggiungi</button>
                            </form>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                            <h3 className="font-bold text-slate-800 p-4 bg-slate-50 border-b border-slate-200">Amministratori Abilitati</h3>
                            <ul className="divide-y divide-slate-100">
                                {adminList.map(admin => (
                                    <li key={admin.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-700">{admin.email}</p>
                                            <p className="text-xs text-slate-400">Aggiunto da: {admin.addedBy}</p>
                                        </div>
                                        <button onClick={() => onRemoveAdmin(admin.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm font-bold">Rimuovi</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                     </div>
                )}
            </main>
        </div>
    );
};

export default AdminView;
