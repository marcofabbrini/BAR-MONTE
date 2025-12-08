
import React, { useState, useMemo, useEffect } from 'react';
import { Order, Till, TillColors, Product, StaffMember, CashMovement, AdminUser, Shift, TombolaConfig, SeasonalityConfig, ShiftSettings, AttendanceRecord } from '../types';
import { User } from 'firebase/auth';
import { BackArrowIcon, TrashIcon, SaveIcon, EditIcon, ListIcon, BoxIcon, StaffIcon, CashIcon, SettingsIcon, StarIcon, GoogleIcon, UserPlusIcon, GamepadIcon, BanknoteIcon, CalendarIcon, SparklesIcon, ClipboardIcon } from './Icons';
import ProductManagement from './ProductManagement';
import StaffManagement from './StaffManagement';
import StockControl from './StockControl';
import CashManagement from './CashManagement';
import GamesHub from './GamesHub';
import AttendanceCalendar from './AttendanceCalendar';

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
    onPermanentDeleteMovement: (id: string) => Promise<void>;
    onStockPurchase: (productId: string, quantity: number, unitCost: number) => Promise<void>;
    onStockCorrection: (productId: string, newStock: number) => Promise<void>;
    onResetCash: (type: 'bar' | 'games') => Promise<void>;
    onMassDelete: (date: string, type: 'orders' | 'movements') => Promise<void>;
    
    isAuthenticated: boolean;
    currentUser: User | null;
    onLogin: () => void;
    onLogout: () => void;
    adminList: AdminUser[];
    onAddAdmin: (email: string) => Promise<void>;
    onRemoveAdmin: (id: string) => Promise<void>;

    tombolaConfig?: TombolaConfig;
    onNavigateToTombola: () => void;

    seasonalityConfig?: SeasonalityConfig;
    onUpdateSeasonality: (cfg: SeasonalityConfig) => Promise<void>;

    shiftSettings: ShiftSettings;
    onUpdateShiftSettings: (cfg: ShiftSettings) => Promise<void>;
    
    attendanceRecords: AttendanceRecord[];
}

type AdminTab = 'movements' | 'stock' | 'products' | 'staff' | 'cash' | 'settings' | 'admins' | 'attendance';

const AdminView: React.FC<AdminViewProps> = ({ 
    onGoBack, orders, tills, tillColors, products, staff, cashMovements,
    onUpdateTillColors, onDeleteOrders, onPermanentDeleteOrder, onUpdateOrder,
    onAddProduct, onUpdateProduct, onDeleteProduct,
    onAddStaff, onUpdateStaff, onDeleteStaff,
    onAddCashMovement, onUpdateMovement, onDeleteMovement, onPermanentDeleteMovement,
    onStockPurchase, onStockCorrection, onResetCash, onMassDelete,
    isAuthenticated, currentUser, onLogin, onLogout, adminList, onAddAdmin, onRemoveAdmin,
    tombolaConfig, onNavigateToTombola,
    seasonalityConfig, onUpdateSeasonality,
    shiftSettings, onUpdateShiftSettings,
    attendanceRecords
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

    // Seasonality State
    const [seasonStart, setSeasonStart] = useState(seasonalityConfig?.startDate || '');
    const [seasonEnd, setSeasonEnd] = useState(seasonalityConfig?.endDate || '');
    const [seasonPreset, setSeasonPreset] = useState(seasonalityConfig?.preset || 'custom');
    const [seasonAnim, setSeasonAnim] = useState<'snow'|'rain'|'float'|'none'>(seasonalityConfig?.animationType || 'none');
    const [seasonEmojis, setSeasonEmojis] = useState(seasonalityConfig?.emojis?.join(', ') || '');
    const [seasonOpacity, setSeasonOpacity] = useState(seasonalityConfig?.opacity || 0.5);
    const [seasonBg, setSeasonBg] = useState(seasonalityConfig?.backgroundColor || '#f8fafc');

    // Shift Calibration State
    const [calibDate, setCalibDate] = useState(shiftSettings.anchorDate || new Date().toISOString().split('T')[0]);
    const [calibShift, setCalibShift] = useState<Shift>(shiftSettings.anchorShift || 'a');

    // RC Calibration State
    const [rcDate, setRcDate] = useState(shiftSettings.rcAnchorDate || '');
    const [rcShift, setRcShift] = useState<Shift>(shiftSettings.rcAnchorShift || 'a');
    const [rcSubGroup, setRcSubGroup] = useState<number>(shiftSettings.rcAnchorSubGroup || 1);

    const sortedAdmins = useMemo(() => [...adminList].sort((a,b) => a.timestamp.localeCompare(b.timestamp)), [adminList]);
    const isSuperAdmin = currentUser && sortedAdmins.length > 0 && currentUser.email === sortedAdmins[0].email;

    // Gestione Preset Stagionali
    useEffect(() => {
        if (seasonPreset === 'christmas') {
            setSeasonAnim('snow');
            setSeasonEmojis('❄️, 🎅, 🎄, 🎁, ⛄, 🦌, 🍪');
            setSeasonBg('#f0f9ff'); // Light Blue
            setSeasonOpacity(0.8);
        } else if (seasonPreset === 'easter') {
            setSeasonAnim('float');
            setSeasonEmojis('🐰, 🥚, 🐣, 🌷, 🍫, 🍬');
            setSeasonBg('#fff7ed'); // Orange 50
            setSeasonOpacity(0.7);
        } else if (seasonPreset === 'summer') {
            setSeasonAnim('float');
            setSeasonEmojis('☀️, 🏖️, 🍦, 🍉, 🕶️, 🍹, 🌴');
            setSeasonBg('#fefce8'); // Yellow 50
            setSeasonOpacity(0.6);
        } else if (seasonPreset === 'halloween') {
            setSeasonAnim('float');
            setSeasonEmojis('🎃, 👻, 🕷️, 🍬, 🦇');
            setSeasonBg('#fef2f2'); // Red 50/Darkish
            setSeasonOpacity(0.8);
        }
    }, [seasonPreset]);

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
    
    const handleSaveSeasonality = async () => {
        const emojiArray = seasonEmojis.split(',').map(s => s.trim()).filter(s => s !== '');
        await onUpdateSeasonality({ 
            startDate: seasonStart, 
            endDate: seasonEnd, 
            preset: seasonPreset as any,
            animationType: seasonAnim,
            emojis: emojiArray,
            opacity: seasonOpacity,
            backgroundColor: seasonBg
        });
        alert("Stagionalità salvata con successo!");
    };

    const handleSaveShiftCalibration = async () => {
        await onUpdateShiftSettings({
            ...shiftSettings, // mantieni RC
            anchorDate: calibDate,
            anchorShift: calibShift
        });
        alert("Turnario calibrato! Tutti i calcoli futuri partiranno da questa data.");
    };

    const handleSaveRcCalibration = async () => {
        await onUpdateShiftSettings({
            ...shiftSettings,
            rcAnchorDate: rcDate,
            rcAnchorShift: rcShift,
            rcAnchorSubGroup: rcSubGroup
        });
        alert("Riposo Compensativo (Salto) salvato!");
    };

    const TabButton = ({ tab, label, icon }: { tab: AdminTab, label: string, icon: React.ReactNode }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all w-20 h-16 text-[9px] md:text-[10px] font-bold gap-1 ${activeTab === tab ? 'bg-red-500 text-white shadow-md scale-105' : 'bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 border border-slate-100'}`}>
            <div className={`${activeTab === tab ? 'text-white' : 'text-current'} transform scale-90`}>{icon}</div>
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
                    
                    {/* MENU ADMIN SU DUE RIGHE */}
                    <div className="flex flex-col gap-2 w-full">
                        {/* RIGA 1: OPERATIVITÀ */}
                        <div className="flex flex-wrap justify-center gap-2 border-b border-slate-100 pb-2">
                            <TabButton tab="movements" label="Movimenti" icon={<ListIcon className="h-6 w-6" />} />
                            <TabButton tab="cash" label="Cassa" icon={<BanknoteIcon className="h-6 w-6" />} />
                            <TabButton tab="stock" label="Stock" icon={<BoxIcon className="h-6 w-6" />} />
                            <TabButton tab="products" label="Prodotti" icon={<StarIcon className="h-6 w-6" />} />
                        </div>
                        {/* RIGA 2: GESTIONE */}
                        <div className="flex flex-wrap justify-center gap-2">
                            <TabButton tab="admins" label="Admin" icon={<UserPlusIcon className="h-6 w-6" />} />
                            <TabButton tab="staff" label="Staff" icon={<StaffIcon className="h-6 w-6" />} />
                            <TabButton tab="settings" label="Config" icon={<SettingsIcon className="h-6 w-6" />} />
                            <TabButton tab="attendance" label="Presenze" icon={<ClipboardIcon className="h-6 w-6" />} />
                        </div>
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
                {activeTab === 'cash' && <CashManagement orders={orders} movements={cashMovements} onAddMovement={onAddCashMovement} onUpdateMovement={onUpdateMovement} onDeleteMovement={onDeleteMovement} onPermanentDeleteMovement={onPermanentDeleteMovement} onResetCash={onResetCash} isSuperAdmin={isSuperAdmin} currentUser={currentUser} />}
                {activeTab === 'attendance' && <AttendanceCalendar attendanceRecords={attendanceRecords} staff={staff} tillColors={tillColors} />}
                
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

                        {/* CALIBRAZIONE TURNARIO (VERDE) */}
                        <div className="bg-green-50 p-6 rounded-xl border border-green-100 relative overflow-hidden">
                            <h2 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" /> Calibrazione Turnario
                            </h2>
                            <p className="text-xs text-slate-500 mb-4">
                                Se il turnario non è sincronizzato correttamente, imposta qui la data di riferimento.
                                Scegli una data e il turno che era attivo in quel giorno. Il sistema ricalcolerà tutto automaticamente.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-green-700 block mb-1">Data Riferimento</label>
                                    <input type="date" value={calibDate} onChange={e => setCalibDate(e.target.value)} className="w-full border p-2 rounded" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-green-700 block mb-1">Turno attivo in questa data</label>
                                    <select value={calibShift} onChange={e => setCalibShift(e.target.value as Shift)} className="w-full border p-2 rounded bg-white">
                                        <option value="a">Turno A</option>
                                        <option value="b">Turno B</option>
                                        <option value="c">Turno C</option>
                                        <option value="d">Turno D</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleSaveShiftCalibration} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 w-full mt-4 shadow-sm">
                                Salva e Calibra Turnario
                            </button>
                        </div>

                        {/* CONFIGURAZIONE RIPOSO COMPENSATIVO (VIOLA) */}
                        <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 relative overflow-hidden">
                            <h2 className="text-lg font-bold text-purple-800 mb-4 flex items-center gap-2">
                                <CalendarIcon className="h-5 w-5" /> Configurazione Salto Turno (RC)
                            </h2>
                            <p className="text-xs text-slate-500 mb-4">
                                Configura la rotazione dei salti (sottogruppi 1-8). Indica una data passata o futura dove conosci il gruppo esatto che era a riposo.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-purple-700 block mb-1">Data Riferimento</label>
                                    <input type="date" value={rcDate} onChange={e => setRcDate(e.target.value)} className="w-full border p-2 rounded" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-purple-700 block mb-1">Turno in Servizio</label>
                                    <select value={rcShift} onChange={e => setRcShift(e.target.value as Shift)} className="w-full border p-2 rounded bg-white">
                                        <option value="a">Turno A</option>
                                        <option value="b">Turno B</option>
                                        <option value="c">Turno C</option>
                                        <option value="d">Turno D</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-purple-700 block mb-1">Gruppo a Riposo (1-8)</label>
                                    <select value={rcSubGroup} onChange={e => setRcSubGroup(parseInt(e.target.value))} className="w-full border p-2 rounded bg-white">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                            <option key={n} value={n}>Gruppo {n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleSaveRcCalibration} className="bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 w-full mt-4 shadow-sm">
                                Salva Configurazione Salto
                            </button>
                        </div>

                        {/* CONFIGURAZIONE STAGIONALITÀ AVANZATA (BLU) */}
                        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 relative overflow-hidden">
                            <h2 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5" /> Configurazione Stagionale
                            </h2>
                            
                            {/* Griglia Date e Preset */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div><label className="text-xs font-bold text-blue-600 block mb-1">Inizio Evento</label><input type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} className="w-full border p-2 rounded" /></div>
                                <div><label className="text-xs font-bold text-blue-600 block mb-1">Fine Evento</label><input type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} className="w-full border p-2 rounded" /></div>
                                <div>
                                    <label className="text-xs font-bold text-blue-600 block mb-1">Preset Rapido</label>
                                    <select value={seasonPreset} onChange={e => setSeasonPreset(e.target.value as any)} className="w-full border p-2 rounded bg-white">
                                        <option value="custom">Personalizzato</option>
                                        <option value="christmas">Natale</option>
                                        <option value="easter">Pasqua</option>
                                        <option value="summer">Estate</option>
                                        <option value="halloween">Halloween</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dettagli Animazione */}
                            <div className="bg-white/50 rounded-lg p-4 border border-blue-200 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-blue-600 block mb-1">Emoji (separate da virgola)</label>
                                    <input type="text" value={seasonEmojis} onChange={e => setSeasonEmojis(e.target.value)} placeholder="Es. ❄️, ⛄, 🎄" className="w-full border p-2 rounded" />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-blue-600 block mb-1">Animazione</label>
                                        <select value={seasonAnim} onChange={e => setSeasonAnim(e.target.value as any)} className="w-full border p-2 rounded bg-white">
                                            <option value="none">Nessuna</option>
                                            <option value="snow">Neve (Lenta + Oscillazione)</option>
                                            <option value="rain">Pioggia (Veloce)</option>
                                            <option value="float">Volo (Casuale)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-blue-600 block mb-1">Opacità Emoji ({seasonOpacity})</label>
                                        <input type="range" min="0.1" max="1" step="0.1" value={seasonOpacity} onChange={e => setSeasonOpacity(parseFloat(e.target.value))} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-blue-600 block mb-1">Colore Sfondo</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={seasonBg} onChange={e => setSeasonBg(e.target.value)} className="h-9 w-12 cursor-pointer border rounded" />
                                            <span className="text-xs text-slate-500 font-mono">{seasonBg}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleSaveSeasonality} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 w-full mt-4 shadow-sm">
                                Salva Configurazioni Stagionali
                            </button>
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
                     </div>
                )}
            </main>
        </div>
    );
};

export default AdminView;
