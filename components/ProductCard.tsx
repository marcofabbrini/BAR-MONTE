
import React from 'react';
import { Product } from '../types';
import { StarIcon, CheckIcon } from './Icons';

interface ProductCardProps {
    product: Product;
    onAddToCart: (product: Product) => void;
    inCart?: boolean;
    isCompact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, inCart, isCompact }) => {
    const outOfStock = product.stock <= 0;

    // Layout Compatto per i NON preferiti (Rettangolare)
    if (isCompact) {
        return (
            <button
                onClick={() => onAddToCart(product)}
                disabled={outOfStock}
                className={`
                    relative rounded-lg p-2 text-left flex items-center gap-2
                    transition-all duration-200 border border-transparent
                    h-14 group backdrop-blur-sm w-full
                    ${outOfStock 
                        ? 'opacity-60 cursor-not-allowed bg-slate-50/80' 
                        : 'bg-white/80 shadow-sm hover:shadow-md hover:border-primary/30 active:scale-95'
                    }
                `}
            >
                {inCart && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-red-500 rounded-tr-lg z-10">
                    </div>
                )}

                <div className="text-xl flex-shrink-0 w-6 text-center">
                    {product.icon || product.name.charAt(0)}
                </div>
                
                <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-slate-700 text-[10px] leading-tight truncate">{product.name}</h3>
                    <p className="text-xs font-black text-primary">€{product.price.toFixed(2)}</p>
                </div>
                
                <div className={`text-[8px] font-bold px-1 rounded ${product.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                    {product.stock}
                </div>
            </button>
        );
    }

    // Layout Standard per i Preferiti (Quadrato)
    return (
        <button
            onClick={() => onAddToCart(product)}
            disabled={outOfStock}
            className={`
                relative rounded-2xl p-2 text-left flex flex-col items-center
                transition-all duration-200 border border-transparent
                h-36 group backdrop-blur-sm
                ${outOfStock 
                    ? 'opacity-60 cursor-not-allowed bg-slate-50/80' 
                    : 'bg-white/80 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 active:scale-95'
                }
            `}
        >
            {/* Coccarda Angolo Rosso per "Nel Carrello" */}
            {inCart && (
                <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px] border-t-red-500 rounded-tr-2xl z-10 shadow-sm">
                </div>
            )}
            
            {product.isFavorite && !inCart && (
                 <div className="absolute top-2 right-2 text-amber-400 drop-shadow-sm z-10">
                     <StarIcon filled className="h-3 w-3" />
                 </div>
            )}
            
            {outOfStock && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-20">
                    <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">Esaurito</span>
                </div>
            )}

            <div className="flex-shrink-0 flex items-center justify-center mt-2 mb-1">
                {product.icon ? (
                    <span className="text-4xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform duration-200 select-none">
                        {product.icon}
                    </span>
                ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 font-bold text-lg">
                        {product.name.charAt(0)}
                    </div>
                )}
            </div>

            <div className="w-full flex flex-col items-center justify-between flex-grow overflow-hidden">
                <h3 className="font-bold text-slate-700 text-xs leading-tight text-center w-full px-1 line-clamp-2 min-h-[2.4em]" title={product.name}>
                    {product.name}
                </h3>
                
                <div className="flex flex-col items-center mt-1 w-full">
                     <p className="text-sm font-black text-primary">€{product.price.toFixed(2)}</p>
                     <p className={`text-[9px] leading-tight font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${product.stock < 10 ? 'bg-red-50/90 text-red-500' : 'bg-slate-50/90 text-slate-400'}`}>
                        {product.stock} disp.
                     </p>
                </div>
            </div>
        </button>
    );
};

export default ProductCard;
