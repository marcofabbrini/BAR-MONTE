import React from 'react';
import { Product } from '../types';
import { StarIcon } from './Icons';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
    const outOfStock = product.stock <= 0;

    return (
        <button
            onClick={() => onAddToCart(product)}
            disabled={outOfStock}
            className={`
                relative bg-white rounded-2xl p-4 text-left flex flex-col justify-between h-32 md:h-40
                transition-all duration-200 border border-transparent
                ${outOfStock 
                    ? 'opacity-60 cursor-not-allowed bg-slate-50' 
                    : 'shadow-sm hover:shadow-md hover:border-primary/30 hover:-translate-y-1 active:scale-95'
                }
            `}
        >
            {product.isFavorite && (
                 <div className="absolute top-3 right-3 text-amber-400 drop-shadow-sm">
                     <StarIcon filled className="h-5 w-5" />
                 </div>
            )}
            
            {outOfStock && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">Esaurito</span>
                </div>
            )}

            <div className="flex-grow pr-4">
                <h3 className="font-bold text-slate-700 text-sm md:text-base leading-tight mb-1">{product.name}</h3>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{product.category}</p>
            </div>

            <div className="flex justify-between items-end mt-2">
                 <p className="text-lg md:text-xl font-extrabold text-primary">€{product.price.toFixed(2)}</p>
                 <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${product.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                    {product.stock} pz
                 </span>
            </div>
        </button>
    );
};

export default ProductCard;