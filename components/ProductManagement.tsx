import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { EditIcon, TrashIcon, PlusIcon, SaveIcon, StarIcon } from './Icons';

interface ProductManagementProps {
    products: Product[];
    onAddProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
    onUpdateProduct: (product: Product) => Promise<void>;
    onDeleteProduct: (productId: string) => Promise<void>;
}

const emptyProduct: Omit<Product, 'id'> = {
    name: '',
    price: 0,
    category: '',
    description: '',
    stock: 0,
    isFavorite: false,
};

const ProductManagement: React.FC<ProductManagementProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct }) => {
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Product, 'id'>>(emptyProduct);

    const categories = [...new Set(products.map(p => p.category))];

    useEffect(() => {
        if (isEditing) {
            const productToEdit = products.find(p => p.id === isEditing);
            if (productToEdit) {
                const { id, ...productData } = productToEdit;
                setFormData(productData);
            }
        } else {
            setFormData(emptyProduct);
        }
    }, [isEditing, products]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             setFormData(prev => ({ ...prev, [(e.target as HTMLInputElement).name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? parseFloat(value) || 0 : value }));
        }
    };
    
    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, category: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.category.trim()) return;

        try {
            if (isEditing) {
                await onUpdateProduct({ id: isEditing, ...formData });
            } else {
                await onAddProduct(formData);
            }
            setIsEditing(null);
            setFormData(emptyProduct);
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Errore nel salvataggio del prodotto.");
        }
    };

    const handleEdit = (id: string) => {
        setIsEditing(id);
        window.scrollTo(0, 0);
    };
    
    const handleDelete = async (id: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
            try {
                await onDeleteProduct(id);
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Errore nell'eliminazione del prodotto.");
            }
        }
    };
    
    const toggleFavorite = async (id: string) => {
        const product = products.find(p => p.id === id);
        if (product) {
            try {
                await onUpdateProduct({ ...product, isFavorite: !product.isFavorite });
            } catch (error) {
                console.error("Error updating favorite status:", error);
                alert("Errore nell'aggiornamento dello stato preferito.");
            }
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(null);
        setFormData(emptyProduct);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-lg mb-8 border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">{isEditing ? 'Modifica Prodotto' : 'Aggiungi Prodotto'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Nome Prodotto" className="bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary" required />
                    <input name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="Prezzo" className="bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary" required />
                    <input name="category" value={formData.category} onChange={handleCategoryChange} placeholder="Categoria" list="categories" className="bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary" required />
                    <datalist id="categories">
                        {categories.map(cat => <option key={cat} value={cat} />)}
                    </datalist>
                    <input name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="Quantità" className="bg-slate-100 text-slate-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-secondary" required />
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Descrizione" className="bg-slate-100 text-slate-800 rounded-md p-2 md:col-span-2 lg:col-span-3 focus:outline-none focus:ring-2 focus:ring-secondary" rows={1}></textarea>
                    <div className="flex items-center justify-center">
                        <label htmlFor="isFavorite" className="flex items-center gap-2 text-slate-600 cursor-pointer">
                            <input type="checkbox" name="isFavorite" id="isFavorite" checked={formData.isFavorite} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary" />
                            Preferito
                        </label>
                    </div>

                    <div className="md:col-span-2 lg:col-span-4 flex gap-4 mt-2">
                         <button type="submit" className="flex-grow bg-secondary hover:bg-secondary-dark text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2">
                           {isEditing ? <SaveIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
                           {isEditing ? 'Salva Modifiche' : 'Aggiungi Prodotto'}
                        </button>
                        {isEditing && <button type="button" onClick={handleCancelEdit} className="flex-grow bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded transition-colors">Annulla</button>}
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-x-auto border border-slate-200">
                <table className="w-full text-left text-slate-600">
                    <thead className="bg-slate-100 text-slate-800">
                        <tr>
                            <th className="p-3">Preferito</th>
                            <th className="p-3">Nome</th>
                            <th className="p-3">Categoria</th>
                            <th className="p-3">Prezzo</th>
                            <th className="p-3">Stock</th>
                            <th className="p-3">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id} className="border-b border-slate-200 hover:bg-slate-50">
                                <td className="p-3">
                                    <button onClick={() => toggleFavorite(p.id)} className={`transition-colors ${p.isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}>
                                       <StarIcon filled={p.isFavorite} className="h-6 w-6" />
                                    </button>
                                </td>
                                <td className="p-3 font-medium text-slate-900">{p.name}<p className="text-xs text-slate-500 font-normal">{p.description}</p></td>
                                <td className="p-3">{p.category}</td>
                                <td className="p-3">€{p.price.toFixed(2)}</td>
                                <td className="p-3">{p.stock}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEdit(p.id)} className="w-9 h-9 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-100 transition-colors" aria-label="Modifica">
                                            <EditIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(p.id)} className="w-9 h-9 flex items-center justify-center rounded-full text-red-600 hover:bg-red-100 transition-colors" aria-label="Elimina">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductManagement;