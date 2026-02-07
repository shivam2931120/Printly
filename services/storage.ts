/**
 * Storage Service
 * 
 * This module provides a unified API for data storage that works with:
 * - localStorage (development/offline)
 * - Backend API (production with database)
 * 
 * The app will automatically use localStorage if no API is available.
 */

const API_BASE = import.meta.env.VITE_API_URL || '';
const USE_API = !!API_BASE;

// ===== STORAGE KEYS =====
const KEYS = {
    USER: 'printwise_user',
    ORDERS: 'printwise_orders',
    SHOP_CONFIG: 'printwise_shop_config',
    ALL_SHOPS: 'printwise_all_shops',
    INVENTORY: 'printwise_inventory',
    PRICING: 'printwise_pricing',
};

// ===== GENERIC STORAGE HELPERS =====
function getLocal<T>(key: string, fallback: T): T {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    } catch {
        return fallback;
    }
}

function setLocal<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
}

// ===== USER =====
export const userStorage = {
    get: () => getLocal(KEYS.USER, null),
    set: (user: unknown) => setLocal(KEYS.USER, user),
    clear: () => localStorage.removeItem(KEYS.USER),
};

// ===== ORDERS =====
export const ordersStorage = {
    getAll: () => getLocal(KEYS.ORDERS, []),
    add: (order: unknown) => {
        const orders = ordersStorage.getAll();
        orders.push(order);
        setLocal(KEYS.ORDERS, orders);
    },
    update: (orderId: string, updates: Record<string, unknown>) => {
        const orders = ordersStorage.getAll();
        const index = orders.findIndex((o: { id: string }) => o.id === orderId);
        if (index !== -1) {
            orders[index] = { ...orders[index], ...updates };
            setLocal(KEYS.ORDERS, orders);
        }
    },
};

// ===== SHOP CONFIG =====
export const shopConfigStorage = {
    get: () => getLocal(KEYS.SHOP_CONFIG, null),
    set: (config: unknown) => setLocal(KEYS.SHOP_CONFIG, config),
};

// ===== ALL SHOPS (Developer) =====
export const allShopsStorage = {
    getAll: () => getLocal(KEYS.ALL_SHOPS, []),
    set: (shops: unknown[]) => setLocal(KEYS.ALL_SHOPS, shops),
    add: (shop: unknown) => {
        const shops = allShopsStorage.getAll();
        shops.push(shop);
        setLocal(KEYS.ALL_SHOPS, shops);
    },
};

// ===== INVENTORY =====
export const inventoryStorage = {
    getAll: () => getLocal(KEYS.INVENTORY, []),
    set: (items: unknown[]) => setLocal(KEYS.INVENTORY, items),
};

// ===== PRICING =====
export const pricingStorage = {
    get: () => getLocal(KEYS.PRICING, null),
    set: (pricing: unknown) => setLocal(KEYS.PRICING, pricing),
};

// ===== API CHECK =====
export const isUsingAPI = () => USE_API;
