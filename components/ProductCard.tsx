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
                relative bg-white rounded-2xl p-3 text-left flex flex-col items-center
                transition-all duration-200 border border-transparent
                h-40 group
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
            <div className="flex-shrink-0 flex items-center justify-center mt-2 mb-2">
                {product.icon ? (
                    <span className="text-4xl md:text-5xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform duration-200 select-none">
                        {product.icon}
                    </span>
                ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 font-bold text-xl">
                        {product.name.charAt(0)}
                    </div>
                )}
            </div>

            {/* Dettagli - Flex Grow per spingere il prezzo in fondo se necessario, ma con limiti */}
            <div className="w-full flex flex-col items-center justify-between flex-grow overflow-hidden">
                <h3 
                    className="font-bold text-slate-700 text-sm leading-tight text-center w-full px-1 line-clamp-2 min-h-[2.5em]" 
                    title={product.name}
                >
                    {product.name}
                </h3>
                
                <div className="flex flex-col items-center mt-1">
                     <p className="text-base font-black text-primary">€{product.price.toFixed(2)}</p>
                     <p className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5 ${product.stock < 10 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                        {product.stock} disp.
                     </p>
                </div>
            </div>
        </button>
    );
};

export default ProductCard;