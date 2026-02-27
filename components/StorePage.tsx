import React, { useState, useEffect, useRef } from 'react';
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
    Check,
    Plus,
    Filter,
    X
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Product, PRODUCT_CATEGORIES } from '../types';
import { fetchProducts } from '../services/data';
import { useCartStore } from '../store/useCartStore';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { cn } from '../lib/utils';
import { Magnetic } from './ui/Magnetic';

const SpotlightCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setOpacity(1)}
            onMouseLeave={() => setOpacity(0)}
            className={cn("relative overflow-hidden", className)}
        >
            <div
                className="pointer-events-none absolute -inset-px transition duration-300"
                style={{
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.06), transparent 40%)`,
                    opacity,
                }}
            />
            {children}
        </div>
    );
};

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

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring" as const,
                stiffness: 260,
                damping: 20
            }
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 relative">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={16} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-background-card border border-border text-sm text-white focus:outline-none focus:border-[#333]"
                    />
                </div>
                <button
                    onClick={() => setIsMobileFilterOpen(true)}
                    className="p-2.5 bg-background-card border border-border text-[#666] hover:text-white"
                >
                    <Filter size={20} />
                </button>
            </div>

            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isMobileFilterOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[40] lg:hidden"
                        onClick={() => setIsMobileFilterOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Filters */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-background-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-[calc(100vh-100px)] lg:w-64 lg:bg-transparent lg:border-none lg:z-0 lg:sticky lg:top-24",
                isMobileFilterOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col p-6 lg:p-0 pt-20 lg:pt-0">
                    <div className="flex items-center justify-between mb-8 lg:hidden">
                        <span className="font-bold text-lg text-white font-display">Filters</span>
                        <button
                            onClick={() => setIsMobileFilterOpen(false)}
                            className="p-3 bg-[#111] text-white hover:bg-[#111] transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div className="hidden lg:block relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] group-focus-within:text-white transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-sm text-white focus:outline-none focus:border-[#333] transition-all font-medium"
                            />
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black text-[#666] uppercase tracking-[0.2em] ml-1">Categories</h3>
                            <div className="space-y-1">
                                <Magnetic strength={0.2}>
                                    <button
                                        onClick={() => setSelectedCategory('all')}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 text-sm font-bold transition-all text-left group",
                                            selectedCategory === 'all'
                                                ? "bg-red-600 text-white"
                                                : "text-[#666] hover:bg-[#111] hover:text-white"
                                        )}
                                    >
                                        <span>All Products</span>
                                        {selectedCategory === 'all' && <Check size={14} strokeWidth={3} />}
                                    </button>
                                </Magnetic>
                                {PRODUCT_CATEGORIES.map(cat => {
                                    const Icon = getCategoryIcon(cat.icon);
                                    return (
                                        <Magnetic key={cat.id} strength={0.2}>
                                            <button
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-3 py-2 text-sm font-bold transition-all text-left group",
                                                    selectedCategory === cat.id
                                                        ? "bg-red-600 text-white"
                                                        : "text-[#666] hover:bg-[#111] hover:text-white"
                                                )}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Icon size={16} className={cn("transition-transform duration-300", selectedCategory === cat.id ? "scale-110" : "opacity-50")} />
                                                    {cat.name}
                                                </span>
                                                {selectedCategory === cat.id && <Check size={14} strokeWidth={3} />}
                                            </button>
                                        </Magnetic>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:hidden pt-4">
                            <Button
                                onClick={() => setIsMobileFilterOpen(false)}
                                className="w-full bg-red-600 text-white font-black h-14 "
                            >
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Product Grid */}
            <div className="flex-1">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 flex items-baseline justify-between"
                >
                    <h1 className="text-3xl font-black text-white font-display tracking-tight">
                        {selectedCategory === 'all' ? 'All Products' : PRODUCT_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                    </h1>
                    <span className="text-[#666] text-[10px] font-black uppercase tracking-widest opacity-50">{filteredProducts.length} items available</span>
                </motion.div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="aspect-[3/4] bg-[#0A0A0A] border border-[#333] relative overflow-hidden">
                                <div className="absolute inset-0 shimmer" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {filteredProducts.map(product => (
                            <motion.div key={product.id} variants={itemVariants}>
                                <SpotlightCard
                                    className="group flex flex-col bg-[#0C0C0C] border border-[#333] overflow-hidden hover:border-[#333] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
                                >
                                    {/* Image Area */}
                                    <div className="aspect-[4/3] bg-[#0A0A0A] relative overflow-hidden">
                                        {product.image && (product.image.startsWith('http') || product.image.startsWith('/')) ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="h-full w-full object-cover transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-[#666]/30">
                                                <Package size={48} strokeWidth={1} />
                                            </div>
                                        )}

                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden lg:flex items-center justify-center p-6">
                                            <Magnetic strength={0.3}>
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); addToCartProduct(product); }}
                                                    disabled={product.stock === 0}
                                                    className="px-8 h-12 bg-red-600 text-white hover:bg-red-700 shadow-2xl font-black translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
                                                >
                                                    <Plus size={20} className="mr-2 stroke-[3]" />
                                                    Quick Add
                                                </Button>
                                            </Magnetic>
                                        </div>

                                        {product.stock === 0 && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                                <span className="bg-red-600 text-white px-4 py-2 text-[10px] uppercase font-black tracking-widest shadow-2xl">
                                                    Sold Out
                                                </span>
                                            </div>
                                        )}
                                        {product.stock < 5 && product.stock > 0 && (
                                            <span className="absolute top-4 right-4 bg-red-600 text-white text-[10px] uppercase font-black px-2.5 py-1.5 shadow-2xl z-20 animate-pulse">
                                                Only {product.stock} Left
                                            </span>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-6 flex flex-col flex-1 relative">
                                        <div className="mb-2">
                                            <h3 className="text-lg font-bold text-white line-clamp-1 transition-colors group-hover:text-primary tracking-tight" title={product.name}>
                                                {product.name}
                                            </h3>
                                            <p className="text-[10px] text-[#666] mt-2 uppercase font-black tracking-[0.15em] opacity-40">
                                                {product.category}
                                            </p>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between">
                                            <span className="text-2xl font-black text-white font-display">
                                                ₹{product.price}
                                            </span>
                                            <button
                                                onClick={() => addToCartProduct(product)}
                                                disabled={product.stock === 0}
                                                className="lg:hidden size-12 bg-red-600 flex items-center justify-center text-white shadow-xl active:scale-90 transition-transform disabled:opacity-20 hover:bg-red-700"
                                            >
                                                <Plus size={24} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {!isLoading && filteredProducts.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center border border-[#333] bg-[#0A0A0A]"
                    >
                        <div className="size-20 bg-[#111] flex items-center justify-center mb-6 shadow-inner">
                            <Search size={40} className="text-[#666] opacity-20" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">No matches found</h3>
                        <p className="text-[#666] text-sm max-w-xs mx-auto mb-8 font-medium">
                            We couldn't find any products matching your current filters.
                        </p>
                        <Button variant="outline" className=" border-[#333] text-white font-bold" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>
                            Clear all filters
                        </Button>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
