import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Order } from '../types';

interface OrderState {
    orders: Order[];
    addOrder: (order: Order) => void;
    setOrders: (orders: Order[]) => void;
    clearOrders: () => void;
}

export const useOrderStore = create<OrderState>()(
    persist(
        (set) => ({
            orders: [],
            addOrder: (order) => set((state) => ({
                orders: [order, ...state.orders]
            })),
            setOrders: (orders) => set({ orders }),
            clearOrders: () => set({ orders: [] }),
        }),
        {
            name: 'printly-order-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
