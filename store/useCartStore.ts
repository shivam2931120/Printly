import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, PrintOptions, PricingConfig } from '../types';
import { calculatePrintPrice } from '../lib/pricing';
import { generateId } from '../lib/utils';

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

const isPersistableCartItem = (item: CartItem) => {
    if (item.type === 'product') return true;
    return Boolean(item.fileUrl);
};

const sanitizePersistedCart = (cart: unknown): CartItem[] => {
    if (!Array.isArray(cart)) return [];
    return cart.filter((item): item is CartItem => {
        if (!item || typeof item !== 'object') return false;
        return isPersistableCartItem(item as CartItem);
    });
};

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            cart: [],
            isCartOpen: false,

            addToCartPrint: (files, options, pricing) => {
                const newItems: CartItem[] = files.map(f => {
                    const jobPrice = calculatePrintPrice(options, f.pageCount, pricing);

                    return {
                        id: `print-${generateId()}`,
                        type: 'print',
                        name: f.file.name,
                        fileName: f.file.name,
                        price: jobPrice,
                        quantity: 1, // distinct from options.copies
                        file: f.file,
                        options: { ...options },
                        pageCount: f.pageCount
                    };
                });

                set((state) => ({
                    cart: [...state.cart, ...newItems],
                    isCartOpen: true
                }));
            },

            addToCartProduct: (product) => {
                if (product.stock <= 0) return;

                set((state) => {
                    const existing = state.cart.find(item => item.id === product.id);
                    if (existing) {
                        return {
                            cart: state.cart.map(item =>
                                item.id === product.id
                                    ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
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
                            image: product.image,
                            stock: product.stock,
                            isActive: product.isActive,
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
                            if (newQty <= 0) return item;
                            if (item.type === 'product' && typeof item.stock === 'number') {
                                return { ...item, quantity: Math.min(newQty, Math.max(0, item.stock)) };
                            }
                            return { ...item, quantity: newQty };
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
            version: 1,
            partialize: (state) => ({ cart: state.cart.filter(isPersistableCartItem) }), // Don't persist isCartOpen or in-memory File objects
            migrate: (persisted) => {
                const state = persisted as Partial<CartState>;
                return {
                    ...state,
                    cart: sanitizePersistedCart(state.cart),
                };
            },
        }
    )
);
