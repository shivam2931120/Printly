import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, PrintOptions, PricingConfig } from '../types';
import { calculatePrintPrice, calculateCartTotal } from '../lib/pricing';

interface CartState {
    cart: CartItem[];
    isCartOpen: boolean;

    // Actions
    addToCartPrint: (files: { id: string; file: File; pageCount: number }[], options: PrintOptions, pricing: PricingConfig) => void;
    addToCartProduct: (product: Product) => void;
    removeFromCart: (itemId: string) => void;
    updateQuantity: (itemId: string, delta: number) => void;
    clearCart: () => void;
    toggleCart: (isOpen?: boolean) => void;

    // Getters
    getCartTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            cart: [],
            isCartOpen: false,

            addToCartPrint: (files, options, pricing) => {
                const newItems: CartItem[] = files.map(f => {
                    // Calculate price for a SINGLE copy of this file with these options
                    // The quantity later multiplies this base price

                    // We need to calculate the price for ONE unit (which might have options.copies built in? 
                    // No, usually cart item quantity handles "number of identical jobs". 
                    // But PrintOptions has "copies". 
                    // Let's assume options.copies refers to "copies per set" inside the job, 
                    // and cart.quantity refers to "number of these jobs".
                    // However, standard e-commerce usually treats "quantity" as the multiplier.
                    // For logic consistency: calculatePrintPrice includes the `options.copies`.
                    // So we set cartItem.quantity to 1 initially.

                    // Update: Logic check. If I want 5 copies of a doc, do I set options.copies=5 or item.quantity=5?
                    // options.copies is specific to print settings (collated etc). 
                    // Let's trust calculatePrintPrice to handle the total cost of the 'Job'.

                    const jobPrice = calculatePrintPrice(options, f.pageCount, pricing);

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        type: 'print',
                        name: f.file.name,
                        fileName: f.file.name,
                        price: jobPrice,
                        quantity: 1, // distinct from options.copies
                        file: f.file,
                        options: options,
                        pageCount: f.pageCount
                    };
                });

                set((state) => ({
                    cart: [...state.cart, ...newItems],
                    isCartOpen: true
                }));
            },

            addToCartProduct: (product) => {
                set((state) => {
                    const existing = state.cart.find(item => item.id === product.id);
                    if (existing) {
                        return {
                            cart: state.cart.map(item =>
                                item.id === product.id
                                    ? { ...item, quantity: item.quantity + 1 }
                                    : item
                            ),
                            isCartOpen: true
                        };
                    }
                    return {
                        cart: [...state.cart, {
                            id: product.id,
                            type: 'product',
                            productId: product.id, // Added missing property
                            name: product.name,
                            price: product.price,
                            quantity: 1,
                            image: product.image
                        }],
                        isCartOpen: true
                    };
                });
            },

            removeFromCart: (itemId) => {
                set((state) => ({
                    cart: state.cart.filter(item => item.id !== itemId)
                }));
            },

            updateQuantity: (itemId, delta) => {
                set((state) => ({
                    cart: state.cart.map(item => {
                        if (item.id === itemId) {
                            const newQty = item.quantity + delta;
                            return newQty > 0 ? { ...item, quantity: newQty } : item;
                        }
                        return item;
                    })
                }));
            },

            clearCart: () => set({ cart: [] }),

            toggleCart: (isOpen) => set((state) => ({
                isCartOpen: isOpen !== undefined ? isOpen : !state.isCartOpen
            })),

            getCartTotal: () => {
                return get().cart.reduce((total, item) => total + (item.price * item.quantity), 0);
            },

            getItemCount: () => {
                return get().cart.reduce((count, item) => count + item.quantity, 0);
            }
        }),
        {
            name: 'printly-cart-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ cart: state.cart }), // Don't persist isCartOpen
        }
    )
);
