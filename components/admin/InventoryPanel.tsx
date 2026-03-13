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
} from '../../services/data';
import { useAuth } from '../../contexts/AuthContext';

type InventoryStatus = 'good' | 'low' | 'critical';

const getStatus = (stock: number, threshold: number): InventoryStatus => {
 if (stock <= threshold * 0.3) return 'critical';
 if (stock <= threshold) return 'low';
 return 'good';
};

const getStatusColor = (status: InventoryStatus) => {
 switch (status) {
 case 'good': return 'bg-green-900/20 text-green-400 ';
 case 'low': return 'bg-yellow-900/20 text-yellow-700 ';
 case 'critical': return 'bg-red-900/20 text-error ';
 }
};

const getProgressColor = (status: InventoryStatus) => {
 switch (status) {
 case 'good': return 'bg-green-900/20';
 case 'low': return 'bg-yellow-900/200';
 case 'critical': return 'bg-red-900/20';
 }
};

export const InventoryPanel: React.FC = () => {
 const { user } = useAuth();
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

 const createdBy = user?.email || 'admin';

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
 <h2 className="text-2xl font-bold text-foreground ">Inventory</h2>
 <p className="text-foreground-muted text-sm mt-1">
 Track paper stock, ink levels, and supplies
 </p>
 </div>
 <button
 onClick={() => setAddItemModal(true)}
 className="inline-flex items-center justify-center h-10 px-4 bg-background-card bg-background-card text-foreground text-sm font-bold hover:opacity-90 transition-colors"
 >
 <Icon name="add" className="text-lg mr-2" />
 Add Stock Item
 </button>
 </div>

 {/* Search */}
 <div className="relative max-w-sm">
 <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted text-lg" />
 <input
 type="text"
 placeholder="Search inventory..."
 value={searchQuery}
 onChange={e => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 border border-border bg-background-card text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
 />
 </div>

 {/* Alerts */}
 {(criticalCount > 0 || lowCount > 0) && (
 <div className="flex flex-wrap gap-4">
 {criticalCount > 0 && (
 <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-primary/20">
 <Icon name="error" className="text-primary text-xl" />
 <div>
 <p className="font-semibold text-error">{criticalCount} Critical</p>
 <p className="text-sm text-primary ">Restock immediately</p>
 </div>
 </div>
 )}
 {lowCount > 0 && (
 <div className="flex items-center gap-3 px-4 py-3 bg-yellow-900/20 border border-yellow-900/50">
 <Icon name="warning" className="text-yellow-400 text-xl" />
 <div>
 <p className="font-semibold text-yellow-400 ">{lowCount} Low Stock</p>
 <p className="text-sm text-yellow-400 ">Consider restocking soon</p>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Loading / Empty */}
 {loading ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="bg-background-card border border-border rounded-2xl shadow-2xl p-5 animate-pulse">
 <div className="h-5 bg-background-subtle rounded w-3/4 mb-2" />
 <div className="h-3 bg-background-subtle rounded w-1/2 mb-4" />
 <div className="h-8 bg-background-subtle rounded w-1/3 mb-2" />
 <div className="h-2 bg-background-subtle rounded w-full" />
 </div>
 ))}
 </div>
 ) : filteredItems.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-center">
 <div className="size-16 bg-background-subtle flex items-center justify-center mb-4">
 <Icon name="inventory_2" className="text-3xl text-foreground-muted" />
 </div>
 <h3 className="text-lg font-semibold text-foreground mb-1">
 {searchQuery ? 'No matching items' : 'No inventory items yet'}
 </h3>
 <p className="text-sm text-foreground-muted mb-4">
 {searchQuery ? 'Try a different search term' : 'Add your first stock item to get started'}
 </p>
 {!searchQuery && (
 <button
 onClick={() => setAddItemModal(true)}
 className="text-sm"
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
 className="bg-background-card border border-border rounded-2xl shadow-2xl p-5 group"
 >
 <div className="flex items-start justify-between mb-3">
 <div className="flex-1 min-w-0">
 <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
 <p className="text-sm text-foreground-muted mt-0.5">
 Threshold: {item.threshold} {item.unit}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <span className={`px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(status)}`}>
 {status}
 </span>
 <button
 onClick={() => handleDeleteItem(item)}
 className="opacity-0 group-hover:opacity-100 p-1 rounded text-foreground-muted hover:text-primary transition-all"
 title="Delete item"
 >
 <Icon name="close" className="text-sm" />
 </button>
 </div>
 </div>

 <div className="mt-4">
 <div className="flex items-baseline justify-between mb-2">
 <span className="text-2xl font-bold text-foreground ">{item.stock}</span>
 <span className="text-sm text-foreground-muted ">{item.unit}</span>
 </div>
 <div className="h-2 bg-background-subtle overflow-hidden">
 <div
 className={`h-full transition-all duration-500 ${getProgressColor(status)}`}
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
 className="flex-1 py-2 px-3 text-sm font-medium text-primary hover:bg-background-subtle transition-colors"
 >
 <Icon name="add" className="text-lg inline mr-1" />
 Add
 </button>
 <button
 onClick={() => openHistory(item)}
 className="flex-1 py-2 px-3 text-sm font-medium text-foreground-muted hover:bg-background-subtle transition-colors"
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
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAddItemModal(false)}>
 <div className="bg-background-card border border-border rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between p-5 border-b border-border ">
 <h3 className="text-lg font-bold text-foreground ">Add Stock Item</h3>
 <button onClick={() => setAddItemModal(false)} className="p-1 hover:bg-background-subtle ">
 <Icon name="close" className="text-xl text-foreground-muted" />
 </button>
 </div>
 <div className="p-5 space-y-4">
 <div>
 <label className="block text-sm font-medium text-foreground-muted mb-1">Item Name *</label>
 <input
 type="text"
 value={newItem.name}
 onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
 placeholder="e.g. A4 Paper (White)"
 className="w-full px-4 py-2.5 border border-border bg-background-card text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
 autoFocus
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-foreground-muted mb-1">Initial Stock</label>
 <input
 type="number"
 min={0}
 value={newItem.stock}
 onChange={e => setNewItem(p => ({ ...p, stock: Number(e.target.value) }))}
 className="w-full px-4 py-2.5 border border-border bg-background-card text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-foreground-muted mb-1">Unit</label>
 <select
 value={newItem.unit}
 onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}
 className="w-full px-4 py-2.5 border border-border bg-background-card text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
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
 <label className="block text-sm font-medium text-foreground-muted mb-1">Low Stock Threshold</label>
 <input
 type="number"
 min={1}
 value={newItem.threshold}
 onChange={e => setNewItem(p => ({ ...p, threshold: Number(e.target.value) }))}
 className="w-full px-4 py-2.5 border border-border bg-background-card text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
 />
 <p className="text-xs text-foreground-muted mt-1">Alert when stock drops below this</p>
 </div>
 </div>
 <div className="flex gap-3 p-5 border-t border-border ">
 <button onClick={() => setAddItemModal(false)} className="flex-1 text-sm">
 Cancel
 </button>
 <button
 onClick={handleAddItem}
 disabled={!newItem.name.trim() || saving}
 className="flex-1 text-sm disabled:opacity-50"
 >
 {saving ? 'Saving...' : 'Add Item'}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ===== ADD STOCK MODAL ===== */}
 {addStockModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAddStockModal(null)}>
 <div className="bg-background-card border border-border rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between p-5 border-b border-border ">
 <div>
 <h3 className="text-lg font-bold text-foreground ">Update Stock</h3>
 <p className="text-sm text-foreground-muted ">{addStockModal.name}</p>
 </div>
 <button onClick={() => setAddStockModal(null)} className="p-1 hover:bg-background-subtle ">
 <Icon name="close" className="text-xl text-foreground-muted" />
 </button>
 </div>
 <div className="p-5 space-y-4">
 <div className="text-center">
 <p className="text-sm text-foreground-muted mb-1">Current Stock</p>
 <p className="text-3xl font-bold text-foreground ">
 {addStockModal.stock} <span className="text-base font-normal text-foreground-muted">{addStockModal.unit}</span>
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-foreground-muted mb-2">Quantity to Add/Remove</label>
 <div className="flex items-center gap-3">
 <button
 onClick={() => setStockAmount(a => a - 1)}
 className="size-10 flex items-center justify-center bg-red-900/20 text-primary hover:bg-red-900/20 transition-colors font-bold text-lg"
 >
 −
 </button>
 <input
 type="number"
 value={stockAmount}
 onChange={e => setStockAmount(Number(e.target.value))}
 className="flex-1 text-center px-4 py-2.5 border border-border bg-background-card text-foreground text-lg font-bold focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
 />
 <button
 onClick={() => setStockAmount(a => a + 1)}
 className="size-10 flex items-center justify-center bg-green-900/20 bg-green-900/20 text-green-400 hover:bg-green-900/30 transition-colors font-bold text-lg"
 >
 +
 </button>
 </div>
 <p className="text-center text-xs mt-2">
 {stockAmount > 0 ? (
 <span className="text-green-400 ">
 New stock: {addStockModal.stock + stockAmount} {addStockModal.unit}
 </span>
 ) : stockAmount < 0 ? (
 <span className="text-primary ">
 New stock: {Math.max(0, addStockModal.stock + stockAmount)} {addStockModal.unit}
 </span>
 ) : (
 <span className="text-foreground-muted">No change</span>
 )}
 </p>
 </div>

 {/* Quick-add buttons */}
 <div className="flex flex-wrap gap-2">
 {[10, 50, 100, 500].map(q => (
 <button
 key={q}
 onClick={() => setStockAmount(q)}
 className="px-3 py-1.5 text-xs font-medium bg-background-subtle text-foreground-muted hover:bg-primary/10 hover:text-primary transition-colors"
 >
 +{q}
 </button>
 ))}
 </div>

 <div>
 <label className="block text-sm font-medium text-foreground-muted mb-1">Note (optional)</label>
 <input
 type="text"
 value={stockNote}
 onChange={e => setStockNote(e.target.value)}
 placeholder="e.g. New shipment arrived"
 className="w-full px-4 py-2.5 border border-border bg-background-card text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
 />
 </div>
 </div>
 <div className="flex gap-3 p-5 border-t border-border ">
 <button onClick={() => setAddStockModal(null)} className="flex-1 text-sm">
 Cancel
 </button>
 <button
 onClick={handleAddStock}
 disabled={stockAmount === 0 || saving}
 className="flex-1 text-sm disabled:opacity-50"
 >
 {saving ? 'Saving...' : stockAmount >= 0 ? `Add ${stockAmount}` : `Remove ${Math.abs(stockAmount)}`}
 </button>
 </div>
 </div>
 </div>
 )}

 {/* ===== HISTORY MODAL ===== */}
 {historyModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setHistoryModal(null)}>
 <div className="bg-background-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
 <div>
 <h3 className="text-lg font-bold text-foreground ">Stock History</h3>
 <p className="text-sm text-foreground-muted ">{historyModal.name}</p>
 </div>
 <button onClick={() => setHistoryModal(null)} className="p-1 hover:bg-background-subtle ">
 <Icon name="close" className="text-xl text-foreground-muted" />
 </button>
 </div>
 <div className="flex-1 overflow-y-auto p-5">
 {historyLoading ? (
 <div className="space-y-3">
 {[...Array(4)].map((_, i) => (
 <div key={i} className="animate-pulse flex items-center gap-3">
 <div className="size-8 bg-background-subtle " />
 <div className="flex-1">
 <div className="h-4 bg-background-subtle rounded w-3/4 mb-1" />
 <div className="h-3 bg-background-subtle rounded w-1/2" />
 </div>
 </div>
 ))}
 </div>
 ) : historyLogs.length === 0 ? (
 <div className="text-center py-10">
 <Icon name="history" className="text-4xl text-foreground-muted mb-2" />
 <p className="text-sm text-foreground-muted ">No stock changes recorded yet</p>
 </div>
 ) : (
 <div className="space-y-3">
 {historyLogs.map((log) => (
 <div
 key={log.id}
 className="flex items-start gap-3 p-3 bg-background-card "
 >
 <div className={`size-8 flex items-center justify-center shrink-0 ${
 log.amount > 0
 ? 'bg-green-900/20 text-green-400 '
 : 'bg-red-900/20 text-primary '
 }`}>
 <Icon name={log.amount > 0 ? 'arrow_upward' : 'arrow_downward'} className="text-sm" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between">
 <span className={`text-sm font-bold ${
 log.amount > 0 ? 'text-green-400 ' : 'text-primary '
 }`}>
 {log.amount > 0 ? '+' : ''}{log.amount} {historyModal.unit}
 </span>
 <span className="text-xs text-foreground-muted">
 {new Date(log.createdAt).toLocaleDateString('en-IN', {
 day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
 })}
 </span>
 </div>
 {log.note && (
 <p className="text-xs text-foreground-muted mt-0.5 truncate">{log.note}</p>
 )}
 {log.createdBy && (
 <p className="text-xs text-foreground-muted mt-0.5">by {log.createdBy}</p>
 )}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 <div className="p-5 border-t border-border shrink-0">
 <button onClick={() => setHistoryModal(null)} className="w-full text-sm">
 Close
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
};
