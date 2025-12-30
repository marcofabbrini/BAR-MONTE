
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Order, OrderItem, Till, Product, StaffMember, TillColors, AnalottoBet, TombolaConfig, TombolaTicket, AttendanceRecord, GeneralSettings, AttendanceStatus } from '../types';
import { VVF_GRADES } from '../constants';
import OrderSummary from './OrderSummary';
import OrderHistory from './OrderHistory';
import ProductCard from './ProductCard';
import { BackArrowIcon, UsersIcon, DropletIcon } from './Icons';
import { useBar } from '../contexts/BarContext';
import { GradeBadge } from './StaffManagement';

interface TillViewProps {
    till: Till;
    onGoBack: () => void;
    onRedirectToAttendance: () => void;
    products: Product[];
    allStaff: StaffMember[];
    allOrders: Order[];
    onCompleteOrder: (newOrder: Omit<Order, 'id'>) => Promise<void>;
    tillColors?: TillColors;
    onSaveAttendance?: (tillId: string, presentStaffIds: string[], dateOverride?: string, closedBy?: string, details?: Record<string, AttendanceStatus>, substitutionNames?: Record<string, string>) => Promise<void>;
    onPlaceAnalottoBet?: (bet: Omit<AnalottoBet, 'id' | 'timestamp'>) => Promise<void>;
    tombolaConfig?: TombolaConfig;
    tombolaTickets?: TombolaTicket[];
    onBuyTombolaTicket?: (staffId: string, quantity: number) => Promise<void>;
    attendanceRecords?: AttendanceRecord[];
    generalSettings?: GeneralSettings;
}

const TillView: React.FC<TillViewProps> = ({ till, onGoBack, onRedirectToAttendance, products, allStaff, allOrders, onCompleteOrder, tillColors, onSaveAttendance, onPlaceAnalottoBet, tombolaConfig, tombolaTickets, onBuyTombolaTicket, attendanceRecords, generalSettings }) => {
    const { getNow } = useBar();
    const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
    const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAnimatingSelection, setIsAnimatingSelection] = useState(false);

    // PRESENZE STATE
    const [presentStaffIds, setPresentStaffIds] = useState<string[]>([]);
    
    // CALCOLO DATA OPERATIVA
    const operativeDateStr = useMemo(() => {
        const now = getNow();
        const currentHour = now.getHours();
        
        const anchorDate = new Date(2025, 11, 20, 12, 0, 0); // 20 Dic 2025 = B
        const anchorShift = 'b';
        
        const todayNoTime = new Date(now);
        todayNoTime.setHours(12, 0, 0, 0);
        
        const diffTime = todayNoTime.getTime() - anchorDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        const shifts = ['a', 'b', 'c', 'd'];
        const anchorIndex = shifts.indexOf(anchorShift);
        
        let dayShiftIndex = (anchorIndex + diffDays) % 4;
        if (dayShiftIndex < 0) dayShiftIndex += 4;
        
        let smontanteShiftIndex = (dayShiftIndex - 2 + 4) % 4;
        const smontanteShiftCode = shifts[smontanteShiftIndex];

        const isSmontanteTill = till.shift.toLowerCase() === smontanteShiftCode;

        if (isSmontanteTill && currentHour < 11) {
             const yesterday = new Date(now);
             yesterday.setDate(yesterday.getDate() - 1);
             return yesterday.toISOString().split('T')[0];
        }

        return now.toISOString().split('T')[0];
    }, [getNow, till.shift]);

    const existingAttendanceRecord = useMemo(() => 
        attendanceRecords?.find(r => r.date === operativeDateStr && r.tillId === till.id),
    [attendanceRecords, operativeDateStr, till.id]);
    
    const isShiftValidated = !!existingAttendanceRecord?.closedAt;

    const themeColor = tillColors ? (tillColors[till.id] || '#f97316') : '#f97316';

    const staffForShift = useMemo(() => allStaff.filter(s => s.shift === till.shift), [allStaff, till.shift]);
    
    useEffect(() => {
        if (isShiftValidated && existingAttendanceRecord) {
            setPresentStaffIds(existingAttendanceRecord.presentStaffIds);
        } else {
            setPresentStaffIds([]);
        }
    }, [isShiftValidated, existingAttendanceRecord]);

    const sortedStaffForShift = useMemo(() => {
        return [...staffForShift].sort((a, b) => {
            const aIsCassa = a.name.toLowerCase().includes('cassa');
            const bIsCassa = b.name.toLowerCase().includes('cassa');
            if (aIsCassa && !bIsCassa) return -1;
            if (!aIsCassa && bIsCassa) return 1;

            const getRank = (gradeId?: string) => {
                if (!gradeId) return -1;
                return VVF_GRADES.findIndex(g => g.id === gradeId);
            };
            
            const rankA = getRank(a.grade);
            const rankB = getRank(b.grade);
            
            if (rankA !== rankB) {
                return rankB - rankA;
            }

            return a.name.localeCompare(b.name);
        });
    }, [staffForShift]);

    const selectedStaffMember = useMemo(() => allStaff.find(s => s.id === selectedStaffId), [allStaff, selectedStaffId]);
    
    const ordersForHistory = useMemo(() => {
        const tillOrders = allOrders.filter(o => o.tillId === till.id);
        if (selectedStaffId) {
            return tillOrders.filter(o => o.staffId === selectedStaffId);
        }
        return tillOrders;
    }, [allOrders, till.id, selectedStaffId]);

    const productPopularity = useMemo(() => {
        const counts: Record<string, number> = {};
        allOrders.forEach(order => {
            if (!order.isDeleted) {
                order.items.forEach(item => {
                    counts[item.product.id] = (counts[item.product.id] || 0) + item.quantity;
                });
            }
        });
        return counts;
    }, [allOrders]);

    const sortProductsBySales = (list: Product[]) => {
        return [...list].sort((a, b) => {
            const countA = productPopularity[a.id] || 0;
            const countB = productPopularity[b.id] || 0;
            if (countB !== countA) return countB - countA;
            return a.name.localeCompare(b.name);
        });
    };

    const favoriteProducts = useMemo(() => sortProductsBySales(products.filter(p => p.isFavorite)), [products, productPopularity]);
    const otherProducts = useMemo(() => sortProductsBySales(products.filter(p => !p.isFavorite)), [products, productPopularity]);

    const cartTotal = useMemo(() => currentOrder.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [currentOrder]);
    const cartItemCount = useMemo(() => currentOrder.reduce((sum, item) => sum + item.quantity, 0), [currentOrder]);

    const waterData = useMemo(() => {
        if (!attendanceRecords) return { quotas: [], totalCount: 0, totalValue: 0 };
        
        const refDate = new Date(operativeDateStr);
        const currentMonth = refDate.getMonth();
        const currentYear = refDate.getFullYear();
        const unitPrice = generalSettings?.waterQuotaPrice || 0;

        let totalCount = 0;

        const quotas = staffForShift
            .filter(s => !s.name.toLowerCase().includes('cassa') && s.role !== 'super-admin') // EXCLUDE SUPER ADMIN
            .map(member => {
                const count = attendanceRecords.filter(r => {
                    const d = new Date(r.date);
                    const isSameMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    if (!isSameMonth) return false;

                    if (r.attendanceDetails && r.attendanceDetails[member.id]) {
                        const status = r.attendanceDetails[member.id];
                        return ['present', 'substitution', 'sub1', 'sub2', 'sub3'].includes(status);
                    }

                    return r.presentStaffIds.includes(member.id);
                }).length;
                
                totalCount += count;
                return { name: member.name, count, id: member.id, value: count * unitPrice };
            })
            .sort((a,b) => b.count - a.count);
            
        return { quotas, totalCount, totalValue: totalCount * unitPrice };
    }, [attendanceRecords, staffForShift, operativeDateStr, generalSettings]);

    const addToOrder = useCallback((product: Product) => {
        if (product.stock <= 0) return;
        setCurrentOrder(prevOrder => {
            const existingItem = prevOrder.find(item => item.product.id === product.id);
            const productInStock = products.find(p => p.id === product.id);
            const stock = productInStock ? productInStock.stock : 0;
            if (existingItem) {
                if (existingItem.quantity >= stock) return prevOrder;
                return prevOrder.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prevOrder, { product, quantity: 1 }];
        });
    }, [products]);

    const updateQuantity = useCallback((productId: string, newQuantity: number) => {
        const productInStock = products.find(p => p.id === productId);
        const stock = productInStock ? productInStock.stock : 0;
        setCurrentOrder(prevOrder => {
            if (newQuantity <= 0) return prevOrder.filter(item => item.product.id !== productId);
            return prevOrder.map(item => item.product.id === productId ? { ...item, quantity: Math.min(newQuantity, stock) } : item);
        });
    }, [products]);

    const clearOrder = useCallback(() => { setCurrentOrder([]); setIsCartOpen(false); }, []);

    const completeOrder = useCallback(async () => {
        if (currentOrder.length === 0 || !selectedStaffId) return;
        const newOrder: Omit<Order, 'id'> = {
            items: currentOrder.map(item => ({ product: item.product, quantity: item.quantity })),
            total: cartTotal,
            timestamp: getNow().toISOString(),
            staffId: selectedStaffId,
            staffName: selectedStaffMember?.name,
            tillId: till.id,
        };
        try {
            setIsCartOpen(false); 
            await onCompleteOrder(newOrder);
            clearOrder();
        } catch (error: any) {
            console.error("Error completing order: ", error);
            const msg = error.message || 'Errore sconosciuto';
            
            // --- FIX DEFINITIVO QUOTA EXCEEDED ---
            // Se l'errore è Quota Exceeded, puliamo tutto e invitiamo a riprovare SENZA reload
            if (msg.includes("Quota exceeded") || error.name === 'QuotaExceededError' || error.code === 22) {
                try {
                    console.warn("Storage Quota Exceeded - Executing Emergency Cleanup");
                    localStorage.clear();
                    sessionStorage.clear();
                    
                    // Tentativo di pulizia IndexedDB (Async)
                    if (window.indexedDB && window.indexedDB.databases) {
                        window.indexedDB.databases().then(dbs => {
                            dbs.forEach(db => {
                                if(db.name) window.indexedDB.deleteDatabase(db.name);
                            });
                        });
                    }
                    
                    alert("⚠️ MEMORIA DISPOSITIVO PIENA.\n\nIl sistema ha eseguito una pulizia automatica della cache.\n\nPER FAVORE: Premi di nuovo 'Conferma Acquisto'. Ora dovrebbe funzionare.");
                    return; // Interrompi qui, l'utente premerà di nuovo il pulsante e funzionerà
                } catch(cleanupError) {
                    console.error("Cleanup failed", cleanupError);
                }
            }

            alert(`Errore nel completamento dell'ordine: ${msg}. Riprova.`);
            setIsCartOpen(true);
        }
    }, [currentOrder, cartTotal, selectedStaffId, selectedStaffMember, till.id, onCompleteOrder, clearOrder, getNow]);

    const handleStaffSelection = (id: string) => {
        setIsAnimatingSelection(true);
        setTimeout(() => {
            setSelectedStaffId(id);
            setIsAnimatingSelection(false);
        }, 300);
    };

    const handleStaffDeselection = () => {
        setSelectedStaffId('');
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="flex flex-col min-h-dvh bg-slate-50 md:flex-row relative">
            
            {/* BLOCKING MODAL: PRESENZE NON VALIDATE */}
            {!isShiftValidated && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-bounce-slow border-b-8 border-red-500">
                        <h2 className="text-2xl font-black text-slate-800 uppercase mb-2">Presenze Mancanti</h2>
                        <p className="text-slate-600 mb-8">
                            Prima di aprire la cassa, devi inserire e <b>VALIDARE</b> le presenze del turno di riferimento ({new Date(operativeDateStr).toLocaleDateString()}).
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={onRedirectToAttendance} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <UsersIcon className="h-5 w-5" /> Vai a Gestione Presenze
                            </button>
                            <button onClick={onGoBack} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold py-3 rounded-xl transition-all">
                                Torna Indietro
                            </button>
                        </div>
                    </div>
                </div>
            )}

             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 fixed">
                <span className="text-[300px] md:text-[500px] font-black text-slate-200/50 select-none">
                    {till.shift.toUpperCase()}
                </span>
            </div>

            <div className={`flex-grow flex flex-col w-full md:w-auto min-h-dvh z-10 ${!isShiftValidated ? 'filter blur-sm pointer-events-none' : ''}`}>
                <header className="sticky top-0 px-4 py-2 flex justify-between items-center shadow-sm z-30 border-b border-white/20 text-white transition-colors duration-300 backdrop-blur-md bg-opacity-90 mt-[env(safe-area-inset-top)]" style={{ backgroundColor: themeColor + 'E6' }}>
                     <div className="flex items-center gap-3">
                         <button onClick={onGoBack} className="group flex items-center gap-1 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center transition-colors shadow-sm">
                                <BackArrowIcon className="h-5 w-5 text-black" />
                            </div>
                        </button>
                        <h1 className="text-lg font-black tracking-tighter uppercase text-slate-900 drop-shadow-sm">{till.name}</h1>
                    </div>
                    
                    <div className="flex items-center gap-2 h-8">
                        {selectedStaffId && selectedStaffMember && (
                            <button onClick={handleStaffDeselection} className="hidden md:flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full pr-3 pl-1 py-1 transition-all animate-fade-in h-full mr-2">
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs shadow-sm text-slate-800 overflow-hidden border border-white/50">
                                    {selectedStaffMember.photoUrl ? (
                                        <img src={selectedStaffMember.photoUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedStaffMember.icon || getInitials(selectedStaffMember.name)
                                    )}
                                </div>
                                <span className="font-bold text-xs">{selectedStaffMember.name}</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2 bg-white/90 rounded-lg px-3 py-1 shadow-sm h-full border border-white/50">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-800 flex items-center h-full">Turno {till.shift}</span>
                        </div>
                    </div>
                </header>
                
                <main className="flex-grow flex flex-col relative w-full pb-20 md:pb-4">
                    <div className="px-4 py-2 z-20 sticky top-[50px] flex gap-2 overflow-x-auto">
                         <div className="bg-white/90 backdrop-blur p-1 rounded-xl shadow-sm inline-flex w-full md:w-auto border border-slate-100">
                            <button onClick={() => setActiveTab('order')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'order' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Al bar...</button>
                            <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                                {selectedStaffMember ? `Storico ${selectedStaffMember.name}` : `Storico Turno ${till.shift.toUpperCase()}`}
                            </button>
                        </div>
                    </div>

                    <div className="px-4 w-full max-w-7xl mx-auto flex-grow">
                        {activeTab === 'order' && (
                            <div className="animate-fade-in-up">
                                {!selectedStaffId && (
                                    <div className={`mb-4 transition-all duration-300 ${isAnimatingSelection ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">Chi sei?</h3>
                                        <div className={`grid grid-cols-4 sm:grid-cols-6 gap-4 p-4 rounded-xl ${!selectedStaffId ? 'animate-red-pulse' : ''}`}>
                                            {sortedStaffForShift.map(staff => {
                                                const isCassa = staff.name.toLowerCase().includes('cassa');
                                                let isVisiblyPresent = false;
                                                
                                                if (existingAttendanceRecord?.attendanceDetails) {
                                                    const status = existingAttendanceRecord.attendanceDetails[staff.id];
                                                    isVisiblyPresent = ['present', 'substitution', 'sub1', 'sub2', 'sub3'].includes(status);
                                                    if (isCassa && existingAttendanceRecord.presentStaffIds.includes(staff.id)) isVisiblyPresent = true;
                                                } else {
                                                    isVisiblyPresent = presentStaffIds.includes(staff.id);
                                                }

                                                if (!isVisiblyPresent) return null;
                                                
                                                return (
                                                    <button key={staff.id} onClick={() => handleStaffSelection(staff.id)} className={`group flex flex-col items-center gap-2 transition-all cursor-pointer`}>
                                                        <div className="relative w-16 h-16 flex-shrink-0 group-hover:scale-105 transition-transform mx-auto">
                                                            <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center text-2xl border-2 shadow-md ${isCassa ? 'bg-primary border-primary-dark text-white' : 'bg-white border-slate-100 group-hover:border-primary'}`}>
                                                                {staff.photoUrl ? <img src={staff.photoUrl} alt={staff.name} className="w-full h-full object-cover rounded-full" /> : <span className="pb-1">{staff.icon || getInitials(staff.name)}</span>}
                                                            </div>
                                                            {!isCassa && staff.grade && <div className="absolute -top-1 -right-1 z-20"><GradeBadge grade={staff.grade} /></div>}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-primary truncate w-full text-center">{staff.name.split(' ')[0]}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {favoriteProducts.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">Preferiti</h3>
                                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                            {favoriteProducts.map(product => {
                                                const inCart = currentOrder.some(i => i.product.id === product.id);
                                                return <ProductCard key={product.id} product={product} onAddToCart={addToOrder} inCart={inCart} />;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {otherProducts.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">Altri Prodotti</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                            {otherProducts.map(product => {
                                                const inCart = currentOrder.some(i => i.product.id === product.id);
                                                return <ProductCard key={product.id} product={product} onAddToCart={addToOrder} inCart={inCart} isCompact />;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'history' && (
                            <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur rounded-2xl p-4 shadow-sm border border-slate-100">
                                {!selectedStaffId && waterData.quotas.length > 0 && (
                                    <div className="mb-6 bg-blue-50/50 rounded-2xl border border-blue-200/60 p-5 relative overflow-hidden shadow-sm">
                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 border-b border-blue-200 pb-2">
                                                <div>
                                                    <h4 className="text-sm font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                                                        <DropletIcon className="h-5 w-5 text-blue-500" /> Riepilogo Acqua
                                                    </h4>
                                                    <p className="text-[10px] text-blue-600 font-bold mt-1 uppercase">
                                                        {new Date(operativeDateStr).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end mt-2 md:mt-0">
                                                    <span className="text-[9px] text-blue-500 font-bold uppercase">Totale Turno</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-2xl font-black text-blue-800">€{waterData.totalValue.toFixed(2)}</span>
                                                        <span className="text-xs text-blue-600 font-bold">({waterData.totalCount} quote)</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {waterData.quotas.map(user => {
                                                    return (
                                                        <div key={user.id} className="bg-white p-3 rounded-xl border border-blue-100 flex flex-col shadow-sm relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 w-8 h-8 bg-blue-50 rounded-bl-xl flex items-center justify-center">
                                                                <span className="text-xs font-black text-blue-500">{user.count}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700 truncate pr-6">{user.name}</span>
                                                            <div className="mt-2 flex justify-between items-end">
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Presenze</span>
                                                                <span className="text-sm font-black text-blue-700">€{user.value.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4 text-sm md:text-base font-black text-slate-500 uppercase text-center tracking-wider bg-slate-100/50 py-2 rounded-lg relative overflow-hidden">
                                    <span className="relative z-10">{selectedStaffId ? `Storico di ${selectedStaffMember?.name}` : 'Storico Completo Cassa'}</span>
                                </div>
                                <OrderHistory orders={ordersForHistory} staff={staffForShift} attendanceRecords={attendanceRecords} tillId={till.id} generalSettings={generalSettings} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            <div className={`md:hidden fixed bottom-0 left-0 w-full bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] border-t border-slate-200 z-50 transition-transform duration-300 pb-[env(safe-area-inset-bottom)] ${activeTab === 'order' ? 'translate-y-0' : 'translate-y-full'}`}>
                 <button onClick={() => setIsCartOpen(true)} className="w-full flex items-center justify-between p-3 bg-white active:bg-slate-50">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{cartItemCount} Articoli</span>
                        <span className="text-xl font-black text-slate-800">€{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="px-4 py-2 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 text-sm" style={{ backgroundColor: themeColor }}>
                        <span>Carrello</span>
                        <span className="text-lg">🛒</span>
                    </div>
                </button>
            </div>
             {isCartOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-end animate-fade-in pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-slate-50 w-full h-[80vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white">
                            <h2 className="text-lg font-bold text-slate-800">Il tuo Ordine</h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">✕</button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                             <OrderSummary orderItems={currentOrder} onUpdateQuantity={updateQuantity} onClear={clearOrder} onComplete={completeOrder} selectedStaff={selectedStaffMember} />
                        </div>
                    </div>
                </div>
            )}
            <aside className="hidden md:flex sticky top-0 h-screen w-80 bg-white/95 backdrop-blur shadow-xl border-l border-slate-200 z-40 flex-col">
                <OrderSummary orderItems={currentOrder} onUpdateQuantity={updateQuantity} onClear={clearOrder} onComplete={completeOrder} selectedStaff={selectedStaffMember} />
            </aside>
        </div>
    );
};
export default TillView;
