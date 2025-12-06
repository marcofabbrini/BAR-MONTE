
import React, { useState, useCallback, useMemo } from 'react';
import { Order, OrderItem, Till, Product, StaffMember, TillColors } from '../types';
import OrderSummary from './OrderSummary';
import OrderHistory from './OrderHistory';
import ProductCard from './ProductCard';
import { BackArrowIcon } from './Icons';

interface TillViewProps {
    till: Till;
    onGoBack: () => void;
    products: Product[];
    allStaff: StaffMember[];
    allOrders: Order[];
    onCompleteOrder: (newOrder: Omit<Order, 'id'>) => Promise<void>;
    tillColors?: TillColors;
}

const TillView: React.FC<TillViewProps> = ({ till, onGoBack, products, allStaff, allOrders, onCompleteOrder, tillColors }) => {
    const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
    const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isAnimatingSelection, setIsAnimatingSelection] = useState(false);

    const themeColor = tillColors ? (tillColors[till.id] || '#f97316') : '#f97316';

    const staffForShift = useMemo(() => allStaff.filter(s => s.shift === till.shift), [allStaff, till.shift]);
    const selectedStaffMember = useMemo(() => allStaff.find(s => s.id === selectedStaffId), [allStaff, selectedStaffId]);
    
    // Filtro storico: Se ho selezionato un utente, vedo solo i suoi ordini. Altrimenti tutti quelli della cassa.
    const ordersForHistory = useMemo(() => {
        const tillOrders = allOrders.filter(o => o.tillId === till.id);
        if (selectedStaffId) {
            return tillOrders.filter(o => o.staffId === selectedStaffId);
        }
        return tillOrders;
    }, [allOrders, till.id, selectedStaffId]);

    const favoriteProducts = useMemo(() => products.filter(p => p.isFavorite), [products]);
    const otherProducts = useMemo(() => products.filter(p => !p.isFavorite), [products]);

    const cartTotal = useMemo(() => currentOrder.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [currentOrder]);
    const cartItemCount = useMemo(() => currentOrder.reduce((sum, item) => sum + item.quantity, 0), [currentOrder]);

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
            await onCompleteOrder(newOrder);
            clearOrder();
        } catch (error) {
            console.error("Error completing order: ", error);
            alert("Errore nel completamento dell'ordine. Riprova.");
        }
    }, [currentOrder, cartTotal, selectedStaffId, selectedStaffMember, till.id, onCompleteOrder, clearOrder]);

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
        <div className="flex flex-col min-h-screen bg-slate-50 md:flex-row relative">
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 fixed">
                <span className="text-[300px] md:text-[500px] font-black text-slate-200/50 select-none">
                    {till.shift.toUpperCase()}
                </span>
            </div>

            <div className="flex-grow flex flex-col w-full md:w-auto min-h-screen z-10">
                <header className="sticky top-0 px-4 py-2 flex justify-between items-center shadow-sm z-30 border-b border-white/20 text-white transition-colors duration-300 backdrop-blur-md bg-opacity-90" style={{ backgroundColor: themeColor + 'E6' }}>
                     <div className="flex items-center gap-2">
                         <button onClick={onGoBack} className="group flex items-center gap-1 text-white/80 hover:text-white transition-colors">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-colors">
                                <BackArrowIcon className="h-5 w-5" />
                            </div>
                        </button>
                        <h1 className="text-sm font-bold tracking-tight">{till.name}</h1>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {selectedStaffId && selectedStaffMember && (
                            <button 
                                onClick={handleStaffDeselection}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-full pr-3 pl-1 py-1 transition-all animate-fade-in"
                            >
                                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-xs shadow-sm text-slate-800">
                                    {selectedStaffMember.icon || getInitials(selectedStaffMember.name)}
                                </div>
                                <span className="font-bold text-xs">{selectedStaffMember.name}</span>
                            </button>
                        )}
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-white/20 rounded-full">
                            <span className="text-[10px] font-bold uppercase tracking-wide">Turno {till.shift}</span>
                        </div>
                    </div>
                </header>
                
                <main className="flex-grow flex flex-col relative w-full pb-20 md:pb-4">
                    <div className="px-4 py-2 z-20 sticky top-[50px]">
                         <div className="bg-white/90 backdrop-blur p-1 rounded-xl shadow-sm inline-flex w-full md:w-auto border border-slate-100">
                            <button onClick={() => setActiveTab('order')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'order' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Acquista</button>
                            <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Storico</button>
                        </div>
                    </div>

                    <div className="px-4 w-full max-w-7xl mx-auto flex-grow">
                        {activeTab === 'order' && (
                            <div className="animate-fade-in-up">
                                {!selectedStaffId && (
                                    <div className={`mb-4 transition-all duration-300 ${isAnimatingSelection ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 px-1">Chi sei?</h3>
                                        {/* GRIGLIA UTENTI CON ANIMAZIONE ALONE ROSSO */}
                                        <div className={`grid grid-cols-4 sm:grid-cols-6 gap-3 p-4 rounded-xl ${!selectedStaffId ? 'animate-red-pulse' : ''}`}>
                                            {staffForShift.map(staff => (
                                                <button 
                                                    key={staff.id} 
                                                    onClick={() => handleStaffSelection(staff.id)}
                                                    className="group flex flex-col items-center gap-1"
                                                >
                                                    <div className="w-14 h-14 rounded-full bg-white shadow-md border-2 border-slate-100 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:border-primary transition-all">
                                                        {staff.icon || <span className="text-lg font-bold text-slate-600">{getInitials(staff.name)}</span>}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-600 group-hover:text-primary">{staff.name.split(' ')[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* GRIGLIA PREFERITI (Quadrati Grandi) */}
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

                                {/* LISTA ALTRI PRODOTTI - LAYOUT COMPATTO (Rettangolari) */}
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
                                <div className="mb-4 text-xs font-bold text-slate-400 uppercase text-center">
                                    {selectedStaffId ? `Storico di ${selectedStaffMember?.name}` : 'Storico Completo Cassa'}
                                </div>
                                <OrderHistory orders={ordersForHistory} staff={staffForShift} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            <div className={`md:hidden fixed bottom-0 left-0 w-full bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] border-t border-slate-200 z-50 transition-transform duration-300 ${activeTab === 'order' ? 'translate-y-0' : 'translate-y-full'}`}>
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
                <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-end animate-fade-in">
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
