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
    onUpdateProducts: (products: Product[]) => void;
    allStaff: StaffMember[];
    allOrders: Order[];
    onCompleteOrder: (newOrder: Order) => void;
}

const TillView: React.FC<TillViewProps> = ({ till, onGoBack, products, onUpdateProducts, allStaff, allOrders, onCompleteOrder }) => {
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

    const completeOrder = useCallback(() => {
        if (currentOrder.length === 0 || !selectedStaffId) return;

        const total = currentOrder.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const newOrder: Order = {
            id: new Date().toISOString(),
            items: currentOrder,
            total,
            timestamp: new Date().toISOString(),
            staffId: selectedStaffId,
            staffName: selectedStaffMember?.name,
            tillId: till.id,
        };
        onCompleteOrder(newOrder);

        const updatedProducts = products.map(p => {
            const itemInOrder = currentOrder.find(item => item.product.id === p.id);
            if (itemInOrder) {
                const newStock = p.stock - itemInOrder.quantity;
                return { ...p, stock: newStock < 0 ? 0 : newStock };
            }
            return p;
        });
        onUpdateProducts(updatedProducts);

        clearOrder();
    }, [currentOrder, clearOrder, products, onUpdateProducts, selectedStaffId, selectedStaffMember, till.id, onCompleteOrder]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-white shadow-md p-4 flex justify-between items-center z-10 border-b border-slate-200 sticky top-0">
                 <button
                    onClick={onGoBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 hover:text-primary transition-colors duration-200"
                    aria-label="Torna alla selezione casse"
                >
                    <BackArrowIcon className="h-6 w-6" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">{till.name}</h1>
                <div className="w-40 text-right">
                    <span className="text-sm text-slate-500">Turno: {till.shift.toUpperCase()}</span>
                </div>
            </header>
            
            <div className="flex-grow flex md:flex-row flex-col-reverse">
                <main className="flex-grow p-4 md:p-6">
                     <div className="flex items-center mb-6 border-b border-slate-200">
                        <button onClick={() => setActiveTab('order')} className={`px-6 py-3 text-lg font-medium transition-colors duration-200 ${activeTab === 'order' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}>
                            Nuovo Ordine
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`px-6 py-3 text-lg font-medium transition-colors duration-200 ${activeTab === 'history' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}>
                            Storico Ordini
                        </button>
                    </div>

                    {activeTab === 'order' && (
                        <div>
                            <div className="mb-6">
                                <label htmlFor="staff-select" className="block text-sm font-medium text-slate-700 mb-2">Seleziona Operatore:</label>
                                <select 
                                    id="staff-select"
                                    value={selectedStaffId}
                                    onChange={(e) => setSelectedStaffId(e.target.value)}
                                    className="w-full max-w-sm p-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                                >
                                    <option value="" disabled>-- Seleziona un operatore --</option>
                                    {staffForShift.map(staff => (
                                        <option key={staff.id} value={staff.id}>{staff.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {sortedProducts.map(product => (
                                    <ProductCard key={product.id} product={product} onAddToCart={addToOrder} />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'history' && <OrderHistory orders={ordersForThisTill} />}
                </main>

                <aside className="w-full md:w-96 lg:w-1/3 bg-white p-4 flex flex-col shadow-lg border-l border-slate-200 md:sticky md:top-[72px] md:h-[calc(100vh-72px)]">
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