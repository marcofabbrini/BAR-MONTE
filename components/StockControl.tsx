
import React, { useState } from 'react';
import { Product } from '../types';

interface StockControlProps {
    products: Product[];
    onUpdateProduct: (product: Product) => Promise<void>;
}

const StockControl: React.FC<StockControlProps> = ({ products, onUpdateProduct }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleStockChange = async (product: Product, change: number) => {
        const newStock = Math.max(0, product.stock + change);
        await onUpdateProduct({ ...product, stock: newStock });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <input type="text" placeholder="Cerca prodotto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{p.icon || '📦'}</span>
                            <div>
                                <h3 className="font-bold text-slate-800">{p.name}</h3>
                                <p className="text-xs text-slate-500">Attuale: <span className="font-bold text-slate-800">{p.stock}</span></p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                             <button onClick={() => handleStockChange(p, -1)} className="w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold hover:bg-red-200">-</button>
                             <button onClick={() => handleStockChange(p, 1)} className="w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold hover:bg-green-200">+</button>
                             <button onClick={() => handleStockChange(p, 10)} className="w-8 h-8 rounded-full bg-green-50 text-green-600 font-bold text-xs hover:bg-green-100">+10</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default StockControl;
