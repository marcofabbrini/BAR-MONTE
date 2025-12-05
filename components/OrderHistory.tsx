import React from 'react';
import { Order } from '../types';

interface OrderHistoryProps {
    orders: Order[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders }) => {
    
    if (orders.length === 0) {
        return (
            <div className="text-center text-slate-400 mt-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-lg">Nessun ordine completato.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {orders.map(order => (
                <div key={order.id} className="bg-white rounded-lg p-4 shadow-md border border-slate-200">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2 mb-3">
                        <div>
                            <p className="text-sm text-slate-500">Ordine #{order.id.slice(-6)}</p>
                            <p className="text-sm text-slate-500">
                                {new Date(order.timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(order.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {order.staffName && <p className="text-sm text-slate-500">Operatore: <span className="font-medium">{order.staffName}</span></p>}
                        </div>
                        <p className="text-xl font-bold text-primary">€{order.total.toFixed(2)}</p>
                    </div>
                    <ul className="space-y-1">
                        {order.items.map(item => (
                            <li key={item.product.id} className="flex justify-between text-slate-700">
                                <span>{item.quantity} x {item.product.name}</span>
                                <span>€{(item.product.price * item.quantity).toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default OrderHistory;