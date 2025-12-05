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
        <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-lg">L'ordine è vuoto</p>
            <p className="text-sm">Aggiungi prodotti e seleziona un operatore</p>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-2xl font-bold text-slate-800">Riepilogo Ordine</h2>
                {selectedStaff ? (
                     <p className="text-sm text-slate-600 mt-1">
                        Operatore: <span className="font-semibold">{selectedStaff.name}</span>
                     </p>
                ) : (
                    <p className="text-sm text-red-500 mt-1">
                        Nessun operatore selezionato
                    </p>
                )}
            </div>
            
            {orderItems.length === 0 ? (
                <EmptyOrder />
            ) : (
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {orderItems.map(item => (
                        <div key={item.product.id} className="flex justify-between items-center mb-3 p-2 bg-slate-50 rounded-lg">
                            <div>
                                <p className="font-semibold text-slate-700">{item.product.name}</p>
                                <p className="text-sm text-slate-500">€{item.product.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 bg-slate-200 rounded-full text-lg font-bold flex items-center justify-center hover:bg-red-200 transition-colors">-</button>
                                <span className="w-8 text-center font-semibold text-lg text-slate-800">{item.quantity}</span>
                                <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 bg-slate-200 rounded-full text-lg font-bold flex items-center justify-center hover:bg-green-200 transition-colors">+</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-auto border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center text-2xl font-bold mb-4">
                    <span className="text-slate-600">Totale:</span>
                    <span className="text-primary-dark">€{total.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onClear}
                        disabled={orderItems.length === 0}
                        className="w-full py-3 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        Svuota
                    </button>
                    <button
                        onClick={onComplete}
                        disabled={!isCompletable}
                        className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        Conferma Acquisto
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSummary;