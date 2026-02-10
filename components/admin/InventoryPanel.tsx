import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';

interface InventoryItem {
    id: string;
    name: string;
    stock: number;
    unit: string;
    threshold: number;
    status: 'good' | 'low' | 'critical';
}

const DEFAULT_INVENTORY: InventoryItem[] = [
    { id: '1', name: 'A4 Paper (White)', stock: 0, unit: 'sheets', threshold: 2000, status: 'critical' },
    { id: '2', name: 'A3 Paper', stock: 0, unit: 'sheets', threshold: 500, status: 'critical' },
    { id: '3', name: 'Black Ink', stock: 0, unit: 'cartridges', threshold: 2, status: 'critical' },
    { id: '4', name: 'Color Ink (Cyan)', stock: 0, unit: 'cartridges', threshold: 2, status: 'critical' },
    { id: '5', name: 'Color Ink (Magenta)', stock: 0, unit: 'cartridges', threshold: 2, status: 'critical' },
    { id: '6', name: 'Color Ink (Yellow)', stock: 0, unit: 'cartridges', threshold: 2, status: 'critical' },
    { id: '7', name: 'Spiral Binding Coils', stock: 0, unit: 'pieces', threshold: 20, status: 'critical' },
];

export const InventoryPanel: React.FC = () => {
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('printwise_inventory');
        if (stored) {
            try {
                setInventoryItems(JSON.parse(stored));
            } catch (e) {
                setInventoryItems(DEFAULT_INVENTORY);
            }
        } else {
            setInventoryItems(DEFAULT_INVENTORY);
            localStorage.setItem('printwise_inventory', JSON.stringify(DEFAULT_INVENTORY));
        }
    }, []);

    const updateStock = (id: string, amount: number) => {
        const updated = inventoryItems.map(item => {
            if (item.id === id) {
                const newStock = Math.max(0, item.stock + amount);
                let status: 'good' | 'low' | 'critical' = 'good';
                if (newStock <= item.threshold * 0.3) status = 'critical';
                else if (newStock <= item.threshold) status = 'low';
                return { ...item, stock: newStock, status };
            }
            return item;
        });
        setInventoryItems(updated);
        localStorage.setItem('printwise_inventory', JSON.stringify(updated));
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'good': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'low': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getProgressColor = (status: string) => {
        switch (status) {
            case 'good': return 'bg-green-500';
            case 'low': return 'bg-yellow-500';
            case 'critical': return 'bg-red-500';
            default: return 'bg-slate-400';
        }
    };

    const criticalCount = inventoryItems.filter(i => i.status === 'critical').length;
    const lowCount = inventoryItems.filter(i => i.status === 'low').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Track paper stock, ink levels, and supplies
                    </p>
                </div>
                <button className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-md hover:opacity-90 transition-colors">
                    <Icon name="add" className="text-lg mr-2" />
                    Add Stock
                </button>
            </div>

            {/* Alerts */}
            {(criticalCount > 0 || lowCount > 0) && (
                <div className="flex flex-wrap gap-4">
                    {criticalCount > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
                            <Icon name="error" className="text-red-600 dark:text-red-400 text-xl" />
                            <div>
                                <p className="font-semibold text-red-800 dark:text-red-300">{criticalCount} Critical</p>
                                <p className="text-sm text-red-600 dark:text-red-400">Restock immediately</p>
                            </div>
                        </div>
                    )}
                    {lowCount > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50">
                            <Icon name="warning" className="text-yellow-600 dark:text-yellow-400 text-xl" />
                            <div>
                                <p className="font-semibold text-yellow-800 dark:text-yellow-300">{lowCount} Low Stock</p>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">Consider restocking soon</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryItems.map((item) => {
                    const percentage = Math.min((item.stock / (item.threshold * 3)) * 100, 100);

                    return (
                        <div
                            key={item.id}
                            className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        Threshold: {item.threshold} {item.unit}
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}>
                                    {item.status}
                                </span>
                            </div>

                            <div className="mt-4">
                                <div className="flex items-baseline justify-between mb-2">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{item.stock}</span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{item.unit}</span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(item.status)}`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                                <button className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                    <Icon name="add" className="text-lg inline mr-1" />
                                    Add
                                </button>
                                <button className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                    <Icon name="history" className="text-lg inline mr-1" />
                                    History
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
