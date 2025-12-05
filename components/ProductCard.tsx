import React from 'react';
import { Product } from '../types';
import { StarIcon } from './Icons';

// FIX: Define props interface for ProductCard component.
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
            className={`bg-white border border-slate-200 rounded-lg p-3 text-center flex flex-col justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary relative group ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105 hover:shadow-lg hover:border-primary-light'}`}
        >
            {product.isFavorite && (
                 <StarIcon filled className="absolute top-2 right-2 h-5 w-5 text-amber-400" />
            )}
            {outOfStock && (
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full z-10">ESAURITO</span>
            )}
            <div className="flex-grow flex flex-col justify-center min-h-[4rem]">
                <h3 className="font-semibold text-slate-700 text-base">{product.name}</h3>
            </div>
            <div>
                 <p className="text-primary-dark font-bold text-lg mt-2">€{product.price.toFixed(2)}</p>
                 <p className="text-xs text-slate-400 mt-2">Disponibili: {product.stock}</p>
            </div>
        </button>
    );
};

export default ProductCard;