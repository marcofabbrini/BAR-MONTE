
import React, { useState } from 'react';
import { Product } from '../types';
import { BoxIcon, SaveIcon } from './Icons';

interface StockControlProps {
    products: Product[];
    onStockPurchase: (productId: string, quantity: number, unitCost: number) => Promise<void>;
}

const StockControl: React.FC<StockControlProps> = ({ products, onStockPurchase }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [purchaseForm, setPurchaseForm] = useState({ quantity: 0, cost: 0 });

    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleOpenPurchase = (product: Product) => {
        setSelectedProduct(product.id);
        setPurchaseForm({ quantity: 0, cost: product.costPrice || 0 });
    };

    const handleConfirmPurchase = async () => {
        if (!selectedProduct) return;
        if (purchaseForm.quantity <= 0 || purchaseForm.cost < 0) {
            alert("Inserire quantità e costo validi.");
            return;
        }
        await onStockPurchase(selectedProduct, purchaseForm.quantity, purchaseForm.cost);
        setSelectedProduct(null);
        setPurchaseForm({ quantity: 0, cost: 0 });
    };

    const currentProduct = products.find(p => p.id === selectedProduct);
    const totalExpense = purchaseForm.quantity * purchaseForm.cost;
    const margin = currentProduct ? currentProduct.price - purchaseForm.cost : 0;
    const markupPercent = currentProduct && purchaseForm.cost > 0 ? ((currentProduct.price - purchaseForm.cost) / purchaseForm.cost) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input type="text" placeholder="Cerca prodotto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            {selectedProduct && currentProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-fade-in-up">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BoxIcon className="h-6 w-6 text-primary" /> Acquisto: {currentProduct.name}
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Quantità da Caricare</label>
                                <input type="number" value={purchaseForm.quantity} onChange={e => setPurchaseForm({...purchaseForm, quantity: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border rounded-lg p-3 text-lg font-bold" autoFocus />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Costo Unitario Acquisto (€)</label>
                                <input type="number" step="0.01" value={purchaseForm.cost} onChange={e => setPurchaseForm({...purchaseForm, cost: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border rounded-lg p-3 text-lg font-bold" />
                            </div>

                            <div className="bg-slate-100 p-4 rounded-xl space-y-2 text-sm">
                                <div className="flex justify-between"><span>Spesa Totale:</span> <span className="font-bold text-red-500">-€{totalExpense.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Prezzo Vendita:</span> <span className="font-bold">€{currentProduct.price.toFixed(2)}</span></div>
                                <div className="border-t border-slate-200 pt-2 flex justify-between">
                                    <span>Margine Guadagno:</span> 
                                    <span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        €{margin.toFixed(2)} ({markupPercent.toFixed(0)}%)
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setSelectedProduct(null)} className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300">Annulla</button>
                            <button onClick={handleConfirmPurchase} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark flex items-center justify-center gap-2"><SaveIcon className="h-5 w-5" /> Conferma</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center group">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl bg-slate-50 p-2 rounded-lg">{p.icon || '📦'}</span>
                            <div>
                                <h3 className="font-bold text-slate-800">{p.name}</h3>
                                <div className="flex gap-2 text-xs text-slate-500">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded">Stock: <b>{p.stock}</b></span>
                                    <span className="bg-slate-100 px-2 py-0.5 rounded">Costo: <b>€{p.costPrice?.toFixed(2) || '0.00'}</b></span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleOpenPurchase(p)} className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                            + Acquista
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default StockControl;
