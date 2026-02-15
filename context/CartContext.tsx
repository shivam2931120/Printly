import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, PrintOptions, PricingConfig } from '../types';

interface CartContextType {
    cart: CartItem[];
    isCartOpen: boolean;
    addToCartPrint: (files: { id: string; file: File; pageCount: number }[], options: PrintOptions, pricing: PricingConfig) => void;
    addToCartProduct: (product: Product) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    toggleCart: (isOpen?: boolean) => void;
    cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Calculate total
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const addToCartPrint = (
        files: { id: string; file: File; pageCount: number }[],
        options: PrintOptions,
        pricing: PricingConfig
    ) => {
        if (files.length === 0) return;

        const newItems: CartItem[] = files.map(f => {
            // Calculate per-file price
            let cost = 0;
            const baseRate = options.colorMode === 'color' ? pricing.perPageColor : pricing.perPageBW;
            const paperMultiplier = pricing.paperSizeMultiplier[options.paperSize];

            cost = f.pageCount * baseRate * options.copies * paperMultiplier;

            if (options.sides === 'double') cost -= (f.pageCount * pricing.doubleSidedDiscount * options.copies);
            if (pricing.paperTypeFees && pricing.paperTypeFees[options.paperType]) {
                cost += (f.pageCount * pricing.paperTypeFees[options.paperType] * options.copies);
            }
            if (pricing.bindingPrices[options.binding]) {
                cost += (pricing.bindingPrices[options.binding] * options.copies);
            }
            if (options.holePunch && pricing.holePunchPrice) {
                cost += (pricing.holePunchPrice * options.copies);
            }
            if (options.coverPage !== 'none' && pricing.coverPagePrice) {
                const sheets = options.coverPage === 'front_back' ? 2 : 1;
                cost += (sheets * pricing.coverPagePrice * options.copies);
            }
            cost += pricing.serviceFee;

            return {
                id: `print-${Date.now()}-${f.id}`,
                type: 'print',
                name: `Print: ${f.file.name}`,
                price: Math.max(0, cost),
                quantity: 1,
                fileName: f.file.name,
                pageCount: f.pageCount,
                options: { ...options },
                file: f.file
            } as CartItem; // Explicit cast to match union type if needed
        });

        setCart(prev => [...prev, ...newItems]);
        setIsCartOpen(true);
    };

    const addToCartProduct = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.type === 'product' && item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === existing.id
                        ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } // Price remains unit price
                        // Wait, logic check: in StudentPortal, I updated price? No, price in CartItem usually is unit price?
                        // Checking types.ts: BaseCartItem { price: number; quantity: number }
                        // Usually price is unit price. 
                        // In StudentPortal reducer:
                        // cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                        // So item.price MUST be unit price.
                        // Let's check my previous StudentPortal code for product add:
                        // { ...item, quantity: ..., price: product.price } -> Correct.
                        // But for Print Items, quantity is 1 (job), price is total job price.
                        // So logic holds.
                        : item
                );
            }
            return [...prev, {
                id: `prod-${product.id}-${Date.now()}`,
                type: 'product',
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image
            }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(item => item.id !== itemId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const toggleCart = (isOpen?: boolean) => {
        setIsCartOpen(prev => isOpen !== undefined ? isOpen : !prev);
    };

    return (
        <CartContext.Provider value={{
            cart,
            isCartOpen,
            addToCartPrint,
            addToCartProduct,
            removeFromCart,
            clearCart,
            toggleCart,
            cartTotal
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
