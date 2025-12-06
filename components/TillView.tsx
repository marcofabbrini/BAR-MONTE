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

    const staffForShift = useMemo(() => allStaff.filter(s => s.shift === till.shift), [allStaff, till.shift]);
    const selectedStaffMember = useMemo(() => allStaff.find(s => s.id === selectedStaffId), [allStaff, selectedStaffId]);
    const ordersForThisTill = useMemo(() => allOrders.filter(o => o.tillId === till.id), [allOrders, till.id]);

    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
    }, [products]);

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
    }, []);

    const completeOrder = useCallback(async () => {
        if (currentOrder.length === 0 || !selectedStaffId) return;

        const total = currentOrder.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        
        const newOrder: Omit<Order, 'id'> = {
            items: currentOrder.map(item => ({
                product: {
                    id: item.product.id,
                    name: item.product.name,
                    price: item.product.price,
                    category: item.product.category,
                    description: item.product.description,
                    stock: item.product.stock,
                    isFavorite: item.product.isFavorite
                },
                quantity: item.quantity
            })),
            total,
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
        
    }, [currentOrder, clearOrder, selectedStaffId, selectedStaffMember, till.id, onCompleteOrder]);

    return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-slate-50">
            {/* Header Minimale */}
            <header className="bg-white px-6 py-3 flex justify-between items-center shadow-sm z-20 shrink-0">
                 <div className="flex items-center gap-4">
                     <button
                        onClick={onGoBack}
                        className="group flex items-center gap-2 text-slate-500 hover:text-primary transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-orange-50 flex items-center justify-center transition-colors">
                            <BackArrowIcon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium hidden md:block">Indietro</span>
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">{till.name}</h1>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Turno {till.shift}</span>
                </div>
            </header>
            
            <div className="flex flex-grow overflow-hidden relative">
                {/* Main Content Area */}
                <main className="flex-grow flex flex-col h-full overflow-hidden relative">
                    {/* Tab Navigation pill style */}
                    <div className="px-6 py-4 flex-shrink-0">
                         <div className="bg-white p-1 rounded-xl shadow-sm inline-flex border border-slate-100">
                            <button 
                                onClick={() => setActiveTab('order')} 
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'order' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                Nuovo Ordine
                            </button>
                            <button 
                                onClick={() => setActiveTab('history')} 
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'history' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                            >
                                Storico
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto px-6 pb-[48vh] md:pb-6 scroll-smooth">
                        {activeTab === 'order' && (
                            <div className="animate-fade-in-up">
                                <div className="mb-6 max-w-md">
                                    <label htmlFor="staff-select" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Operatore Attuale</label>
                                    <div className="relative">
                                        <select 
                                            id="staff-select"
                                            value={selectedStaffId}
                                            onChange={(e) => setSelectedStaffId(e.target.value)}
                                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                                        >
                                            <option value="" disabled>Seleziona chi sta usando la cassa</option>
                                            {staffForShift.map(staff => (
                                                <option key={staff.id} value={staff.id}>{staff.name}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {sortedProducts.map(product => (
                                        <ProductCard key={product.id} product={product} onAddToCart={addToOrder} />
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'history' && (
                            <div className="max-w-2xl">
                                <OrderHistory orders={ordersForThisTill} />
                            </div>
                        )}
                    </div>
                </main>

                {/* Sidebar / Bottom Sheet for Order Summary */}
                {/* On Mobile: Fixed at bottom. On Desktop: Fixed at right. */}
                <aside className="fixed bottom-0 left-0 w-full md:static md:w-96 lg:w-[400px] bg-white shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] md:shadow-none border-t md:border-l border-slate-200 z-30 h-[45vh] md:h-full flex flex-col transition-all duration-300">
                    <OrderSummary 
                        orderItems={currentOrder}
                        onUpdateQuantity={updateQuantity}
                        onClear={clearOrder}
                        onComplete={completeOrder}
                        selectedStaff={selectedStaffMember}
                    />
                </aside>
            </div>
        </div>
    );
};

export default TillView;