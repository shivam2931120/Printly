import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { ShopConfig, DEFAULT_SHOP_CONFIG } from '../../types';

interface Shop extends ShopConfig {
    totalOrders: number;
    totalRevenue: number;
}

export const ShopsManagement: React.FC<{ onSelectShop?: (shopId: string) => void }> = ({ onSelectShop }) => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [isAddingShop, setIsAddingShop] = useState(false);
    const [newShopName, setNewShopName] = useState('');

    useEffect(() => {
        // Load shops from localStorage
        const storedShops = localStorage.getItem('printwise_all_shops');
        if (storedShops) {
            try {
                setShops(JSON.parse(storedShops));
            } catch (e) {
                initializeDefaultShop();
            }
        } else {
            initializeDefaultShop();
        }
    }, []);

    const initializeDefaultShop = () => {
        // Get current shop config and orders
        const currentConfig = JSON.parse(localStorage.getItem('printwise_shop_config') || JSON.stringify(DEFAULT_SHOP_CONFIG));
        const orders = JSON.parse(localStorage.getItem('printwise_orders') || '[]');
        const totalRevenue = orders.reduce((sum: number, o: { totalAmount?: number }) => sum + (o.totalAmount || 0), 0);

        const defaultShop: Shop = {
            ...currentConfig,
            shopId: 'shop_default',
            totalOrders: orders.length,
            totalRevenue,
        };

        setShops([defaultShop]);
        localStorage.setItem('printwise_all_shops', JSON.stringify([defaultShop]));
    };

    const addShop = () => {
        if (!newShopName.trim()) return;

        const newShop: Shop = {
            ...DEFAULT_SHOP_CONFIG,
            shopId: `shop_${Date.now()}`,
            shopName: newShopName,
            createdAt: new Date().toISOString(),
            totalOrders: 0,
            totalRevenue: 0,
        };

        const updated = [...shops, newShop];
        setShops(updated);
        localStorage.setItem('printwise_all_shops', JSON.stringify(updated));
        setNewShopName('');
        setIsAddingShop(false);
    };

    const toggleShopStatus = (shopId: string) => {
        const updated = shops.map(shop =>
            shop.shopId === shopId ? { ...shop, isActive: !shop.isActive } : shop
        );
        setShops(updated);
        localStorage.setItem('printwise_all_shops', JSON.stringify(updated));
    };

    const totalRevenue = shops.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalOrders = shops.reduce((sum, s) => sum + s.totalOrders, 0);
    const activeShops = shops.filter(s => s.isActive).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Shops Management</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Manage all registered shops on the platform
                    </p>
                </div>
                <button
                    onClick={() => setIsAddingShop(true)}
                    className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover transition-colors"
                >
                    <Icon name="add_business" className="text-lg mr-2" />
                    Add Shop
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                            <Icon name="store" className="text-xl text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{shops.length}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Shops</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20">
                            <Icon name="check_circle" className="text-xl text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeShops}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                            <Icon name="receipt_long" className="text-xl text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalOrders}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Orders</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                            <Icon name="payments" className="text-xl text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Shop Modal */}
            {isAddingShop && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New Shop</h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Shop Name"
                            value={newShopName}
                            onChange={(e) => setNewShopName(e.target.value)}
                            className="flex-1 px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white"
                        />
                        <button
                            onClick={addShop}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                        >
                            Create
                        </button>
                        <button
                            onClick={() => setIsAddingShop(false)}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Shops List */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border-light dark:border-border-dark">
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Shop</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Location</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Orders</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Revenue</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                        {shops.map((shop) => (
                            <tr key={shop.shopId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Icon name="store" className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">{shop.shopName}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{shop.tagline}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-sm">{shop.location}</td>
                                <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">{shop.totalOrders}</td>
                                <td className="py-4 px-4 font-semibold text-green-600 dark:text-green-400">₹{shop.totalRevenue.toLocaleString()}</td>
                                <td className="py-4 px-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${shop.isActive
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                        }`}>
                                        {shop.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => onSelectShop?.(shop.shopId)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                            title="View Details"
                                        >
                                            <Icon name="visibility" className="text-lg" />
                                        </button>
                                        <button
                                            onClick={() => toggleShopStatus(shop.shopId)}
                                            className={`p-2 rounded-lg transition-colors ${shop.isActive
                                                    ? 'text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                    : 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                }`}
                                            title={shop.isActive ? 'Deactivate' : 'Activate'}
                                        >
                                            <Icon name={shop.isActive ? 'toggle_on' : 'toggle_off'} className="text-lg" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {shops.length === 0 && (
                    <div className="py-12 text-center">
                        <Icon name="store" className="text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No shops registered yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};
