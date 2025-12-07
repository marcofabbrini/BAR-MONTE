import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { BoxIcon, SaveIcon, EditIcon } from './Icons';

interface StockControlProps {
    products: Product[];
    onStockPurchase: (productId: string, quantity: number, unitCost: number) => Promise<void>;
    onStockCorrection: (productId: string, newStock: number) => Promise<void>;
}

const StockControl: React.FC<StockControlProps> = ({ products, onStockPurchase, onStockCorrection }) => {
    // FILTRI E ORDINAMENTO
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortOption, setSortOption] = useState<'nameAsc' | 'nameDesc' | 'stockAsc' | 'stockDesc' | 'dateDesc' | 'dateAsc' | 'admin'>('nameAsc');

    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'purchase' | 'correction'>('purchase');
    const [purchaseForm, setPurchaseForm] = useState({ quantity: 0, cost: 0 });
    const [correctionStock, setCorrectionStock] = useState(0);

    // Estrai categorie uniche
    const categories = useMemo(() => ['all', ...new Set(products.map(p => p.category))], [products]);

    // Logica Filtri e Ordinamento
    const processedProducts = useMemo(() => {
        let result = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (selectedCategory !== 'all') {
            result = result.filter(p => p.category === selectedCategory);
        }

        return result.sort((a, b) => {
            switch (sortOption) {
                case 'nameAsc': return a.name.localeCompare(b.name);
                case 'nameDesc': return b.name.localeCompare(a.name);
                case 'stockAsc': return a.stock - b.stock;
                case 'stockDesc': return b.stock - a.stock;
                case 'dateDesc': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                case 'dateAsc': return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                case 'admin': return (a.createdBy || '').localeCompare(b.createdBy || '');
                default: return 0;
            }
        });
    }, [products, searchTerm, selectedCategory, sortOption]);

    const handleOpenAction = (product: Product, type: 'purchase' | 'correction') => {
        setSelectedProduct(product.id);
        setActionType(type);
        if (type === 'purchase') {
            setPurchaseForm({ quantity: 0, cost: product.costPrice || 0 });
        } else {
            setCorrectionStock(product.stock);
        }
    };

    const handleConfirm = async () => {
        if (!selectedProduct) return;
        if (actionType === 'purchase') {
            if (purchaseForm.quantity <= 0 || purchaseForm.cost < 0) return alert("Dati non validi.");
            await onStockPurchase(selectedProduct, purchaseForm.quantity, purchaseForm.cost);
        } else {
            await onStockCorrection(selectedProduct, correctionStock);
        }
        setSelectedProduct(null);
    };

    const currentProduct = products.find(p => p.id === selectedProduct);
    const totalExpense = purchaseForm.quantity * purchaseForm.cost;
    const margin = currentProduct ? currentProduct.price - purchaseForm.cost : 0;
    const markupPercent = currentProduct && purchaseForm.cost > 0 ? ((currentProduct.price - purchaseForm.cost) / purchaseForm.cost) * 100 : 0;

    return (
        <div className="space-y-6">
            
            {/* BARRA DEGLI STRUMENTI (FILTRI) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                <div className="flex-grow">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Cerca</label>
                    <input type="text" placeholder="Nome prodotto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="w-full md:w-48">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Categoria</label>
                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm">
                        <option value="all">Tutte</option>
                        {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="w-full md:w-48">
                    <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Ordina per</label>
                    <select value={sortOption} onChange={e => setSortOption(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm">
                        <option value="nameAsc">Nome (A-Z)</option>
                        <option value="nameDesc">Nome (Z-A)</option>
                        <option value="stockAsc">Quantità (Crescente)</option>
                        <option value="stockDesc">Quantità (Decrescente)</option>
                        <option value="dateDesc">Più Recenti</option>
                        <option value="dateAsc">Meno Recenti</option>
                        <option value="admin">Admin Inserimento</option>
                    </select>
                </div>
            </div>

            {/* MODALE AZIONI */}
            {selectedProduct && currentProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-fade-in-up">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BoxIcon className="h-6 w-6 text-primary" /> {actionType === 'purchase' ? 'Nuovo Acquisto' : 'Modifica Stock'}: {currentProduct.name}
                        </h3>
                        {actionType === 'purchase' ? (
                            <div className="space-y-4">
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Quantità da Caricare (+)</label><input type="number" value={purchaseForm.quantity} onChange={e => setPurchaseForm({...purchaseForm, quantity: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border rounded-lg p-3 text-lg font-bold" autoFocus /></div>
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Costo Unitario (€)</label><input type="number" step="0.01" value={purchaseForm.cost} onChange={e => setPurchaseForm({...purchaseForm, cost: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border rounded-lg p-3 text-lg font-bold" /></div>
                                <div className="bg-slate-100 p-4 rounded-xl space-y-2 text-sm">
                                    <div className="flex justify-between"><span>Spesa Totale:</span> <span className="font-bold text-red-500">-€{totalExpense.toFixed(2)}</span></div>
                                    <div className="border-t border-slate-200 pt-2 flex justify-between"><span>Margine:</span> <span className={`font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>€{margin.toFixed(2)} ({markupPercent.toFixed(0)}%)</span></div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase">Quantità Attuale</label><input type="number" value={correctionStock} onChange={e => setCorrectionStock(parseInt(e.target.value) || 0)} className="w-full bg-slate-50 border rounded-lg p-3 text-lg font-bold" autoFocus /></div>
                                <p className="text-xs text-slate-500">Modificando questo valore sovrascriverai la quantità senza registrare una spesa.</p>
                            </div>
                        )}
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setSelectedProduct(null)} className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300">Annulla</button>
                            <button onClick={handleConfirm} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark flex items-center justify-center gap-2"><SaveIcon className="h-5 w-5" /> Conferma</button>
                        </div>
                    </div>
                </div>
            )}

            {/* GRIGLIA PRODOTTI FILTRATA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedProducts.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 group hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl bg-slate-50 p-2 rounded-lg">{p.icon || '📦'}</span>
                            <div className="flex-grow">
                                <h3 className="font-bold text-slate-800">{p.name}</h3>
                                <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                                    <span className="bg-slate-100 px-2 py-1 rounded">Stock: <b>{p.stock}</b></span>
                                    <span className="bg-slate-100 px-2 py-1 rounded">Costo: <b>€{p.costPrice?.toFixed(2) || '0.00'}</b></span>
                                </div>
                                {(p.createdAt || p.createdBy) && (
                                    <p className="text-[9px] text-slate-400 mt-1 truncate">
                                        Ins: {p.createdBy ? p.createdBy.split('@')[0] : 'N/D'} il {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/D'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-auto">
                             <button onClick={() => handleOpenAction(p, 'purchase')} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg font-bold text-xs transition-colors">+ Acquista</button>
                             <button onClick={() => handleOpenAction(p, 'correction')} className="w-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"><EditIcon className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
                {processedProducts.length === 0 && <p className="col-span-full text-center text-slate-400 py-10">Nessun prodotto trovato con questi filtri.</p>}
            </div>
        </div>
    );
};
export default StockControl;