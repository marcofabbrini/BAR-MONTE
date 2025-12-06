
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
                relative bg-white rounded-2xl p-3 text-left flex flex-col items-center justify-between
                transition-all duration-200 border border-transparent
                h-36 md:h-44 group
                ${outOfStock 
                    ? 'opacity-60 cursor-not-allowed bg-slate-50' 
                    : 'shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 active:scale-95'
                }
            `}
        >
            {product.isFavorite && (
                 <div className="absolute top-2 right-2 text-amber-400 drop-shadow-sm z-10">
                     <StarIcon filled className="h-4 w-4" />
                 </div>
            )}
            
            {outOfStock && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-20">
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">Esaurito</span>
                </div>
            )}

            {/* Icona o Placeholder */}
            <div className="flex-grow flex items-center justify-center w-full mt-2">
                {product.icon ? (
                    <span className="text-5xl md:text-6xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform duration-200">{product.icon}</span>
                ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                        <span className="text-xl font-bold">{product.name.charAt(0)}</span>
                    </div>
                )}
            </div>

            {/* Dettagli */}
            <div className="w-full mt-2 text-center">
                <h3 className="font-bold text-slate-700 text-sm leading-tight truncate w-full px-1">{product.name}</h3>
                
                <div className="flex justify-center items-center gap-2 mt-1">
                     <p className="text-base font-black text-primary">€{product.price.toFixed(2)}</p>
                </div>
                 <p className={`text-[10px] font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${product.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                    {product.stock} disp.
                 </p>
            </div>
        </button>
    );
};

export default ProductCard;