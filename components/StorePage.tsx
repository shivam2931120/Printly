import React, { useState, useEffect } from 'react';
import {
    Search,
    ShoppingCart,
    Store as StoreIcon,
    Package,
    AlertCircle,
    BookOpen,
    PenTool,
    Palette,
    FileQuestion,
    Filter,
    X,
    Check
} from 'lucide-react';
import { Product, PRODUCT_CATEGORIES } from '../types';
import { fetchProducts } from '../services/data';
import { useCartStore } from '../store/useCartStore';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { cn } from '../lib/utils';

export const StorePage: React.FC = () => {
    const addToCartProduct = useCartStore((state) => state.addToCartProduct);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

    useEffect(() => {
        const loadProducts = async () => {
            setIsLoading(true);
            try {
                // Simulate network delay for skeleton test
                await new Promise(resolve => setTimeout(resolve, 800));
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

    const getCategoryIcon = (iconName: string) => {
        switch (iconName) {
            case 'menu_book': return BookOpen;
            case 'edit': return PenTool;
            case 'brush': return Palette;
            case 'quiz': return FileQuestion;
            default: return Package;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 animate-fade-in relative">

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-xl text-sm text-white focus:outline-none focus:border-white/20"
                    />
                </div>
                <button
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="p-2.5 bg-background-card border border-border rounded-xl text-text-muted hover:text-white"
                >
                    <Filter size={20} />
                </button>
            </div>

            {/* Sidebar Filters (Desktop & Mobile Drawer) */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-background-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-[calc(100vh-100px)] lg:w-64 lg:bg-transparent lg:border-none lg:z-0 lg:sticky lg:top-24",
                isMobileFilterOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col p-6 lg:p-0">
                    <div className="flex items-center justify-between mb-8 lg:hidden">
                        <span className="font-bold text-lg text-white font-display">Filters</span>
                        <button onClick={() => setIsMobileFilterOpen(false)}><X size={20} className="text-text-muted" /></button>
                    </div>

                    <div className="space-y-8">
                        {/* Search (Desktop) */}
                        <div className="hidden lg:block relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border rounded-xl text-sm text-white focus:outline-none focus:border-white/20 transition-colors"
                            />
                        </div>

                        {/* Categories */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Categories</h3>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                        selectedCategory === 'all'
                                            ? "bg-white text-black"
                                            : "text-text-secondary hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <span>All Products</span>
                                    {selectedCategory === 'all' && <Check size={14} />}
                                </button>
                                {PRODUCT_CATEGORIES.map(cat => {
                                    const Icon = getCategoryIcon(cat.icon);
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                                selectedCategory === cat.id
                                                    ? "bg-white text-black"
                                                    : "text-text-secondary hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Icon size={16} className="opacity-70" />
                                                {cat.name}
                                            </span>
                                            {selectedCategory === cat.id && <Check size={14} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Price Range (Placeholder) */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Price Range</h3>
                            <div className="px-1">
                                <div className="h-1 bg-border rounded-full overflow-hidden">
                                    <div className="h-full bg-white w-2/3" />
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-text-muted">
                                    <span>₹0</span>
                                    <span>₹1000+</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Mobile Backdrop */}
                {isMobileFilterOpen && (
                    <div className="fixed inset-0 bg-black/80 z-[-1] lg:hidden" onClick={() => setIsMobileFilterOpen(false)} />
                )}
            </aside>

            {/* Main Product Grid */}
            <div className="flex-1">
                {/* Header Info */}
                <div className="mb-6 flex items-baseline justify-between">
                    <h1 className="text-2xl font-bold text-white font-display">
                        {selectedCategory === 'all' ? 'All Products' : PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                    </h1>
                    <span className="text-text-muted text-sm">{filteredProducts.length} items</span>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="aspect-[3/4] rounded-2xl bg-background-card animate-pulse border border-border" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                className="group flex flex-col bg-background-card border border-border rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                            >
                                {/* Image Area */}
                                <div className="aspect-[4/3] bg-white/5 relative overflow-hidden">
                                    {product.image && (product.image.startsWith('http') || product.image.startsWith('/')) ? (
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-text-secondary">
                                            <Package size={40} strokeWidth={1} />
                                        </div>
                                    )}

                                    {/* Quick Add Overlay (Desktop) */}
                                    <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent hidden lg:flex justify-center">
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); addToCartProduct(product); }}
                                            disabled={product.stock === 0}
                                            size="sm"
                                            className="w-full bg-white text-black hover:bg-white/90 shadow-lg text-xs font-bold"
                                        >
                                            <Plus size={14} className="mr-1" />
                                            Add to Cart
                                        </Button>
                                    </div>

                                    {/* Stock Badges */}
                                    {product.stock === 0 && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                                            <span className="bg-background text-white border border-border px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider">
                                                Sold Out
                                            </span>
                                        </div>
                                    )}
                                    {product.stock < 5 && product.stock > 0 && (
                                        <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm">
                                            Only {product.stock} left
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 flex flex-col flex-1">
                                    <div className="mb-1">
                                        <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-text-primary transition-colors" title={product.name}>
                                            {product.name}
                                        </h3>
                                        <p className="text-xs text-text-muted mt-0.5 capitalize">
                                            {product.category}
                                        </p>
                                    </div>

                                    <div className="mt-auto pt-4 flex items-center justify-between">
                                        <span className="text-lg font-bold text-white">
                                            ₹{product.price}
                                        </span>
                                        {/* Mobile Add Button (Visible only on mobile/tablet or when hover not supported) */}
                                        <button
                                            onClick={() => addToCartProduct(product)}
                                            disabled={product.stock === 0}
                                            className="lg:hidden size-8 rounded-full bg-white flex items-center justify-center text-black disabled:opacity-50 disabled:bg-background-subtle disabled:text-text-muted"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isLoading && filteredProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-32 text-center border-2 border-dashed border-border rounded-3xl">
                        <div className="size-16 rounded-full bg-background-subtle flex items-center justify-center mb-4">
                            <Search size={32} className="text-text-muted opacity-50" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No matches found</h3>
                        <p className="text-text-muted text-sm max-w-xs mx-auto mb-6">
                            We couldn't find any products matching your current filters.
                        </p>
                        <Button variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                            Clear all filters
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
};
