// Storage Service - Local Storage disabled in favor of Backend/Session
// This file is kept to avoid breaking imports but methods are no-ops or memory-only

const memoryStore: Record<string, any> = {};

// ===== GENERIC STORAGE HELPERS =====
// Using memory only
function getLocal<T>(key: string, fallback: T): T {
    return memoryStore[key] || fallback;
}

function setLocal<T>(key: string, value: T): void {
    memoryStore[key] = value;
}

// ===== USER =====
export const userStorage = {
    get: () => getLocal('user', null),
    set: (user: unknown) => setLocal('user', user),
    clear: () => delete memoryStore['user'],
};

// ===== ORDERS =====
export const ordersStorage = {
    getAll: () => [], // Always empty, forces fetch from DB
    add: (order: unknown) => {
        // No-op: Order should be saved to DB only.
    },
    update: () => { },
};

// ===== SHOP CONFIG =====
export const shopConfigStorage = {
    get: () => null,
    set: () => { },
};

// ===== ALL SHOPS (Developer) =====
export const allShopsStorage = {
    getAll: () => [],
    set: () => { },
    add: () => { },
};

// ===== INVENTORY =====
export const inventoryStorage = {
    getAll: () => [],
    set: () => { },
};

// ===== PRICING =====
export const pricingStorage = {
    get: () => null,
    set: () => { },
};

// ===== API CHECK =====
export const isUsingAPI = () => true; // Always true now
