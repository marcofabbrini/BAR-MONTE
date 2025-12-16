
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Order, OrderItem, Till, Product, StaffMember, TillColors, AnalottoBet, AnalottoWheel, TombolaConfig, TombolaTicket, AttendanceRecord, GeneralSettings } from '../types';
import OrderSummary from './OrderSummary';
import OrderHistory from './OrderHistory';
import ProductCard from './ProductCard';
import { BackArrowIcon, UsersIcon, CheckIcon, CloverIcon, TicketIcon, LockIcon, EyeIcon } from './Icons';

interface TillViewProps {
    till: Till;
    onGoBack: () => void;
    products: Product[];
    allStaff: StaffMember[];
    allOrders: Order[];
    onCompleteOrder: (newOrder: Omit<Order, 'id'>) => Promise<void>;
    tillColors?: TillColors;
    onSaveAttendance?: (tillId: string, presentStaffIds: string[], dateOverride?: string, closedBy?: string) => Promise<void>;
    onPlaceAnalottoBet?: (bet: Omit<AnalottoBet, 'id' | 'timestamp'>) => Promise<void>;
    tombolaConfig?: TombolaConfig;
    tombolaTickets?: TombolaTicket[];
    onBuyTombolaTicket?: (staffId: string, quantity: number) => Promise<void>;
    attendanceRecords?: AttendanceRecord[];
    generalSettings?: GeneralSettings;
}

const TillView: React.FC<TillViewProps> = ({ till, onGoBack, products, allStaff, allOrders, onCompleteOrder, tillColors, onSaveAttendance, onPlaceAnalottoBet, tombolaConfig, tombolaTickets, onBuyTombolaTicket, attendanceRecords, generalSettings }) => {
    const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
    const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAnimatingSelection, setIsAnimatingSelection] = useState(false);

    // PRESENZE STATE
    const [presentStaffIds, setPresentStaffIds] = useState<string[]>([]);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

    // Calcolo stato chiusura turno
    const today = new Date().toISOString().split('T')[0];
    const existingAttendanceRecord = useMemo(() => 
        attendanceRecords?.find(r => r.date === today && r.tillId === till.id),
    [attendanceRecords, today, till.id]);
    
    const isShiftClosed = !!existingAttendanceRecord?.closedAt;

    const themeColor = tillColors ? (tillColors[till.id] || '#f97316') : '#f97316';

    const staffForShift = useMemo(() => allStaff.filter(s => s.shift === till.shift), [allStaff, till.shift]);
    
    // Ordinamento Staff: "Cassa" per primo, poi alfabetico
    const sortedStaffForShift = useMemo(() => {
        return [...staffForShift].sort((a, b) => {
            const aIsCassa = a.name.toLowerCase().includes('cassa');
            const bIsCassa = b.name.toLowerCase().includes('cassa');
            if (aIsCassa && !bIsCassa) return -1;
            if (!aIsCassa && bIsCassa) return 1;
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

    // POPOLARITÀ PRODOTTI
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

    // Calcolo Quote Acqua (Mese Corrente) per la visualizzazione nella tabellina
    const waterQuotas = useMemo(() => {
        if (!attendanceRecords) return [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const quotas = staffForShift
            .filter(s => !s.name.toLowerCase().includes('cassa'))
            .map(member => {
                const count = attendanceRecords.filter(r => {
                    const d = new Date(r.date);
                    return d.getMonth() === currentMonth && 
                           d.getFullYear() === currentYear && 
                           r.presentStaffIds.includes(member.id);
                }).length;
                return { name: member.name, count, id: member.id };
            })
            .sort((a,b) => b.count - a.count);
        return quotas;
    }, [attendanceRecords, staffForShift]);

    // ATTENDANCE LOGIC
    useEffect(() => {
        // Se il turno è chiuso ufficialmente (su DB), usa quello
        if (existingAttendanceRecord) {
            setPresentStaffIds(existingAttendanceRecord.presentStaffIds);
            return;
        }

        // Altrimenti usa local storage o default
        const storageKey = `attendance_v1_${till.id}_${today}`;
        const saved = localStorage.getItem(storageKey);

        const cassaUser = staffForShift.find(s => s.name.toLowerCase().includes('cassa'));
        let initialIds: string[] = [];

        if (saved) {
            initialIds = JSON.parse(saved);
        } else {
            // First time entry for today: Select ALL by default and open modal
            initialIds = staffForShift.map(s => s.id);
            if(!isShiftClosed) setIsAttendanceModalOpen(true);
        }

        if (cassaUser && !initialIds.includes(cassaUser.id)) {
            initialIds.push(cassaUser.id);
        }

        setPresentStaffIds(initialIds);
    }, [till.id, staffForShift, isShiftClosed, existingAttendanceRecord, today]);

    const handleToggleAttendance = (id: string) => {
        if (isShiftClosed) return; // Blocco modifiche se chiuso

        // Impedisci di deselezionare la cassa
        const member = allStaff.find(s => s.id === id);
        if (member && member.name.toLowerCase().includes('cassa')) return;

        setPresentStaffIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleProvisionalAttendance = () => {
        const storageKey = `attendance_v1_${till.id}_${today}`;
        localStorage.setItem(storageKey, JSON.stringify(presentStaffIds));
        setIsAttendanceModalOpen(false);
    };

    const confirmAttendance = () => {
        const storageKey = `attendance_v1_${till.id}_${today}`;
        localStorage.setItem(storageKey, JSON.stringify(presentStaffIds));
        
        // Verifica numero presenze (esclusa cassa)
        const realPeopleCount = presentStaffIds.filter(id => {
            const member = allStaff.find(s => s.id === id);
            return member && !member.name.toLowerCase().includes('cassa');
        }).length;

        if (realPeopleCount !== 5) {
            const confirm = window.confirm(`Attenzione: Risultano ${realPeopleCount} operatori presenti (standard 5). Confermi la chiusura?`);
            if (!confirm) return;
        }

        if (onSaveAttendance) {
            // Registro come "Operatore Cassa [Turno]"
            onSaveAttendance(till.id, presentStaffIds, undefined, `Operatore Cassa ${till.shift.toUpperCase()}`);
        }

        setIsAttendanceModalOpen(false);
    };

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
            timestamp: new Date().toISOString(),
            staffId: selectedStaffId,
            staffName: selectedStaffMember?.name,
            tillId: till.id,
        };
        try {
            setIsCartOpen(false); // Close UI immediately for better UX
            await onCompleteOrder(newOrder);
            clearOrder();
        } catch (error: any) {
            console.error("Error completing order: ", error);
            alert(`Errore nel completamento dell'ordine: ${error.message || 'Errore sconosciuto'}. Riprova.`);
            setIsCartOpen(true); // Reopen if failed
        }
    }, [currentOrder, cartTotal, selectedStaffId, selectedStaffMember, till.id, onCompleteOrder, clearOrder]);

    const handleStaffSelection = (id: string) => {
        if (!presentStaffIds.includes(id)) return;
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

    // --- ANALOTTO LOGIC ---
    const handleQuickAnalotto = async (amount: number) => {
        if (!selectedStaffId) {
            alert("Seleziona prima un utente per giocare.");
            return;
        }
        if (!onPlaceAnalottoBet) return;

        try {
            await onPlaceAnalottoBet({
                playerId: selectedStaffId,
                playerName: selectedStaffMember?.name || 'Utente',
                amount: amount,
                status: 'pending',
                numbers: [],
                wheels: []
            });
            alert("Ticket Analotto acquistato! Completalo nella sezione Extra Hub.");
        } catch (error) {
            console.error(error);
            alert("Errore durante l'acquisto del ticket.");
        }
    };

    // --- TOMBOLA LOGIC ---
    const handleQuickTombola = async (quantity: number) => {
        if (!selectedStaffId) {
            alert("Seleziona prima un utente per giocare.");
            return;
        }
        if (!onBuyTombolaTicket || !tombolaTickets) return;

        const currentTickets = tombolaTickets.filter(t => t.playerId === selectedStaffId).length;
        if (currentTickets + quantity > 18) {
            alert(`Limite raggiunto! L'utente ha già ${currentTickets} cartelle. Il massimo è 18.`);
            return;
        }

        try {
            await onBuyTombolaTicket(selectedStaffId, quantity);
            alert(`Acquisto confermato: ${quantity} cartella/e!`);
        } catch (error: any) {
            console.error(error);
            alert("Errore acquisto Tombola: " + (error.message || 'Sconosciuto'));
        }
    };

    return (
        <div className="flex flex-col min-h-dvh bg-slate-50 md:flex-row relative">
            
            {/* ATTENDANCE MODAL */}
            {isAttendanceModalOpen && (
                <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-lg overflow-hidden animate-slide-up">
                        <div className="p-6 text-center border-b border-slate-50">
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Presenze Turno {till.shift.toUpperCase()}</h2>
                            <p className="text-xs text-slate-400 mt-1 font-medium">Chi è in servizio oggi?</p>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-3 mb-6 max-h-[50vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                {sortedStaffForShift.map(member => {
                                    const isSelected = presentStaffIds.includes(member.id);
                                    const isCassa = member.name.toLowerCase().includes('cassa');
                                    return (
                                        <button 
                                            key={member.id} 
                                            onClick={() => handleToggleAttendance(member.id)}
                                            disabled={isCassa || isShiftClosed}
                                            className={`
                                                flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200
                                                ${(isCassa || isShiftClosed) ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}
                                                ${isCassa ? 'bg-slate-100 border-slate-200' : ''}
                                                ${isSelected && !isCassa ? 'border-green-500 bg-green-50 shadow-sm' : ''}
                                                ${!isSelected && !isCassa ? 'border-slate-100 bg-slate-50 text-slate-300' : ''}
                                            `}
                                        >
                                            <div className="text-3xl mb-1 filter drop-shadow-sm">{member.icon || '👤'}</div>
                                            <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>{member.name}</p>
                                            {isCassa ? (
                                                <div className="mt-1 text-slate-400 flex items-center gap-1 text-[10px] uppercase font-bold"><LockIcon className="h-3 w-3" /> Obbligatorio</div>
                                            ) : (
                                                isSelected && <div className="mt-1 text-green-500"><CheckIcon className="h-4 w-4" /></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {isShiftClosed ? (
                                <div className="bg-green-100 border border-green-200 text-green-800 p-4 rounded-xl text-center">
                                    <div className="flex justify-center mb-2"><CheckIcon className="h-8 w-8 bg-green-200 rounded-full p-1" /></div>
                                    <h3 className="font-bold text-lg uppercase">Turno Chiuso</h3>
                                    <p className="text-xs mt-1">
                                        Chiuso da: <span className="font-bold">{existingAttendanceRecord?.closedBy || 'Sistema'}</span>
                                    </p>
                                    {existingAttendanceRecord?.closedAt && (
                                        <p className="text-[10px] opacity-70">
                                            alle ore {new Date(existingAttendanceRecord.closedAt).toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    )}
                                    <button 
                                        onClick={() => setIsAttendanceModalOpen(false)}
                                        className="mt-3 text-xs font-bold underline hover:text-green-900"
                                    >
                                        Chiudi finestra
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleProvisionalAttendance}
                                        className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold py-4 rounded-xl text-sm shadow-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                        Provvisorio
                                    </button>
                                    <button 
                                        onClick={confirmAttendance}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl text-sm shadow-md uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LockIcon className="h-4 w-4" />
                                        Chiudi Turno
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 fixed">
                <span className="text-[300px] md:text-[500px] font-black text-slate-200/50 select-none">
                    {till.shift.toUpperCase()}
                </span>
            </div>

            <div className="flex-grow flex flex-col w-full md:w-auto min-h-dvh z-10">
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
                            <button 
                                onClick={handleStaffDeselection}
                                className="hidden md:flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full pr-3 pl-1 py-1 transition-all animate-fade-in h-full mr-2"
                            >
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs shadow-sm text-slate-800">
                                    {selectedStaffMember.icon || getInitials(selectedStaffMember.name)}
                                </div>
                                <span className="font-bold text-xs">{selectedStaffMember.name}</span>
                            </button>
                        )}
                        
                        <div className="flex items-center gap-2 bg-white/90 rounded-lg px-3 py-1 shadow-sm h-full border border-white/50">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-800 flex items-center h-full">
                                Turno {till.shift}
                            </span>
                        </div>

                        <button 
                            onClick={() => setIsAttendanceModalOpen(true)}
                            className={`
                                flex items-center gap-2 text-white rounded-lg px-3 py-1 transition-all shadow-md h-full active:scale-95 border border-slate-600
                                ${isShiftClosed ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-700'}
                            `}
                            title="Modifica Presenze"
                        >
                            {isShiftClosed ? <CheckIcon className="h-3 w-3" /> : <UsersIcon className="h-3 w-3" />}
                            <span className="text-[10px] font-bold uppercase tracking-wide">{isShiftClosed ? 'Chiuso' : 'Presenze'}</span>
                        </button>
                    </div>
                </header>
                
                <main className="flex-grow flex flex-col relative w-full pb-20 md:pb-4">
                    {/* ... Rest of existing TillView content ... */}
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
                                        <div className={`grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 rounded-xl ${!selectedStaffId ? 'animate-red-pulse' : ''}`}>
                                            {sortedStaffForShift.map(staff => {
                                                const isPresent = presentStaffIds.includes(staff.id);
                                                const isCassa = staff.name.toLowerCase().includes('cassa');
                                                
                                                return (
                                                    <button 
                                                        key={staff.id} 
                                                        onClick={() => handleStaffSelection(staff.id)}
                                                        disabled={!isPresent}
                                                        className={`group flex flex-col items-center gap-1 transition-all ${!isPresent ? 'opacity-30 grayscale cursor-not-allowed hidden' : 'hover:scale-110 cursor-pointer'}`}
                                                    >
                                                        <div 
                                                            className={`
                                                                w-14 h-14 rounded-full shadow-md border-2 flex items-center justify-center text-2xl transition-all 
                                                                ${!isPresent ? 'bg-slate-100 border-slate-200' : 'border-slate-100 group-hover:border-primary'}
                                                            `}
                                                            style={isCassa && isPresent ? { backgroundColor: themeColor, color: 'white', borderColor: themeColor } : { backgroundColor: 'white' }}
                                                        >
                                                            {staff.icon || <span className={`text-lg font-bold ${isCassa ? 'text-white' : 'text-slate-600'}`}>{getInitials(staff.name)}</span>}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-primary">{staff.name.split(' ')[0]}</span>
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
                                            
                                            {/* ANALOTTO CARDS */}
                                            {[1, 2, 5, 10].map(amt => (
                                                <button 
                                                    key={`analotto-${amt}`}
                                                    onClick={() => handleQuickAnalotto(amt)}
                                                    className="bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center p-2 shadow-sm hover:shadow-md hover:bg-emerald-100 transition-all h-36 relative group"
                                                >
                                                    <div className="absolute top-0 right-2">
                                                        <div className="bg-red-500 w-3 h-4 rounded-b-md shadow-sm flex items-center justify-center">
                                                            <div className="text-[8px] text-white">★</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-4xl mb-2 filter drop-shadow-sm group-hover:scale-110 transition-transform">🍀</div>
                                                    <h3 className="font-black text-emerald-800 text-xs uppercase mb-1">Analotto</h3>
                                                    <span className="bg-emerald-600 text-white px-3 py-1 rounded-full font-black text-sm">€{amt}</span>
                                                </button>
                                            ))}

                                            {/* TOMBOLA CARDS */}
                                            {tombolaConfig?.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleQuickTombola(1)}
                                                        className="bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center justify-center p-2 shadow-sm hover:shadow-md hover:bg-red-100 transition-all h-36 relative group"
                                                    >
                                                        <div className="text-4xl mb-2 filter drop-shadow-sm group-hover:scale-110 transition-transform">🎟️</div>
                                                        <h3 className="font-black text-red-800 text-xs uppercase mb-1">1 Cartella</h3>
                                                        <span className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-sm">€{tombolaConfig.ticketPriceSingle}</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleQuickTombola(6)}
                                                        className="bg-red-50 border border-red-200 rounded-2xl flex flex-col items-center justify-center p-2 shadow-sm hover:shadow-md hover:bg-red-100 transition-all h-36 relative group"
                                                    >
                                                        <div className="absolute top-0 left-0 bg-yellow-400 text-red-900 text-[9px] font-bold px-2 py-0.5 rounded-br-lg z-10">OFFERTA</div>
                                                        <div className="text-4xl mb-2 filter drop-shadow-sm group-hover:scale-110 transition-transform">🎟️x6</div>
                                                        <h3 className="font-black text-red-800 text-xs uppercase mb-1">6 Cartelle</h3>
                                                        <span className="bg-red-600 text-white px-3 py-1 rounded-full font-black text-sm">€{tombolaConfig.ticketPriceBundle}</span>
                                                    </button>
                                                </>
                                            )}
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
                                {/* ... History content ... */}
                                {!selectedStaffId && waterQuotas.length > 0 && (
                                    <div className="mb-6 bg-blue-50 rounded-xl border border-blue-100 p-4 relative overflow-hidden">
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-2">
                                                    <span className="text-lg">💧</span> Quote Acqua (Mese Corrente)
                                                </h4>
                                                {generalSettings?.waterQuotaPrice ? (
                                                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">
                                                        Prezzo: €{generalSettings.waterQuotaPrice.toFixed(2)}/quota
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {waterQuotas.map(user => {
                                                    const cost = user.count * (generalSettings?.waterQuotaPrice || 0);
                                                    return (
                                                        <div key={user.id} className="bg-white/80 backdrop-blur-sm p-2 rounded-lg border border-blue-100 flex flex-col shadow-sm">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-bold text-slate-700">{user.name}</span>
                                                                <div className="flex items-center gap-1 bg-blue-100 px-2 py-0.5 rounded-full">
                                                                    <span className="text-xs font-black text-blue-700">{user.count}</span>
                                                                </div>
                                                            </div>
                                                            {cost > 0 && (
                                                                <div className="text-right border-t border-slate-100 pt-1">
                                                                    <span className="text-[10px] font-bold text-slate-400">Tot: </span>
                                                                    <span className="text-xs font-black text-blue-600">€{cost.toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4 text-sm md:text-base font-black text-slate-500 uppercase text-center tracking-wider bg-slate-100/50 py-2 rounded-lg relative overflow-hidden">
                                    <span className="relative z-10">
                                        {selectedStaffId ? `Storico di ${selectedStaffMember?.name}` : 'Storico Completo Cassa'}
                                    </span>
                                </div>
                                <OrderHistory 
                                    orders={ordersForHistory} 
                                    staff={staffForShift} 
                                    attendanceRecords={attendanceRecords} 
                                    tillId={till.id}
                                    generalSettings={generalSettings}
                                />
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
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
