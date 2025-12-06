import React from 'react';
import { OrderItem, StaffMember } from '../types';

interface OrderSummaryProps {
    orderItems: OrderItem[];
    onUpdateQuantity: (productId: string, newQuantity: number) => void;
    onClear: () => void;
    onComplete: () => void;
    selectedStaff: StaffMember | undefined;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ orderItems, onUpdateQuantity, onClear, onComplete, selectedStaff }) => {
    const total = orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const isCompletable = orderItems.length > 0 && !!selectedStaff;

    const EmptyOrder = () => (
        <div className="flex flex-col items-center justify-center h-full text-slate-300 p-8 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="font-medium text-slate-400">Nessun prodotto</p>
            <p className="text-xs mt-1">Seleziona i prodotti dalla lista per iniziare un ordine.</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white md:bg-transparent">
            {/* Handle for mobile */}
            <div className="md:hidden w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Riepilogo</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    {selectedStaff ? (
                         <p className="text-xs font-medium text-slate-600">
                            Utente: <span className="text-primary font-bold">{selectedStaff.name}</span>
                         </p>
                    ) : (
                        <p className="text-xs font-bold text-red-500 animate-pulse">
                            Seleziona un utente
                        </p>
                    )}
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto px-6 py-2">
                {orderItems.length === 0 ? (
                    <EmptyOrder />
                ) : (
                    <div className="space-y-3">
                        {orderItems.map(item => (
                            <div key={item.product.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">{item.product.name}</p>
                                    <p className="text-xs text-slate-400">€{item.product.price.toFixed(2)} cad.</p>
                                </div>
                                <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-100 p-1">
                                    <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                    </button>
                                    <span className="w-8 text-center font-bold text-slate-800 text-sm">{item.quantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-primary hover:bg-orange-50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 mt-auto">
                <div className="flex justify-between items-end mb-6">
                    <span className="text-slate-500 font-medium">Totale</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">€{total.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    <button
                        onClick={onClear}
                        disabled={orderItems.length === 0}
                        className="col-span-1 h-14 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Svuota Carrello"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <button
                        onClick={onComplete}
                        disabled={!isCompletable}
                        className={`col-span-3 h-14 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all duration-300
                            ${isCompletable 
                                ? 'bg-gradient-to-r from-primary to-secondary hover:shadow-glow hover:-translate-y-0.5' 
                                : 'bg-slate-300 cursor-not-allowed shadow-none'
                            }
                        `}
                    >
                        <span>Conferma Acquisto</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;