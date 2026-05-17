import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_SHOP_CONFIG, ShopConfig } from '../types';

interface ShopState {
    shops: ShopConfig[];
    selectedShopId?: string;
    setShops: (shops: ShopConfig[]) => void;
    setSelectedShopId: (shopId: string) => void;
    getSelectedShop: () => ShopConfig;
}

export const useShopStore = create<ShopState>()(
    persist(
        (set, get) => ({
            shops: [DEFAULT_SHOP_CONFIG],
            selectedShopId: DEFAULT_SHOP_CONFIG.shopId,
            setShops: (shops) => {
                const nextShops = shops.length > 0 ? shops : [DEFAULT_SHOP_CONFIG];
                const currentSelected = get().selectedShopId;
                const hasCurrent = currentSelected
                    ? nextShops.some((shop) => shop.shopId === currentSelected)
                    : false;

                set({
                    shops: nextShops,
                    selectedShopId: hasCurrent ? currentSelected : nextShops[0].shopId,
                });
            },
            setSelectedShopId: (shopId) => set({ selectedShopId: shopId }),
            getSelectedShop: () => {
                const { shops, selectedShopId } = get();
                return shops.find((shop) => shop.shopId === selectedShopId) || shops[0] || DEFAULT_SHOP_CONFIG;
            },
        }),
        {
            name: 'printly-shop-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ selectedShopId: state.selectedShopId }),
        }
    )
);
