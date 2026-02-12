import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../ui/Icon';
import {
    fetchInventory,
    addInventoryItem,
    updateInventoryStock,
    deleteInventoryItem,
    fetchStockHistory,
    InventoryRow,
    StockLogRow,
    supabase,
} from '../../services/data';

type InventoryStatus = 'good' | 'low' | 'critical';

const getStatus = (stock: number, threshold: number): InventoryStatus => {
    if (stock <= threshold * 0.3) return 'critical';
    if (stock <= threshold) return 'low';
    return 'good';
};

const getStatusColor = (status: InventoryStatus) => {
    switch (status) {
        case 'good': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        case 'low': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }
};

const getProgressColor = (status: InventoryStatus) => {
    switch (status) {
        case 'good': return 'bg-green-500';
        case 'low': return 'bg-yellow-500';
        case 'critical': return 'bg-red-500';
    }
};

export const InventoryPanel: React.FC = () => {
    const [items, setItems] = useState<InventoryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [addItemModal, setAddItemModal] = useState(false);
    const [addStockModal, setAddStockModal] = useState<InventoryRow | null>(null);
    const [historyModal, setHistoryModal] = useState<InventoryRow | null>(null);
    const [historyLogs, setHistoryLogs] = useState<StockLogRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Add item form
    const [newItem, setNewItem] = useState({ name: '', stock: 0, unit: 'pieces', threshold: 10 });
    const [saving, setSaving] = useState(false);

    // Add stock form
    const [stockAmount, setStockAmount] = useState(0);
    const [stockNote, setStockNote] = useState('');

    const loadInventory = useCallback(async () => {
        setLoading(true);
        const data = await fetchInventory();
        setItems(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadInventory();
    }, [loadInventory]);

    const handleAddItem = async () => {
        if (!newItem.name.trim()) return;
        setSaving(true);
        const result = await addInventoryItem(newItem);
        if (result.success) {
            await loadInventory();
            setAddItemModal(false);
            setNewItem({ name: '', stock: 0, unit: 'pieces', threshold: 10 });
        }
        setSaving(false);
    };

    const handleAddStock = async () => {
        if (!addStockModal || stockAmount === 0) return;
        setSaving(true);

        const { data: authData } = await supabase.auth.getUser();
        const createdBy = authData?.user?.email || 'admin';

        const result = await updateInventoryStock(
            addStockModal.id,
            stockAmount,
            stockNote || (stockAmount > 0 ? 'Stock added' : 'Stock removed'),
            createdBy
        );
        if (result.success) {
            await loadInventory();
            setAddStockModal(null);
            setStockAmount(0);
            setStockNote('');
        }
        setSaving(false);
    };

    const handleDeleteItem = async (item: InventoryRow) => {
        if (!confirm(`Delete "${item.name}" from inventory? This cannot be undone.`)) return;
        const result = await deleteInventoryItem(item.id);
        if (result.success) {
            await loadInventory();
        }
    };

    const openHistory = async (item: InventoryRow) => {
        setHistoryModal(item);
        setHistoryLoading(true);
        const logs = await fetchStockHistory(item.id);
        setHistoryLogs(logs);
        setHistoryLoading(false);
    };

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const criticalCount = items.filter(i => getStatus(i.stock, i.threshold) === 'critical').length;
    const lowCount = items.filter(i => getStatus(i.stock, i.threshold) === 'low').length;

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
                <button
                    onClick={() => setAddItemModal(true)}
                    className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-md hover:opacity-90 transition-colors"
                >
                    <Icon name="add" className="text-lg mr-2" />
                    Add Stock Item
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                />
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

            {/* Loading / Empty */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5 animate-pulse">
                            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-4" />
                            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                        </div>
                    ))}
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                        <Icon name="inventory_2" className="text-3xl text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                        {searchQuery ? 'No matching items' : 'No inventory items yet'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {searchQuery ? 'Try a different search term' : 'Add your first stock item to get started'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setAddItemModal(true)}
                            className="glass-btn glass-btn-primary text-sm"
                        >
                            <Icon name="add" className="text-lg mr-1" />
                            Add First Item
                        </button>
                    )}
                </div>
            ) : (
                /* Inventory Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => {
                        const status = getStatus(item.stock, item.threshold);
                        const percentage = Math.min((item.stock / (item.threshold * 3)) * 100, 100);

                        return (
                            <div
                                key={item.id}
                                className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5 group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{item.name}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                            Threshold: {item.threshold} {item.unit}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
                                            {status}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteItem(item)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 transition-all"
                                            title="Delete item"
                                        >
                                            <Icon name="close" className="text-sm" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <div className="flex items-baseline justify-between mb-2">
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{item.stock}</span>
                                        <span className="text-sm text-slate-500 dark:text-slate-400">{item.unit}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(status)}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={() => {
                                            setAddStockModal(item);
                                            setStockAmount(0);
                                            setStockNote('');
                                        }}
                                        className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                    >
                                        <Icon name="add" className="text-lg inline mr-1" />
                                        Add
                                    </button>
                                    <button
                                        onClick={() => openHistory(item)}
                                        className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <Icon name="history" className="text-lg inline mr-1" />
                                        History
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== ADD ITEM MODAL ===== */}
            {addItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAddItemModal(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border-light dark:border-border-dark shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Stock Item</h3>
                            <button onClick={() => setAddItemModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Icon name="close" className="text-xl text-slate-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Name *</label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                                    placeholder="e.g. A4 Paper (White)"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Stock</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={newItem.stock}
                                        onChange={e => setNewItem(p => ({ ...p, stock: Number(e.target.value) }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit</label>
                                    <select
                                        value={newItem.unit}
                                        onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                                    >
                                        <option value="sheets">Sheets</option>
                                        <option value="cartridges">Cartridges</option>
                                        <option value="pieces">Pieces</option>
                                        <option value="rolls">Rolls</option>
                                        <option value="packs">Packs</option>
                                        <option value="bottles">Bottles</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Low Stock Threshold</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={newItem.threshold}
                                    onChange={e => setNewItem(p => ({ ...p, threshold: Number(e.target.value) }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">Alert when stock drops below this</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-border-light dark:border-border-dark">
                            <button onClick={() => setAddItemModal(false)} className="flex-1 glass-btn text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={handleAddItem}
                                disabled={!newItem.name.trim() || saving}
                                className="flex-1 glass-btn glass-btn-primary text-sm disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ADD STOCK MODAL ===== */}
            {addStockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAddStockModal(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border-light dark:border-border-dark shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Update Stock</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{addStockModal.name}</p>
                            </div>
                            <button onClick={() => setAddStockModal(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Icon name="close" className="text-xl text-slate-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Current Stock</p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                                    {addStockModal.stock} <span className="text-base font-normal text-slate-400">{addStockModal.unit}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quantity to Add/Remove</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setStockAmount(a => a - 1)}
                                        className="size-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors font-bold text-lg"
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        value={stockAmount}
                                        onChange={e => setStockAmount(Number(e.target.value))}
                                        className="flex-1 text-center px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-white text-lg font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                                    />
                                    <button
                                        onClick={() => setStockAmount(a => a + 1)}
                                        className="size-10 flex items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-bold text-lg"
                                    >
                                        +
                                    </button>
                                </div>
                                <p className="text-center text-xs mt-2">
                                    {stockAmount > 0 ? (
                                        <span className="text-green-600 dark:text-green-400">
                                            New stock: {addStockModal.stock + stockAmount} {addStockModal.unit}
                                        </span>
                                    ) : stockAmount < 0 ? (
                                        <span className="text-red-600 dark:text-red-400">
                                            New stock: {Math.max(0, addStockModal.stock + stockAmount)} {addStockModal.unit}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">No change</span>
                                    )}
                                </p>
                            </div>

                            {/* Quick-add buttons */}
                            <div className="flex flex-wrap gap-2">
                                {[10, 50, 100, 500].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => setStockAmount(q)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary transition-colors"
                                    >
                                        +{q}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note (optional)</label>
                                <input
                                    type="text"
                                    value={stockNote}
                                    onChange={e => setStockNote(e.target.value)}
                                    placeholder="e.g. New shipment arrived"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-border-light dark:border-border-dark">
                            <button onClick={() => setAddStockModal(null)} className="flex-1 glass-btn text-sm">
                                Cancel
                            </button>
                            <button
                                onClick={handleAddStock}
                                disabled={stockAmount === 0 || saving}
                                className="flex-1 glass-btn glass-btn-primary text-sm disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : stockAmount >= 0 ? `Add ${stockAmount}` : `Remove ${Math.abs(stockAmount)}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== HISTORY MODAL ===== */}
            {historyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setHistoryModal(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border-light dark:border-border-dark shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-border-light dark:border-border-dark shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Stock History</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{historyModal.name}</p>
                            </div>
                            <button onClick={() => setHistoryModal(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Icon name="close" className="text-xl text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            {historyLoading ? (
                                <div className="space-y-3">
                                    {[...Array(4)].map((_, i) => (
                                        <div key={i} className="animate-pulse flex items-center gap-3">
                                            <div className="size-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                            <div className="flex-1">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1" />
                                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : historyLogs.length === 0 ? (
                                <div className="text-center py-10">
                                    <Icon name="history" className="text-4xl text-slate-300 dark:text-slate-600 mb-2" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400">No stock changes recorded yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historyLogs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                        >
                                            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                                                log.amount > 0
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                            }`}>
                                                <Icon name={log.amount > 0 ? 'arrow_upward' : 'arrow_downward'} className="text-sm" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-sm font-bold ${
                                                        log.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                    }`}>
                                                        {log.amount > 0 ? '+' : ''}{log.amount} {historyModal.unit}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                {log.note && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{log.note}</p>
                                                )}
                                                {log.createdBy && (
                                                    <p className="text-xs text-slate-400 mt-0.5">by {log.createdBy}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-border-light dark:border-border-dark shrink-0">
                            <button onClick={() => setHistoryModal(null)} className="w-full glass-btn text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
