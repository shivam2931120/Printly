import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { Product, PRODUCT_CATEGORIES } from '../../types';
import { fetchProducts } from '../../services/data';

interface StudentShopProps {
 onAddToCart: (product: Product) => void;
}

export const StudentShop: React.FC<StudentShopProps> = ({ onAddToCart }) => {
 const [products, setProducts] = useState<Product[]>([]);
 const [selectedCategory, setSelectedCategory] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [isLoading, setIsLoading] = useState(true);

 useEffect(() => {
 const loadProducts = async () => {
 setIsLoading(true);
 try {
 const data = await fetchProducts();
 setProducts(data);
 } catch (error) {
 console.error("Failed to load products", error);
 } finally {
 setIsLoading(false);
 }
 };
 loadProducts();
 }, []);

 const filteredProducts = products.filter(p => {
 const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
 const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
 return matchesCategory && matchesSearch;
 });

 return (
 <div className="space-y-8">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h2 className="text-3xl font-black text-foreground ">Campus Store</h2>
 <p className="text-foreground-muted mt-1">
 Essentials, stationery, and merchandise
 </p>
 </div>

 <div className="relative">
 <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
 <input
 type="text"
 placeholder="Search items..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-10 pr-4 py-2 bg-background-card border border-border rounded-2xl shadow-2xl text-sm text-foreground focus:ring-2 focus:ring-primary w-full md:w-64"
 />
 </div>
 </div>

 {/* Categories */}
 <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
 <button
 onClick={() => setSelectedCategory('all')}
 className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === 'all'
 ? 'bg-background-card bg-background-card text-foreground '
 : 'bg-background-card text-foreground-muted border border-border hover:border-border'
 }`}
 >
 All Items
 </button>
 {PRODUCT_CATEGORIES.map(cat => (
 <button
 key={cat.id}
 onClick={() => setSelectedCategory(cat.id)}
 className={`px-4 py-2 text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${selectedCategory === cat.id
 ? 'bg-background-card bg-background-card text-foreground '
 : 'bg-background-card text-foreground-muted border border-border hover:border-border'
 }`}
 >
 <Icon name={cat.icon} />
 {cat.name}
 </button>
 ))}
 </div>

 {/* Product Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
 {filteredProducts.map(product => (
 <div key={product.id} className="group bg-background-card border border-border rounded-2xl shadow-2xl overflow-hidden /5 hover:border-primary/50 transition-all duration-300">
 <div className="h-48 bg-background-subtle flex items-center justify-center text-6xl text-foreground-muted relative overflow-hidden">
 {product.image?.startsWith('http') || product.image?.startsWith('/') ? (
 <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
 ) : (
 <Icon name={product.image || 'inventory_2'} className="text-6xl" />
 )}
 {product.stock < 5 && product.stock > 0 && (
 <span className="absolute top-2 right-2 bg-orange-900/20 text-foreground text-[10px] font-bold px-2 py-0.5 ">
 Low Stock
 </span>
 )}
 {product.stock === 0 && (
 <div className="absolute inset-0 bg-background-card/60 flex items-center justify-center">
 <span className="bg-background-card text-foreground font-bold px-3 py-1 text-sm">
 Out of Stock
 </span>
 </div>
 )}
 </div>
 <div className="p-5">
 <div className="mb-2">
 <span className="text-xs font-bold text-primary uppercase tracking-wider">
 {PRODUCT_CATEGORIES.find(c => c.id === product.category)?.name}
 </span>
 <h3 className="text-lg font-bold text-foreground leading-tight mt-1 line-clamp-1">
 {product.name}
 </h3>
 </div>
 <p className="text-sm text-foreground-muted line-clamp-2 mb-4 h-10">
 {product.description}
 </p>
 <div className="flex items-center justify-between">
 <span className="text-xl font-black text-foreground ">
 ₹{product.price}
 </span>
 <button
 onClick={() => onAddToCart(product)}
 disabled={product.stock === 0}
 className="size-10 bg-background-card bg-background-card text-foreground flex items-center justify-center hover:bg-primary hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors "
 >
 <Icon name="add_shopping_cart" />
 </button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {filteredProducts.length === 0 && (
 <div className="text-center py-20">
 <Icon name="storefront" className="text-6xl text-foreground-secondary mb-4" />
 <h3 className="text-xl font-bold text-foreground ">No products found</h3>
 <p className="text-foreground-muted ">Try adjusting your search or category</p>
 </div>
 )}
 </div>
 );
};
