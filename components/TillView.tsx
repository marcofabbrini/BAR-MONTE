
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

    const themeColor = tillColors ? (tillColors[till.id] || '#f97316') : '#f97316';

    const staffForShift = useMemo(() => allStaff.filter(s => s.shift === till.shift), [allStaff, till.shift]);
    const selectedStaffMember = useMemo(() => allStaff.find(s => s.id === selectedStaffId), [allStaff, selectedStaffId]);
    const ordersForThisTill = useMemo(() => allOrders.filter(o => o.tillId === till.id), [allOrders, till.id]);

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    }, [products]);

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

    // Genera iniziali per utente
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 md:flex-row relative overflow-hidden">
             {/* WATERMARK SFONDO */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <span className="text-[400px] md:text-[600px] font-black text-slate-200/40 select-none">
                    {till.shift.toUpperCase()}
                </span>
            </div>

            <div className="flex-grow flex flex-col w-full md:w-auto min-h-screen z-10">
                {/* Header con colore dinamico e trasparenza */}
                <header className="sticky top-0 px-4 py-3 flex justify-between items-center shadow-sm z-30 border-b border-white/20 text-white transition-colors duration-300 backdrop-blur-md bg-opacity-90" style={{ backgroundColor: themeColor + 'E6' }}>
                     <div className="flex items-center gap-3">
                         <button onClick={onGoBack} className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center transition-colors">
                                <BackArrowIcon className="h-5 w-5" />
                            </div>
                        </button>
                        <h1 className="text-lg font-bold tracking-tight">{till.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                        <span className="text-xs font-bold uppercase tracking-wide">Turno {till.shift}</span>
                    </div>
                </header>
                
                <main className="flex-grow flex flex-col relative w-full pb-24 md:pb-8">
                    <div className="px-4 py-3 z-20 sticky top-[60px]">
                         <div className="bg-white/90 backdrop-blur p-1 rounded-xl shadow-sm inline-flex w-full md:w-auto border border-slate-100">
                            <button onClick={() => setActiveTab('order')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'order' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Nuovo Ordine</button>
                            <button onClick={() => setActiveTab('history')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Storico</button>
                        </div>
                    </div>

                    <div className="px-4 w-full max-w-7xl mx-auto flex-grow">
                        {activeTab === 'order' && (
                            <div className="animate-fade-in-up">
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 px-1">Seleziona Utente</h3>
                                    <div className="flex flex-wrap gap-4">
                                        {staffForShift.map(staff => (
                                            <button 
                                                key={staff.id} 
                                                onClick={() => setSelectedStaffId(staff.id)}
                                                className={`
                                                    group relative w-16 h-16 rounded-full flex items-center justify-center shadow-md border-2 transition-all duration-200
                                                    ${selectedStaffId === staff.id 
                                                        ? 'border-primary scale-110 opacity-100 ring-4 ring-primary/20' 
                                                        : 'border-white bg-white opacity-80 hover:opacity-100 hover:scale-105'
                                                    }
                                                `}
                                                title={staff.name}
                                            >
                                                <span className="text-2xl select-none">
                                                    {staff.icon || getInitials(staff.name)}
                                                </span>
                                                {selectedStaffId === staff.id && (
                                                    <span className="absolute -bottom-6 text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded-full whitespace-nowrap z-20">
                                                        {staff.name}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {sortedProducts.map(product => <ProductCard key={product.id} product={product} onAddToCart={addToOrder} />)}
                                </div>
                            </div>
                        )}
                        {activeTab === 'history' && (
                            <div className="max-w-3xl mx-auto bg-white/90 backdrop-blur rounded-2xl p-6 shadow-sm border border-slate-100">
                                <OrderHistory orders={ordersForThisTill} staff={staffForShift} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
            
            {/* Mobile Bar & Drawer */}
            <div className={`md:hidden fixed bottom-0 left-0 w-full bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] border-t border-slate-200 z-50 p-4 transition-transform duration-300 ${activeTab === 'order' ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-col"><span className="text-xs text-slate-500 font-bold uppercase">{cartItemCount} Articoli</span><span className="text-2xl font-black text-slate-800">€{cartTotal.toFixed(2)}</span></div>
                    <button onClick={() => setIsCartOpen(true)} disabled={cartItemCount === 0} className="text-white font-bold py-3 px-6 rounded-xl shadow-lg disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center gap-2" style={{ backgroundColor: themeColor }}><span>Vedi Ordine</span></button>
                </div>
            </div>
             {isCartOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-end animate-fade-in">
                    <div className="bg-slate-50 w-full h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
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
            <aside className="hidden md:flex sticky top-0 h-screen w-96 bg-white shadow-xl border-l border-slate-200 z-40 flex-col">
                <OrderSummary orderItems={currentOrder} onUpdateQuantity={updateQuantity} onClear={clearOrder} onComplete={completeOrder} selectedStaff={selectedStaffMember} />
            </aside>
        </div>
    );
};
export default TillView;
