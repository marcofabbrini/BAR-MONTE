
import React, { useState, useCallback, useMemo } from 'react';
import { Order, OrderItem, Till, Product, StaffMember } from '../types';
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
}

const TillView: React.FC<TillViewProps> = ({ till, onGoBack, products, allStaff, allOrders, onCompleteOrder }) => {
    const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
    const [activeTab, setActiveTab] = useState<'order' | 'history'>('order');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [isCartOpen, setIsCartOpen] = useState(false); // Mobile cart modal state

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
                return prevOrder.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevOrder, { product, quantity: 1 }];
        });
    }, [products]);

    const updateQuantity = useCallback((productId: string, newQuantity: number) => {
        const productInStock = products.find(p => p.id === productId);
        const stock = productInStock ? productInStock.stock : 0;
        
        setCurrentOrder(prevOrder => {
            if (newQuantity <= 0) {
                return prevOrder.filter(item => item.product.id !== productId);
            }
            if (newQuantity > stock) {
                newQuantity = stock;
            }
            return prevOrder.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: newQuantity }
                    : item
            );
        });
    }, [products]);

    const clearOrder = useCallback(() => {
        setCurrentOrder([]);
        setIsCartOpen(false);
    }, []);

    const completeOrder = useCallback(async () => {
        if (currentOrder.length === 0 || !selectedStaffId) return;

        const newOrder: Omit<Order, 'id'> = {
            items: currentOrder.map(item => ({
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    category: item.product.category,
                    description: item.product.description,
                    stock: item.product.stock,
                    isFavorite: item.product.isFavorite,
                    icon: item.product.icon
                },
                quantity: item.quantity
            })),
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

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 md:flex-row">
            {/* Main Content Area */}
            <div className="flex-grow flex flex-col w-full md:w-auto">
                {/* Header */}
                <header className="sticky top-0 bg-white/95 backdrop-blur-sm px-4 py-3 flex justify-between items-center shadow-sm z-30 border-b border-slate-100">
                     <div className="flex items-center gap-3">
                         <button
                            onClick={onGoBack}
                            className="group flex items-center gap-2 text-slate-500 hover:text-primary transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-orange-50 flex items-center justify-center transition-colors">
                                <BackArrowIcon className="h-5 w-5" />
                            </div>
                        </button>
                        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{till.name}</h1>
                    </div>
                    
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:inline">Turno</span>
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">{till.shift}</span>
                    </div>
                </header>
                
                <main className="flex-grow flex flex-col relative w-full">
                    {/* Navigation Buttons */}
                    <div className="px-4 py-3 bg-slate-50 z-20 sticky top-[60px]">
                         <div className="bg-white p-1 rounded-xl shadow-sm inline-flex w-full md:w-auto border border-slate-100">
                            <button 
                                onClick={() => setActiveTab('order')} 
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'order' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                Nuovo Ordine
                            </button>
                            <button 
                                onClick={() => setActiveTab('history')} 
                                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                Storico
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-24 md:pb-8 w-full max-w-7xl mx-auto">
                        {activeTab === 'order' && (
                            <div className="animate-fade-in-up">
                                <div className="mb-4">
                                    <div className="relative">
                                        <select 
                                            value={selectedStaffId}
                                            onChange={(e) => setSelectedStaffId(e.target.value)}
                                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                                        >
                                            <option value="" disabled>Seleziona Operatore</option>
                                            {staffForShift.map(staff => (
                                                <option key={staff.id} value={staff.id}>{staff.name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                    {!selectedStaffId && (
                                        <p className="text-xs text-red-500 mt-1 font-bold ml-1 animate-pulse">
                                            ⚠ Seleziona un operatore per procedere
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                    {sortedProducts.map(product => (
                                        <ProductCard key={product.id} product={product} onAddToCart={addToOrder} />
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'history' && (
                            <div className="max-w-3xl mx-auto">
                                <OrderHistory orders={ordersForThisTill} />
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* MOBILE: Compact Bottom Bar */}
            <div className={`md:hidden fixed bottom-0 left-0 w-full bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] border-t border-slate-200 z-50 p-4 transition-transform duration-300 ${activeTab === 'order' ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500 font-bold uppercase">{cartItemCount} Articoli</span>
                        <span className="text-2xl font-black text-slate-800">€{cartTotal.toFixed(2)}</span>
                    </div>
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        disabled={cartItemCount === 0}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl shadow-lg disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center gap-2"
                    >
                        <span>Vedi Ordine</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>

            {/* MOBILE: Cart Modal Overlay */}
            {isCartOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-center items-end animate-fade-in">
                    <div className="bg-slate-50 w-full h-[85vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-white">
                            <h2 className="text-lg font-bold text-slate-800">Il tuo Ordine</h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                             <OrderSummary 
                                orderItems={currentOrder}
                                onUpdateQuantity={updateQuantity}
                                onClear={clearOrder}
                                onComplete={completeOrder}
                                selectedStaff={selectedStaffMember}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* DESKTOP: Sidebar */}
            <aside className="hidden md:flex sticky top-0 h-screen w-96 bg-white shadow-xl border-l border-slate-200 z-40 flex-col">
                <OrderSummary 
                    orderItems={currentOrder}
                    onUpdateQuantity={updateQuantity}
                    onClear={clearOrder}
                    onComplete={completeOrder}
                    selectedStaff={selectedStaffMember}
                />
            </aside>
        </div>
    );
};

export default TillView;