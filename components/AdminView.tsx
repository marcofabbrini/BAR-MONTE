import React, { useState, useMemo } from 'react';
import { Order, Till, TillColors, Product, StaffMember, CashMovement, AdminUser, Shift, TombolaConfig, SeasonalityConfig } from '../types';
import { User } from 'firebase/auth';
import { BackArrowIcon, TrashIcon, SaveIcon, EditIcon, ListIcon, BoxIcon, StaffIcon, CashIcon, SettingsIcon, StarIcon, GoogleIcon, UserPlusIcon, TicketIcon, SparklesIcon } from './Icons';
import ProductManagement from './ProductManagement';
import StaffManagement from './StaffManagement';
import StockControl from './StockControl';
import CashManagement from './CashManagement';
import GamesHub from './GamesHub';

interface AdminViewProps {
    onGoBack: () => void;
    orders: Order[];
    tills: Till[];
    tillColors: TillColors;
    products: Product[];
    staff: StaffMember[];
    cashMovements: CashMovement[];
    onUpdateTillColors: (colors: TillColors) => Promise<void>;
    onDeleteOrders: (orderIds: string[], adminEmail: string) => Promise<void>;
    onPermanentDeleteOrder: (orderId: string) => Promise<void>;
    onUpdateOrder: (order: Order) => Promise<void>;
    onAddProduct: (p: Omit<Product, 'id'>) => Promise<void>;
    onUpdateProduct: (p: Product) => Promise<void>;
    onDeleteProduct: (id: string) => Promise<void>;
    onAddStaff: (s: Omit<StaffMember, 'id'>) => Promise<void>;
    onUpdateStaff: (s: StaffMember) => Promise<void>;
    onDeleteStaff: (id: string) => Promise<void>;
    onAddCashMovement: (m: Omit<CashMovement, 'id'>) => Promise<void>;
    onUpdateMovement: (m: CashMovement) => Promise<void>;
    onDeleteMovement: (id: string, email: string) => Promise<void>;
    onStockPurchase: (productId: string, quantity: number, unitCost: number) => Promise<void>;
    onStockCorrection: (productId: string, newStock: number) => Promise<void>;
    onResetCash: () => Promise<void>;
    onMassDelete: (date: string, type: 'orders' | 'movements') => Promise<void>;
    
    isAuthenticated: boolean;
    currentUser: User | null;
    onLogin: () => void;
    onLogout: () => void;
    adminList: AdminUser[];
    onAddAdmin: (email: string) => Promise<void>;
    onRemoveAdmin: (id: string) => Promise<void>;

    tombolaConfig?: TombolaConfig;
    onUpdateTombolaConfig: (cfg: Partial<TombolaConfig>) => Promise<void>;
    onNavigateToTombola: () => void;

    seasonalityConfig?: SeasonalityConfig;
    onUpdateSeasonality: (cfg: SeasonalityConfig) => Promise<void>;
}

type AdminTab = 'movements' | 'stock' | 'products' | 'staff' | 'cash' | 'settings' | 'admins' | 'extra';

const AdminView: React.FC<AdminViewProps> = ({ 
    onGoBack, orders, tills, tillColors, products, staff, cashMovements,
    onUpdateTillColors, onDeleteOrders, onPermanentDeleteOrder, onUpdateOrder,
    onAddProduct, onUpdateProduct, onDeleteProduct,
    onAddStaff, onUpdateStaff, onDeleteStaff,
    onAddCashMovement, onUpdateMovement, onDeleteMovement, onStockPurchase, onStockCorrection, onResetCash, onMassDelete,
    isAuthenticated, currentUser, onLogin, onLogout, adminList, onAddAdmin, onRemoveAdmin,
    tombolaConfig, onUpdateTombolaConfig, onNavigateToTombola,
    seasonalityConfig, onUpdateSeasonality
}) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('movements');
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ total: number, date: string, time: string }>({ total: 0, date: '', time: '' });
    const [movFilterDate, setMovFilterDate] = useState('');
    const [movFilterShift, setMovFilterShift] = useState<Shift | 'all'>('all');
    const [massDeleteDate, setMassDeleteDate] = useState('');
    const [colors, setColors] = useState<TillColors>(tillColors);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    
    // Config Tombola State
    const [tombolaPriceSingle, setTombolaPriceSingle] = useState(tombolaConfig?.ticketPriceSingle || 1);
    const [tombolaPriceBundle, setTombolaPriceBundle] = useState(tombolaConfig?.ticketPriceBundle || 5);
    const [tombolaMaxTickets, setTombolaMaxTickets] = useState(tombolaConfig?.maxTickets || 168);
    const [tombolaMinStart, setTombolaMinStart] = useState(tombolaConfig?.minTicketsToStart || 84);

    // Seasonality State
    const [seasonStart, setSeasonStart] = useState(seasonalityConfig?.startDate || '');
    const [seasonEnd, setSeasonEnd] = useState(seasonalityConfig?.endDate || '');
    const [seasonTheme, setSeasonTheme] = useState(seasonalityConfig?.theme || 'none');

    const sortedAdmins = useMemo(() => [...adminList].sort((a,b) => a.timestamp.localeCompare(b.timestamp)), [adminList]);
    const isSuperAdmin = currentUser && sortedAdmins.length > 0 && currentUser.email === sortedAdmins[0].email;

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            if (movFilterDate) {
                const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
                if (orderDate !== movFilterDate) return false;
            }
            if (movFilterShift !== 'all') {
                const staffMember = staff.find(s => s.id === o.staffId);
                if (!staffMember || staffMember.shift !== movFilterShift) return false;
            }
            return true;
        });
    }, [orders, movFilterDate, movFilterShift, staff]);

    const globalActiveOrders = useMemo(() => orders.filter(o => !o.isDeleted), [orders]);
    const totalRevenue = globalActiveOrders.reduce((sum, o) => sum + o.total, 0) || 0;
    
    const activeCashMovements = useMemo(() => cashMovements.filter(m => !m.isDeleted), [cashMovements]);
    const barMovements = activeCashMovements.filter(m => m.category === 'bar' || !m.category);
    
    const totalWithdrawals = barMovements.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0) || 0;
    const totalDeposits = barMovements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0) || 0;
    const currentBalance = totalRevenue + totalDeposits - totalWithdrawals;

    const toggleOrderSelection = (id: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedOrderIds(newSet);
    };

    const toggleAllSelection = () => {
        if (selectedOrderIds.size === filteredOrders.length) setSelectedOrderIds(new Set());
        else setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    };

    const handleBulkDelete = async () => {
        if (selectedOrderIds.size === 0) return;
        if (window.confirm(`Sei sicuro di voler annullare ${selectedOrderIds.size} movimenti?`)) {
            await onDeleteOrders(Array.from(selectedOrderIds), currentUser?.email || 'Admin');
            setSelectedOrderIds(new Set());
        }
    };
    
    const handleSingleDelete = async (orderId: string) => { if (window.confirm("Sei sicuro di voler annullare questo movimento?")) await onDeleteOrders([orderId], currentUser?.email || 'Admin'); };
    const handlePermanentDelete = async (orderId: string) => { if (window.confirm("ELIMINAZIONE DEFINITIVA. Procedere?")) await onPermanentDeleteOrder(orderId); };

    const startEditOrder = (order: Order) => {
        const dateObj = new Date(order.timestamp);
        setEditingOrderId(order.id);
        setEditForm({ total: order.total, date: dateObj.toISOString().split('T')[0], time: dateObj.toTimeString().slice(0, 5) });
    };

    const saveEditOrder = async () => {
        if (!editingOrderId) return;
        const originalOrder = orders.find(o => o.id === editingOrderId);
        if (!originalOrder) return;
        const newTimestamp = new Date(`${editForm.date}T${editForm.time}`).toISOString();
        await onUpdateOrder({ ...originalOrder, total: editForm.total, timestamp: newTimestamp });
        setEditingOrderId(null);
    };

    const handleColorChange = (tillId: string, color: string) => setColors(prev => ({ ...prev, [tillId]: color }));
    const saveSettings = async () => { await onUpdateTillColors(colors); alert('Impostazioni salvate!'); };
    const handleAddAdminSubmit = async (e: React.FormEvent) => { e.preventDefault(); if(!newAdminEmail.trim()) return; await onAddAdmin(newAdminEmail.trim()); setNewAdminEmail(''); };
    const handleMassDelete = async (type: 'orders' | 'movements') => { if (!massDeleteDate) return alert("Seleziona data."); if (window.confirm(`ATTENZIONE: Eliminazione DEFINITIVA antecedenti a ${massDeleteDate}. Confermi?`)) await onMassDelete(massDeleteDate, type); };
    
    const handleUpdateTombolaConfig = async () => { 
        await onUpdateTombolaConfig({ 
            ticketPriceSingle: Number(tombolaPriceSingle),
            ticketPriceBundle: Number(tombolaPriceBundle),
            maxTickets: Number(tombolaMaxTickets),
            minTicketsToStart: Number(tombolaMinStart)
        }); 
        alert("Configurazione Tombola aggiornata!"); 
    };
    
    const handleSaveSeasonality = async () => {
        await onUpdateSeasonality({ startDate: seasonStart, endDate: seasonEnd, theme: seasonTheme as any });
        alert("Stagionalità salvata!");
    };

    const TabButton = ({ tab, label, icon }: { tab: AdminTab, label: string, icon: React.ReactNode }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all w-16 h-14 md:w-20 md:h-16 text-[9px] md:text-[10px] font-bold gap-1 ${activeTab === tab ? 'bg-red-500 text-white shadow-md scale-105' : 'bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 border border-slate-100'}`}>
            <div className={`${activeTab === tab ? 'text-white' : 'text-current'} transform scale-75 md:scale-90`}>{icon}</div>
            <span className="text-center leading-tight">{label}</span>
        </button>
    );

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
                    <h2 className="text-2xl font-bold mb-6 text-slate-800">Area Amministrativa</h2>
                    <div className="flex gap-2">
                         <button type="button" onClick={onGoBack} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Indietro</button>
                         <button type="button" onClick={onLogin} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"><GoogleIcon className="h-5 w-5" /> Accedi con Google</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200 p-3 sticky top-0 z-50">
                <div className="flex flex-col gap-3 max-w-7xl mx-auto w-full">
                    <div className="flex items-center justify-between w-full">
                         <button onClick={onGoBack} className="flex items-center text-slate-500 hover:text-slate-800 font-bold gap-1 text-sm"><BackArrowIcon className="h-4 w-4" /> Esci</button>
                        <div className="bg-slate-800 text-white px-4 py-1.5 rounded-full shadow-lg flex flex-col items-center">
                            <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Saldo Cassa</span>
                            <span className="text-lg font-black leading-none">€{(currentBalance || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-right"><p className="text-[9px] text-slate-400 uppercase font-bold">{isSuperAdmin ? 'Super Admin' : 'Admin'}</p><button onClick={onLogout} className="text-[10px] text-red-500 font-bold hover:underline">LOGOUT</button></div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 w-full">
                        <TabButton tab="movements" label="Movimenti" icon={<ListIcon className="h-6 w-6" />} />
                        <TabButton tab="stock" label="Stock" icon={<BoxIcon className="h-6 w-6" />} />
                        <TabButton tab="products" label="Prodotti" icon={<StarIcon className="h-6 w-6" />} />
                        <TabButton tab="staff" label="Staff" icon={<StaffIcon className="h-6 w-6" />} />
                        <TabButton tab="cash" label="Cassa" icon={<CashIcon className="h-6 w-6" />} />
                        <TabButton tab="settings" label="Config" icon={<SettingsIcon className="h-6 w-6" />} />
                        <TabButton tab="admins" label="Admin" icon={<UserPlusIcon className="h-6 w-6" />} />
                        <TabButton tab="extra" label="Extra" icon={<SparklesIcon className="h-6 w-6" />} />
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full">
                {activeTab === 'movements' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <div className="flex flex-wrap gap-4 items-end justify-between">
                                <h2 className="font-bold text-lg text-slate-700">Gestione Movimenti</h2>
                                <div className="flex gap-2 items-center">
                                    <div><label className="text-[9px] uppercase font-bold text-slate-400 block">Data</label><input type="date" value={movFilterDate} onChange={e => setMovFilterDate(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white" /></div>
                                    <div><label className="text-[9px] uppercase font-bold text-slate-400 block">Turno</label><select value={movFilterShift} onChange={e => setMovFilterShift(e.target.value as any)} className="border rounded px-2 py-1 text-sm bg-white"><option value="all">Tutti</option><option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option></select></div>
                                </div>
                            </div>
                            {selectedOrderIds.size > 0 && <button onClick={handleBulkDelete} className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"><TrashIcon className="h-4 w-4" /> Annulla ({selectedOrderIds.size})</button>}
                        </div>
                        <div className="overflow-x-auto max-h-[60vh]">
                            <table className="w-full text-left text-slate-600 text-sm">
                                <thead className="bg-slate-100 text-slate-800 uppercase text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 w-8"><input type="checkbox" checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleAllSelection} className="rounded text-red-500 focus:ring-red-500" /></th>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Info</th>
                                        <th className="p-3 text-right">Totale</th>
                                        <th className="p-3 text-center">Stato</th>
                                        <th className="p-3 text-center">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredOrders.map(order => (
                                        <tr key={order.id} className={`hover:bg-slate-50 ${order.isDeleted ? 'bg-red-50' : ''}`}>
                                            <td className="p-3"><input type="checkbox" checked={selectedOrderIds.has(order.id)} onChange={() => toggleOrderSelection(order.id)} className="rounded text-red-500 focus:ring-red-500" /></td>
                                            <td className="p-3 whitespace-nowrap text-xs">
                                                {editingOrderId === order.id ? (<div className="flex flex-col gap-1"><input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="border rounded px-1" /><input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} className="border rounded px-1" /></div>) : new Date(order.timestamp).toLocaleString('it-IT')}
                                                {order.deletedBy && <div className="text-[9px] text-red-500 italic mt-1">Del: {order.deletedBy}</div>}
                                            </td>
                                            <td className="p-3"><div className={`text-xs font-bold ${order.isDeleted ? 'text-red-800 line-through' : 'text-slate-700'}`}>{order.staffName}</div><div className="text-[10px] text-slate-400 uppercase">Cassa {order.tillId}</div></td>
                                            <td className="p-3 text-right font-bold text-slate-800">{editingOrderId === order.id ? <input type="number" step="0.01" value={editForm.total} onChange={e => setEditForm({...editForm, total: parseFloat(e.target.value)})} className="border rounded px-1 w-20 text-right" /> : <span className={order.isDeleted ? 'line-through opacity-50' : ''}>€{order.total.toFixed(2)}</span>}</td>
                                            <td className="p-3 text-center">{order.isDeleted ? <span className="text-red-500 font-bold text-[10px] uppercase border border-red-200 bg-red-100 px-1 rounded">ANNULLATO</span> : <span className="text-green-500 font-bold text-[10px] uppercase">OK</span>}</td>
                                            <td className="p-3 flex justify-center gap-2">
                                                {editingOrderId === order.id ? <button onClick={saveEditOrder}><SaveIcon className="h-5 w-5 text-green-600" /></button> : <>
                                                    {!order.isDeleted && <button onClick={() => startEditOrder(order)}><EditIcon className="h-4 w-4 text-blue-400" /></button>}
                                                    {!order.isDeleted && <button onClick={() => handleSingleDelete(order.id)}><TrashIcon className="h-4 w-4 text-red-500" /></button>}
                                                    {order.isDeleted && isSuperAdmin && <button onClick={() => handlePermanentDelete(order.id)} title="Elimina Definitivamente"><TrashIcon className="h-4 w-4 text-slate-800" /></button>}
                                                </>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                
                {activeTab === 'stock' && <StockControl products={products} onStockPurchase={onStockPurchase} onStockCorrection={onStockCorrection} />}
                {activeTab === 'products' && <ProductManagement products={products} onAddProduct={onAddProduct} onUpdateProduct={onUpdateProduct} onDeleteProduct={onDeleteProduct} />}
                {activeTab === 'staff' && <StaffManagement staff={staff} onAddStaff={onAddStaff} onUpdateStaff={onUpdateStaff} onDeleteStaff={onDeleteStaff} />}
                {activeTab === 'cash' && <CashManagement orders={orders} movements={cashMovements} onAddMovement={onAddCashMovement} onUpdateMovement={onUpdateMovement} onDeleteMovement={onDeleteMovement} onResetCash={onResetCash} isSuperAdmin={isSuperAdmin} currentUser={currentUser} />}
                {activeTab === 'extra' && <GamesHub onPlayTombola={onNavigateToTombola} tombolaConfig={tombolaConfig} />}
                
                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Colori Casse</h2>
                            <div className="grid grid-cols-2 gap-4">
                                {tills.map(till => (
                                    <div key={till.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                                        <span className="font-bold text-sm">Turno {till.shift.toUpperCase()}</span>
                                        <input type="color" value={colors[till.id] || '#f97316'} onChange={(e) => handleColorChange(till.id, e.target.value)} className="h-8 w-12 cursor-pointer" />
                                    </div>
                                ))}
                            </div>
                            <button onClick={saveSettings} className="mt-4 w-full bg-slate-800 text-white font-bold py-2 rounded-lg">Salva Colori</button>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                            <h2 className="text-lg font-bold text-blue-800 mb-4">Stagionalità & Temi</h2>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><label className="text-xs font-bold text-blue-600">Inizio</label><input type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} className="w-full border p-2 rounded" /></div>
                                <div><label className="text-xs font-bold text-blue-600">Fine</label><input type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} className="w-full border p-2 rounded" /></div>
                            </div>
                            <div className="mb-4">
                                <label className="text-xs font-bold text-blue-600">Tema Attivo</label>
                                <select value={seasonTheme} onChange={e => setSeasonTheme(e.target.value as any)} className="w-full border p-2 rounded">
                                    <option value="none">Nessuno</option>
                                    <option value="christmas">Natale (Neve + Logo)</option>
                                    <option value="easter">Pasqua</option>
                                    <option value="summer">Estate</option>
                                </select>
                            </div>
                            <button onClick={handleSaveSeasonality} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 w-full">Salva Stagionalità</button>
                        </div>

                        {isSuperAdmin && (
                            <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                                <h2 className="text-lg font-bold text-red-800 mb-4">Zona Pericolo (Super Admin)</h2>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-grow"><label className="text-xs font-bold text-red-400 uppercase">Data Limite</label><input type="date" value={massDeleteDate} onChange={e => setMassDeleteDate(e.target.value)} className="w-full border border-red-200 rounded p-2 text-sm" /></div>
                                    <button onClick={() => handleMassDelete('orders')} className="bg-red-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-red-700">Elimina Ordini</button>
                                    <button onClick={() => handleMassDelete('movements')} className="bg-red-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-red-700">Elimina Movim.</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'admins' && (
                     <div className="max-w-2xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Nuovo Admin</h2>
                            <form onSubmit={handleAddAdminSubmit} className="flex gap-2">
                                <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="email@gmail.com" className="flex-grow border rounded-lg p-2 bg-slate-50" required />
                                <button type="submit" className="bg-green-500 text-white font-bold px-4 rounded-lg">Aggiungi</button>
                            </form>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 p-4 bg-slate-50 border-b">Lista Amministratori</h3>
                            <ul>
                                {sortedAdmins.map((admin, idx) => (
                                    <li key={admin.id} className="p-4 flex justify-between items-center border-b last:border-0">
                                        <div><p className="font-bold text-slate-700">{admin.email} {idx === 0 && <span className="text-red-500 text-xs ml-2">(SUPER)</span>}</p></div>
                                        {isSuperAdmin && idx !== 0 && (<button onClick={() => onRemoveAdmin(admin.id)} className="text-red-500 hover:bg-red-50 p-2 rounded text-xs font-bold">Rimuovi</button>)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {/* CONFIGURAZIONE TOMBOLA POTENZIATA (PREZZI + LIMITI) */}
                        {isSuperAdmin && tombolaConfig && (
                            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                                <h2 className="text-lg font-bold text-indigo-800 mb-4">Configurazione Tombola</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-indigo-600 uppercase">Prezzo Singola (€)</label><input type="number" step="0.5" value={tombolaPrice} onChange={e => setTombolaPrice(Number(e.target.value))} className="w-full border border-indigo-200 rounded p-2" /></div>
                                    <div><label className="text-xs font-bold text-indigo-600 uppercase">Prezzo Pack 6 (€)</label><input type="number" step="0.5" value={tombolaPriceBundle} onChange={e => setTombolaPriceBundle(Number(e.target.value))} className="w-full border border-indigo-200 rounded p-2" /></div>
                                    <div><label className="text-xs font-bold text-indigo-600 uppercase">Max Cartelle Totali</label><input type="number" value={tombolaMaxTickets} onChange={e => setTombolaMaxTickets(Number(e.target.value))} className="w-full border border-indigo-200 rounded p-2" /></div>
                                    <div><label className="text-xs font-bold text-indigo-600 uppercase">Minimo per Avvio</label><input type="number" value={tombolaMinStart} onChange={e => setTombolaMinStart(Number(e.target.value))} className="w-full border border-indigo-200 rounded p-2" /></div>
                                </div>
                                <button onClick={handleUpdateTombolaConfig} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 mt-4 w-full">Salva Configurazione Tombola</button>
                            </div>
                        )}
                     </div>
                )}
            </main>
        </div>
    );
};

export default AdminView;