
import React, { useState, useMemo, useEffect } from 'react';
import { Order, Till, TillColors, Product, StaffMember, CashMovement, AdminUser, Shift, TombolaConfig, SeasonalityConfig, ShiftSettings, AttendanceRecord, GeneralSettings, AttendanceStatus, Vehicle, LaundryItemDef, Reminder } from '../types';
import firebase from 'firebase/compat/app';
import { BackArrowIcon, TrashIcon, SaveIcon, EditIcon, ListIcon, BoxIcon, StaffIcon, CashIcon, SettingsIcon, StarIcon, GoogleIcon, UserPlusIcon, GamepadIcon, BanknoteIcon, CalendarIcon, SparklesIcon, ClipboardIcon, MegaphoneIcon, LockOpenIcon, CheckIcon, LockIcon, FilterIcon, SortIcon, PaletteIcon, BellIcon, LogoIcon, CarIcon, ShirtIcon, FireIcon, WrenchIcon, TruckIcon, PinIcon, ShieldCheckIcon } from './Icons';
import ProductManagement from './ProductManagement';
import StaffManagement from './StaffManagement';
import StockControl from './StockControl';
import CashManagement from './CashManagement';
import GamesHub from './GamesHub';
import ShiftCalendar from './ShiftCalendar';
import VehicleManagement from './VehicleManagement';
import OperationalVehicleManagement from './OperationalVehicleManagement';
import LaundryManagement from './LaundryManagement';
import { useBar } from '../contexts/BarContext';
import { DEFAULT_INTERVENTION_TYPES } from '../constants';

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
    currentUser: firebase.User | null;
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
    onDeleteAttendance: (id: string) => Promise<void>;
    onSaveAttendance?: (tillId: string, presentStaffIds: string[], dateOverride?: string, closedBy?: string, details?: Record<string, AttendanceStatus>, substitutionNames?: Record<string, string>) => Promise<void>;
    onReopenAttendance?: (id: string) => Promise<void>;

    generalSettings?: GeneralSettings;
    onUpdateGeneralSettings?: (cfg: GeneralSettings) => Promise<void>;

    onSendNotification?: (title: string, body: string, target?: string) => Promise<void>;
}

type AdminTab = 'movements' | 'stock' | 'products' | 'staff' | 'cash' | 'settings' | 'admins' | 'calendar' | 'fleet' | 'operational_fleet' | 'laundry' | 'reminders' | 'roles'; 

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
    attendanceRecords, onDeleteAttendance, onSaveAttendance, onReopenAttendance,
    generalSettings, onUpdateGeneralSettings,
    onSendNotification
}) => {
    // Access Context methods
    const { vehicles, addVehicle, updateVehicle, deleteVehicle } = useBar();
    const { operationalVehicles, addOperationalVehicle, updateOperationalVehicle, deleteOperationalVehicle } = useBar();
    const { laundryItems, addLaundryItem, updateLaundryItem, deleteLaundryItem } = useBar();
    const { interventionTypologies, dutyOfficers, addInterventionTypology, deleteInterventionTypology, addDutyOfficer, deleteDutyOfficer } = useBar();
    const { reminders, addReminder, updateReminder, deleteReminder } = useBar();
    const { customRoles, addCustomRole, deleteCustomRole, activeBarUser } = useBar();

    const [activeTab, setActiveTab] = useState<AdminTab>('movements');
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ total: number, date: string, time: string }>({ total: 0, date: '', time: '' });
    const [movFilterDate, setMovFilterDate] = useState('');
    const [movFilterShift, setMovFilterShift] = useState<Shift | 'all'>('all');
    const [massDeleteDate, setMassDeleteDate] = useState('');
    const [colors, setColors] = useState<TillColors>(tillColors);
    const [newAdminEmail, setNewAdminEmail] = useState('');

    // Accordion State
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    // Seasonality State
    const [seasonStart, setSeasonStart] = useState(seasonalityConfig?.startDate || '');
    const [seasonEnd, setSeasonEnd] = useState(seasonalityConfig?.endDate || '');
    const [seasonPreset, setSeasonPreset] = useState(seasonalityConfig?.preset || 'custom');
    const [seasonAnim, setSeasonAnim] = useState<'snow'|'rain'|'float'|'none'>(seasonalityConfig?.animationType || 'none');
    const [seasonEmojis, setSeasonEmojis] = useState(seasonalityConfig?.emojis?.join(', ') || '');
    const [seasonOpacity, setSeasonOpacity] = useState(seasonalityConfig?.opacity || 0.5);
    const [seasonBg, setSeasonBg] = useState(seasonalityConfig?.backgroundColor || '#f8fafc');

    // General Settings State
    const [waterPrice, setWaterPrice] = useState(generalSettings?.waterQuotaPrice || 0);

    // Intervention Config State
    const [newTypology, setNewTypology] = useState('');
    const [newOfficer, setNewOfficer] = useState('');

    // Notification Form
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');

    // Reminder Form State
    const [remText, setRemText] = useState('');
    const [remType, setRemType] = useState<'recurring' | 'spot' | 'monthly'>('recurring');
    const [remDay, setRemDay] = useState<number>(1);
    const [remMonthlyDetail, setRemMonthlyDetail] = useState<'first-day' | 'last-day'>('first-day');
    const [remDate, setRemDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD local
    const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

    // Role Form State
    const [newRoleLabel, setNewRoleLabel] = useState('');
    const [newRoleLevel, setNewRoleLevel] = useState<number>(1);

    const sortedAdmins = useMemo(() => [...adminList].sort((a,b) => a.timestamp.localeCompare(b.timestamp)), [adminList]);
    
    // Super Admin Check: Use local role OR firebase email
    const isSuperAdmin = useMemo(() => {
        if (activeBarUser?.role === 'super-admin') return true;
        if (currentUser && sortedAdmins.length > 0 && currentUser.email === sortedAdmins[0].email) return true;
        return false;
    }, [activeBarUser, currentUser, sortedAdmins]);

    const isLocalSuperAdmin = activeBarUser?.role === 'super-admin';

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

    useEffect(() => {
        if(generalSettings) setWaterPrice(generalSettings.waterQuotaPrice);
    }, [generalSettings]);

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

    // Get current logged user name/email for logging actions
    const currentActionUser = useMemo(() => {
        return currentUser?.email || activeBarUser?.name || 'Admin';
    }, [currentUser, activeBarUser]);

    const handleBulkDelete = async () => {
        if (selectedOrderIds.size === 0) return;
        if (window.confirm(`Sei sicuro di voler annullare ${selectedOrderIds.size} movimenti?`)) {
            await onDeleteOrders(Array.from(selectedOrderIds), currentActionUser);
            setSelectedOrderIds(new Set());
        }
    };
    
    const handleSingleDelete = async (orderId: string) => { if (window.confirm("Sei sicuro di voler annullare questo movimento?")) await onDeleteOrders([orderId], currentActionUser); };
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
    const saveSettings = async () => { await onUpdateTillColors(colors); alert('Impostazioni colori salvate!'); };
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

    const handleSaveGeneral = async () => {
        if(!onUpdateGeneralSettings) return;
        await onUpdateGeneralSettings({
            waterQuotaPrice: waterPrice
        });
        alert("Configurazione generale salvata!");
    };

    const handleSendNotif = async () => {
        if(!onSendNotification || !notifTitle.trim() || !notifBody.trim()) return;
        await onSendNotification(notifTitle, notifBody);
        alert("Notifica Inviata a tutti i dispositivi attivi!");
        setNotifTitle('');
        setNotifBody('');
    };

    const handleAddTypology = async () => {
        if(!newTypology.trim()) return;
        await addInterventionTypology(newTypology.trim());
        setNewTypology('');
    };

    const handleLoadStandardTypologies = async () => {
        if(!confirm("Vuoi caricare la lista standard delle tipologie VVF? Verranno aggiunte solo quelle mancanti.")) return;
        
        let addedCount = 0;
        for (const typeName of DEFAULT_INTERVENTION_TYPES) {
            // Check existence case-insensitive
            const exists = interventionTypologies.some(t => t.name.toLowerCase() === typeName.toLowerCase());
            if (!exists) {
                await addInterventionTypology(typeName);
                addedCount++;
            }
        }
        alert(`Operazione completata. Aggiunte ${addedCount} nuove tipologie.`);
    };

    const handleAddOfficer = async () => {
        if(!newOfficer.trim()) return;
        await addDutyOfficer(newOfficer.trim());
        setNewOfficer('');
    };

    const handleSaveReminder = async () => {
        if (!remText.trim()) return;
        
        if (remType === 'spot' && !remDate) {
            alert("Seleziona una data per il promemoria spot.");
            return;
        }

        try {
            if (editingReminderId) {
                await updateReminder(editingReminderId, {
                    text: remText.trim(),
                    type: remType,
                    dayOfWeek: remType === 'recurring' ? remDay : undefined,
                    monthlyDetail: remType === 'monthly' ? remMonthlyDetail : undefined,
                    date: remType === 'spot' ? remDate : undefined
                });
                alert("Promemoria aggiornato!");
                setEditingReminderId(null);
            } else {
                await addReminder({
                    text: remText.trim(),
                    type: remType,
                    dayOfWeek: remType === 'recurring' ? remDay : undefined,
                    monthlyDetail: remType === 'monthly' ? remMonthlyDetail : undefined,
                    date: remType === 'spot' ? remDate : undefined
                });
                alert("Promemoria aggiunto!");
            }
            
            setRemText('');
            // Reset to today to ensure input is never empty
            setRemDate(new Date().toISOString().split('T')[0]);
        } catch(e) {
            console.error(e);
            alert("Errore salvataggio promemoria");
        }
    };

    const handleEditReminder = (rem: Reminder) => {
        setEditingReminderId(rem.id);
        setRemText(rem.text);
        setRemType(rem.type);
        if (rem.dayOfWeek !== undefined) setRemDay(rem.dayOfWeek);
        if (rem.monthlyDetail) setRemMonthlyDetail(rem.monthlyDetail);
        if (rem.date) setRemDate(rem.date);
        
        window.scrollTo(0,0);
    };

    const handleCancelEditReminder = () => {
        setEditingReminderId(null);
        setRemText('');
        setRemDate(new Date().toISOString().split('T')[0]);
    };

    const handleDeleteReminder = async (id: string) => {
        if (confirm("Eliminare definitivamente questo promemoria?")) {
            await deleteReminder(id);
            if (editingReminderId === id) handleCancelEditReminder();
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    const handleClearLocalCache = () => {
        if (window.confirm("Attenzione: Questa operazione svuota la memoria temporanea del browser (localStorage/sessionStorage) e ricarica la pagina. Utile se riscontri errori di 'Quota Exceeded' o schermata bianca. Procedere?")) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };

    const handleAddRole = async () => {
        if(!newRoleLabel.trim()) return;
        try {
            await addCustomRole({ label: newRoleLabel.trim(), level: newRoleLevel });
            setNewRoleLabel('');
            setNewRoleLevel(1);
            alert("Nuovo ruolo creato!");
        } catch (e) {
            console.error(e);
            alert("Errore creazione ruolo.");
        }
    };

    const handleDeleteRole = async (id: string) => {
        if(confirm("Eliminare questo ruolo personalizzato?")) {
            await deleteCustomRole(id);
        }
    };

    // PULSANTI GRIGLIA ADMIN
    const TabButton = ({ tab, label, icon }: { tab: AdminTab, label: string, icon: React.ReactNode }) => (
        <button 
            onClick={() => setActiveTab(tab)} 
            className={`
                flex flex-col items-center justify-center p-3 rounded-xl transition-all w-full h-24 sm:h-28 text-[10px] sm:text-xs font-bold gap-2 
                ${activeTab === tab 
                    ? 'bg-red-500 text-white shadow-lg scale-[1.02]' 
                    : 'bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 border border-slate-100 hover:shadow-md'
                }
            `}
        >
            <div className={`text-4xl transform transition-transform filter drop-shadow-sm ${activeTab === tab ? 'scale-110' : 'grayscale-0'}`}>
                {icon}
            </div>
            <span className="text-center leading-tight uppercase tracking-tight">{label}</span>
        </button>
    );

    return (
        <div className="min-h-dvh bg-slate-50 flex flex-col font-sans">
            <header className="bg-white border-b border-slate-200 p-3 sticky top-0 z-50 mt-[env(safe-area-inset-top)]">
                <div className="flex flex-col gap-3 max-w-7xl mx-auto w-full">
                    <div className="flex items-center justify-between w-full">
                         <button onClick={onGoBack} className="flex items-center text-slate-500 hover:text-slate-800 font-bold gap-2 text-sm">
                            <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                                <BackArrowIcon className="h-5 w-5" />
                            </div>
                            <span>Indietro</span>
                         </button>
                        <div className="bg-slate-800 text-white px-4 py-1.5 rounded-full shadow-lg flex flex-col items-center">
                            <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Saldo Cassa</span>
                            <span className="text-lg font-black leading-none">€{(currentBalance || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-right"><p className="text-[9px] text-slate-400 uppercase font-bold">{isSuperAdmin || isLocalSuperAdmin ? 'Super Admin' : 'Admin'}</p>
                        {/* Logout visual removed as it's now handled by global app logic */}
                        </div>
                    </div>
                    
                    {/* GRIGLIA NAVIGAZIONE AGGIORNATA */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-12 gap-2 w-full overflow-x-auto">
                        <TabButton tab="movements" label="Movimenti" icon={<ListIcon />} />
                        <TabButton tab="cash" label="Cassa" icon={<BanknoteIcon />} />
                        <TabButton tab="stock" label="Stock" icon={<BoxIcon />} />
                        <TabButton tab="products" label="Prodotti" icon={<LogoIcon />} />
                        <TabButton tab="calendar" label="Turnario" icon={<CalendarIcon />} />
                        <TabButton tab="staff" label="Staff" icon={<StaffIcon />} />
                        <TabButton tab="admins" label="Admin" icon={<LockIcon />} />
                        <TabButton tab="fleet" label="Automezzi" icon={<CarIcon />} />
                        <TabButton tab="operational_fleet" label="Mezzi Op." icon={<TruckIcon />} />
                        <TabButton tab="laundry" label="Lavanderia" icon={<ShirtIcon />} />
                        <TabButton tab="reminders" label="Promemoria" icon={<PinIcon />} />
                        <TabButton tab="settings" label="Config" icon={<SettingsIcon />} />
                        {(isSuperAdmin || isLocalSuperAdmin) && <TabButton tab="roles" label="Ruoli" icon={<ShieldCheckIcon className="h-8 w-8" />} />}
                    </div>
                </div>
            </header>

            <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full pb-20">
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
                {activeTab === 'calendar' && <ShiftCalendar onGoBack={() => {}} tillColors={tillColors} shiftSettings={shiftSettings} />} 
                {activeTab === 'fleet' && <VehicleManagement vehicles={vehicles} onAddVehicle={addVehicle} onUpdateVehicle={updateVehicle} onDeleteVehicle={deleteVehicle} />}
                {activeTab === 'operational_fleet' && <OperationalVehicleManagement vehicles={operationalVehicles} onAddVehicle={addOperationalVehicle} onUpdateVehicle={updateOperationalVehicle} onDeleteVehicle={deleteOperationalVehicle} />}
                {activeTab === 'laundry' && <LaundryManagement items={laundryItems} onAddItem={addLaundryItem} onUpdateItem={updateLaundryItem} onDeleteItem={deleteLaundryItem} />}
                
                {activeTab === 'reminders' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <PinIcon className="h-6 w-6 text-yellow-500" /> {editingReminderId ? 'Modifica Promemoria' : 'Nuovo Promemoria'}
                            </h2>
                            <div className="flex flex-col gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Testo Promemoria" 
                                    value={remText} 
                                    onChange={e => setRemText(e.target.value)} 
                                    className="border rounded p-3 text-sm"
                                />
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={remType === 'recurring'} onChange={() => setRemType('recurring')} className="text-yellow-500" />
                                        <span className="text-sm font-bold">Settimanale</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={remType === 'monthly'} onChange={() => setRemType('monthly')} className="text-yellow-500" />
                                        <span className="text-sm font-bold">Mensile</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={remType === 'spot'} onChange={() => setRemType('spot')} className="text-yellow-500" />
                                        <span className="text-sm font-bold">Spot (Data Singola)</span>
                                    </label>
                                </div>
                                
                                {remType === 'recurring' && (
                                    <select value={remDay} onChange={e => setRemDay(parseInt(e.target.value))} className="border rounded p-2 text-sm bg-white">
                                        {['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'].map((d, i) => (
                                            <option key={i} value={i}>{d}</option>
                                        ))}
                                    </select>
                                )}

                                {remType === 'monthly' && (
                                    <select value={remMonthlyDetail} onChange={e => setRemMonthlyDetail(e.target.value as any)} className="border rounded p-2 text-sm bg-white">
                                        <option value="first-day">Primo giorno del mese (1°)</option>
                                        <option value="last-day">Ultimo giorno del mese</option>
                                    </select>
                                )}

                                {remType === 'spot' && (
                                    <input type="date" value={remDate} onChange={e => setRemDate(e.target.value)} className="border rounded p-2 text-sm" />
                                )}

                                <div className="flex gap-2">
                                    <button onClick={handleSaveReminder} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded shadow-sm">
                                        {editingReminderId ? 'Aggiorna Promemoria' : 'Aggiungi Promemoria'}
                                    </button>
                                    {editingReminderId && (
                                        <button onClick={handleCancelEditReminder} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold rounded">
                                            Annulla
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 p-4 border-b border-slate-200">
                                <h3 className="font-bold text-slate-700">Elenco Promemoria Attivi</h3>
                            </div>
                            <ul className="divide-y divide-slate-100">
                                {reminders.map(rem => (
                                    <li key={rem.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                        <div>
                                            <p className="font-bold text-slate-800">{rem.text}</p>
                                            <p className="text-xs text-slate-500">
                                                {rem.type === 'recurring' 
                                                    ? `Ogni ${['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][rem.dayOfWeek || 0]}`
                                                    : rem.type === 'monthly'
                                                        ? (rem.monthlyDetail === 'first-day' ? 'Primo giorno del mese' : 'Ultimo giorno del mese')
                                                        : (rem.date ? `Il ${new Date(rem.date).toLocaleDateString()}` : 'Data non valida')
                                                }
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditReminder(rem)} className="text-blue-500 hover:bg-blue-50 p-2 rounded">
                                                <EditIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleDeleteReminder(rem.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                                {reminders.length === 0 && <li className="p-8 text-center text-slate-400 italic">Nessun promemoria.</li>}
                            </ul>
                        </div>
                    </div>
                )}

                {/* ROLE MANAGEMENT TAB (SUPER ADMIN ONLY) */}
                {activeTab === 'roles' && (isSuperAdmin || isLocalSuperAdmin) && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <ShieldCheckIcon className="h-6 w-6 text-purple-600" /> Aggiungi Nuovo Ruolo
                            </h2>
                            <p className="text-sm text-slate-500 mb-4">Crea ruoli personalizzati (es. Responsabile Officina) e assegna un livello di permesso.</p>
                            
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-grow">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Nome Ruolo</label>
                                    <input 
                                        type="text" 
                                        value={newRoleLabel} 
                                        onChange={e => setNewRoleLabel(e.target.value)} 
                                        placeholder="Es. Responsabile Bar" 
                                        className="w-full border rounded p-2.5 font-bold" 
                                    />
                                </div>
                                <div className="md:w-1/3">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Livello Accesso</label>
                                    <select 
                                        value={newRoleLevel} 
                                        onChange={e => setNewRoleLevel(parseInt(e.target.value))} 
                                        className="w-full border rounded p-2.5 bg-white font-bold"
                                    >
                                        <option value={1}>Standard (Utente)</option>
                                        <option value={2}>Manager (Responsabile)</option>
                                        <option value={3}>Admin (Amministratore)</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={handleAddRole} 
                                    className="bg-purple-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-purple-700 shadow-md h-10 self-end"
                                >
                                    Crea
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 p-4 bg-slate-50 border-b">Ruoli Personalizzati Attivi</h3>
                            <ul>
                                {customRoles.map(role => (
                                    <li key={role.id} className="p-4 flex justify-between items-center border-b last:border-0 hover:bg-slate-50">
                                        <div>
                                            <p className="font-bold text-slate-800">{role.label}</p>
                                            <p className="text-xs text-slate-500">
                                                Livello: {role.level === 1 ? 'Standard' : (role.level === 2 ? 'Manager' : 'Admin')}
                                            </p>
                                        </div>
                                        <button onClick={() => handleDeleteRole(role.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </li>
                                ))}
                                {customRoles.length === 0 && <li className="p-8 text-center text-slate-400 italic">Nessun ruolo personalizzato.</li>}
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-4 max-w-4xl mx-auto">
                        {/* 0. CONFIGURAZIONE INTERVENTI */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button onClick={() => toggleSection('interventions')} className="w-full p-4 flex justify-between items-center text-left bg-slate-50 hover:bg-slate-100 transition-colors">
                                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <FireIcon className="h-5 w-5 text-orange-500" /> Configurazione Interventi
                                </h2>
                                <span>{expandedSection === 'interventions' ? '−' : '+'}</span>
                            </button>
                            {expandedSection === 'interventions' && (
                                <div className="p-6 animate-fade-in border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* TIPOLOGIE */}
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-xs font-bold uppercase">Tipologie Intervento</h3>
                                            <button 
                                                onClick={handleLoadStandardTypologies}
                                                className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-full shadow-sm"
                                                title="Carica Lista Standard"
                                            >
                                                <ListIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <input type="text" value={newTypology} onChange={e => setNewTypology(e.target.value)} placeholder="Es. Incendio, Soccorso..." className="border rounded p-1 text-sm flex-grow" />
                                            <button onClick={handleAddTypology} className="bg-green-500 text-white px-2 rounded font-bold">+</button>
                                        </div>
                                        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                                            {interventionTypologies.map(t => (
                                                <li key={t.id} className="flex justify-between items-center bg-white p-1 rounded shadow-sm">
                                                    <span>{t.name}</span>
                                                    <button onClick={() => deleteInterventionTypology(t.id)} className="text-red-500 font-bold">×</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    
                                    {/* FUNZIONARI */}
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <h3 className="text-xs font-bold uppercase mb-2">Funzionari di Servizio</h3>
                                        <div className="flex gap-2 mb-2">
                                            <input type="text" value={newOfficer} onChange={e => setNewOfficer(e.target.value)} placeholder="Nome Funzionario" className="border rounded p-1 text-sm flex-grow" />
                                            <button onClick={handleAddOfficer} className="bg-green-500 text-white px-2 rounded font-bold">+</button>
                                        </div>
                                        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                                            {dutyOfficers.map(o => (
                                                <li key={o.id} className="flex justify-between items-center bg-white p-1 rounded shadow-sm">
                                                    <span>{o.name}</span>
                                                    <button onClick={() => deleteDutyOfficer(o.id)} className="text-red-500 font-bold">×</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 1. CONFIGURAZIONE COLORI CASSE */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button onClick={() => toggleSection('colors')} className="w-full p-4 flex justify-between items-center text-left bg-slate-50 hover:bg-slate-100 transition-colors">
                                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <PaletteIcon className="h-5 w-5 text-indigo-500" /> Colori Casse & Temi
                                </h2>
                                <span>{expandedSection === 'colors' ? '−' : '+'}</span>
                            </button>
                            {expandedSection === 'colors' && (
                                <div className="p-6 animate-fade-in border-t border-slate-100">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        {tills.map(till => (
                                            <div key={till.id}>
                                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cassa {till.id}</label>
                                                <input type="color" value={colors[till.id] || '#000000'} onChange={(e) => handleColorChange(till.id, e.target.value)} className="w-full h-10 p-1 rounded border cursor-pointer" />
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={saveSettings} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm w-full md:w-auto">Salva Colori</button>
                                </div>
                            )}
                        </div>

                        {/* 2. STAGIONALITÀ & EFFETTI */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button onClick={() => toggleSection('seasonality')} className="w-full p-4 flex justify-between items-center text-left bg-slate-50 hover:bg-slate-100 transition-colors">
                                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-yellow-500" /> Stagionalità & Effetti
                                </h2>
                                <span>{expandedSection === 'seasonality' ? '−' : '+'}</span>
                            </button>
                            {expandedSection === 'seasonality' && (
                                <div className="p-6 bg-slate-50 animate-fade-in border-t border-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Inizio</label><input type="date" value={seasonStart} onChange={e => setSeasonStart(e.target.value)} className="w-full border p-2 rounded" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Fine</label><input type="date" value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} className="w-full border p-2 rounded" /></div>
                                        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 block mb-1">Preset</label><select value={seasonPreset} onChange={e => setSeasonPreset(e.target.value as any)} className="w-full border p-2 rounded"><option value="custom">Personalizzato</option><option value="christmas">Natale</option><option value="easter">Pasqua</option><option value="summer">Estate</option><option value="halloween">Halloween</option></select></div>
                                        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 block mb-1">Emoji (separate da virgola)</label><input type="text" value={seasonEmojis} onChange={e => setSeasonEmojis(e.target.value)} className="w-full border p-2 rounded" /></div>
                                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Animazione</label><select value={seasonAnim} onChange={e => setSeasonAnim(e.target.value as any)} className="w-full border p-2 rounded"><option value="none">Nessuna</option><option value="snow">Neve (Giù)</option><option value="rain">Pioggia (Veloce)</option><option value="float">Fluttuante (Su)</option></select></div>
                                        <div><label className="text-xs font-bold text-slate-500 block mb-1">Colore Sfondo</label><input type="color" value={seasonBg} onChange={e => setSeasonBg(e.target.value)} className="w-full h-10 p-1 rounded border cursor-pointer" /></div>
                                    </div>
                                    <button onClick={handleSaveSeasonality} className="bg-yellow-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-600 shadow-sm text-sm">Salva Stagionalità</button>
                                </div>
                            )}
                        </div>

                        {/* 3. CONFIGURAZIONE GENERALE */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button onClick={() => toggleSection('general')} className="w-full p-4 flex justify-between items-center text-left bg-slate-50 hover:bg-slate-100 transition-colors">
                                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <SettingsIcon className="h-5 w-5 text-slate-600" /> Configurazione Generale & Manutenzione
                                </h2>
                                <span>{expandedSection === 'general' ? '−' : '+'}</span>
                            </button>
                            {expandedSection === 'general' && (
                                <div className="p-6 bg-slate-50 animate-fade-in border-t border-slate-100">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 block mb-1">Prezzo Quota Acqua (€)</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                value={waterPrice} 
                                                onChange={e => setWaterPrice(parseFloat(e.target.value))} 
                                                className="w-full border p-2 rounded bg-white" 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row gap-3 mt-4 items-center">
                                        <button onClick={handleSaveGeneral} className="bg-slate-700 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 shadow-sm text-sm w-full md:w-auto">
                                            Salva Generale
                                        </button>
                                        <button onClick={handleClearLocalCache} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 shadow-sm text-sm flex items-center justify-center gap-2 w-full md:w-auto">
                                            ⚠️ Svuota Cache Browser (Fix Quota/Crash)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 4. NOTIFICHE */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <button onClick={() => toggleSection('notifications')} className="w-full p-4 flex justify-between items-center text-left bg-slate-50 hover:bg-slate-100 transition-colors">
                                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                    <BellIcon className="h-5 w-5 text-red-500" /> Invia Notifica Push
                                </h2>
                                <span>{expandedSection === 'notifications' ? '−' : '+'}</span>
                            </button>
                            {expandedSection === 'notifications' && (
                                <div className="p-6 animate-fade-in border-t border-slate-100 space-y-3">
                                    <input type="text" placeholder="Titolo Notifica" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} className="w-full border p-2 rounded font-bold" />
                                    <textarea placeholder="Messaggio..." value={notifBody} onChange={e => setNotifBody(e.target.value)} className="w-full border p-2 rounded h-20" />
                                    <button onClick={handleSendNotif} className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 shadow-md w-full md:w-auto">
                                        Invia a Tutti
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                )}
                
                {/* ADMINS MANAGEMENT */}
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
                                        {(isSuperAdmin || isLocalSuperAdmin) && idx !== 0 && (<button onClick={() => onRemoveAdmin(admin.id)} className="text-red-500 hover:bg-red-50 p-2 rounded text-xs font-bold">Rimuovi</button>)}
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
