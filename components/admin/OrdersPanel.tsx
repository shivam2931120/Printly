import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../ui/Icon';
import { Toast } from '../ui/Toast';
import { OrderDetails } from './OrderDetails';
import { Order, OrderStatus } from '../../types';
import { fetchOrders, fetchAdminOrders, supabase, exportToCSV, bulkUpdateOrderStatus, bulkDeleteOrders } from '../../services/data';
import { Skeleton } from '../ui/Skeleton';

interface OrdersPanelProps {
 currentUserId: string;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({ currentUserId }) => {
 const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
 const [orders, setOrders] = useState<Order[]>([]);
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [toastMessage, setToastMessage] = useState<{ message: string, type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
 const prevOrdersCountRef = useRef<number>(0);
 const [loading, setLoading] = useState(true);
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
 const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
 const [paymentFilter, setPaymentFilter] = useState<string>('all');
 const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');



 const loadOrders = useCallback(async () => {
 setLoading(true);
 try {
 let data;
 if (currentUserId) {
 data = await fetchAdminOrders(currentUserId);
 } else {
 data = await fetchOrders();
 }
 setOrders(data);

 if (prevOrdersCountRef.current > 0 && data.length > prevOrdersCountRef.current) {
 const newOrder = data[0];
 setToastMessage({
 message: `New Order Received! OTP: ${newOrder.orderToken || newOrder.id.slice(-4)} `,
 type: 'success'
 });
 }
 prevOrdersCountRef.current = data.length;
 } catch (error) {
 console.error("Failed to fetch orders", error);
 setToastMessage({ message: 'Failed to load orders', type: 'error' });
 } finally {
 setLoading(false);
 }
 }, [currentUserId]);

 useEffect(() => {
 loadOrders();

 // Real-time: handle each change type incrementally instead of full reload
 const channel = supabase
 .channel('admin-orders-realtime')
 .on(
 'postgres_changes',
 { event: 'INSERT', schema: 'public', table: 'Order' },
 (payload) => {
 const raw = payload.new as any;
 if (!raw?.id) return;
 // Full reload to get joined user info
 loadOrders();
 setToastMessage({
 message: `🆕 New order! Token: ${raw.orderToken || raw.id.slice(-4)}`,
 type: 'success'
 });
 }
 )
 .on(
 'postgres_changes',
 { event: 'UPDATE', schema: 'public', table: 'Order' },
 (payload) => {
 const raw = payload.new as any;
 if (!raw?.id) return;
 // Patch in-memory — no network round-trip needed
 setOrders(prev => prev.map(o =>
 o.id === raw.id
 ? {
 ...o,
 status: (raw.status?.toLowerCase() ?? o.status) as Order['status'],
 paymentStatus: (raw.paymentStatus?.toLowerCase() ?? o.paymentStatus) as Order['paymentStatus'],
 updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : o.updatedAt,
 }
 : o
 ));
 setSelectedOrder(prev =>
 prev?.id === raw.id
 ? {
 ...prev,
 status: (raw.status?.toLowerCase() ?? prev.status) as Order['status'],
 paymentStatus: (raw.paymentStatus?.toLowerCase() ?? prev.paymentStatus) as Order['paymentStatus'],
 updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : prev.updatedAt,
 }
 : prev
 );
 }
 )
 .on(
 'postgres_changes',
 { event: 'DELETE', schema: 'public', table: 'Order' },
 (payload) => {
 const raw = payload.old as any;
 if (!raw?.id) return;
 setOrders(prev => prev.filter(o => o.id !== raw.id));
 setSelectedOrder(prev => prev?.id === raw.id ? null : prev);
 }
 )
 .subscribe((status) => {
 if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
 else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('error');
 else setRealtimeStatus('connecting');
 });

 return () => {
 supabase.removeChannel(channel);
 };
 }, [loadOrders]);

 const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
 const now = new Date();
 const { error } = await supabase
 .from('Order')
 .update({ status: newStatus.toUpperCase(), updatedAt: now.toISOString() })
 .eq('id', orderId);

 if (error) {
 console.error('Failed to update status', error);
 setToastMessage({ message: 'Failed to update status', type: 'error' });
 } else {
 setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, updatedAt: now } : o));
 setToastMessage({ message: `Order updated to ${newStatus} `, type: 'success' });

 if (selectedOrder && selectedOrder.id === orderId) {
 setSelectedOrder({ ...selectedOrder, status: newStatus, updatedAt: now });
 }
 }
 };

 const deleteOrder = async (orderId: string) => {
 if (!window.confirm('Are you sure you want to delete this order? It will be hidden from the dashboard but preserved for analytics.')) return;

 const { error } = await supabase
 .from('Order')
 .update({ isDeleted: true, deletedAt: new Date().toISOString() })
 .eq('id', orderId);

 if (error) {
 console.error('Failed to delete order', error);
 setToastMessage({ message: 'Failed to delete order', type: 'error' });
 } else {
 setOrders(prev => prev.filter(o => o.id !== orderId));
 setToastMessage({ message: 'Order deleted successfully', type: 'success' });
 if (selectedOrder?.id === orderId) {
 setSelectedOrder(null);
 }
 }
 };

 const handleExport = () => {
 if (filteredOrders.length === 0) {
 setToastMessage({ message: 'No orders to export', type: 'warning' });
 return;
 }

 const rows = filteredOrders.map(order => ({
 'OTP': order.orderToken || '',
 'Order ID': order.id,
 'Date': new Date(order.createdAt).toLocaleDateString(),
 'Time': new Date(order.createdAt).toLocaleTimeString(),
 'Customer': order.userName,
 'Email': order.userEmail,
 'Items': order.items ? order.items.map(i => `${i.name} x${i.quantity}`).join('; ') : (order.fileName || 'N/A'),
 'Total (₹)': order.totalAmount.toFixed(2),
 'Status': order.status.toUpperCase(),
 'Payment': order.paymentStatus.toUpperCase(),
 }));

 exportToCSV(rows, 'printly_orders');
 setToastMessage({ message: `Exported ${rows.length} orders`, type: 'success' });
 };

 // Bulk actions
 const toggleSelect = (id: string) => {
 setSelectedIds(prev => {
 const next = new Set(prev);
 next.has(id) ? next.delete(id) : next.add(id);
 return next;
 });
 };

 const toggleSelectAll = () => {
 if (selectedIds.size === filteredOrders.length) {
 setSelectedIds(new Set());
 } else {
 setSelectedIds(new Set(filteredOrders.map(o => o.id)));
 }
 };

 const handleBulkStatus = async (status: OrderStatus) => {
 const ids = Array.from(selectedIds);
 if (ids.length === 0) return;
 const { success } = await bulkUpdateOrderStatus(ids, status);
 if (success) {
 setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, status, updatedAt: new Date() } : o));
 setSelectedIds(new Set());
 setToastMessage({ message: `${ids.length} orders updated to ${status}`, type: 'success' });
 } else {
 setToastMessage({ message: 'Bulk update failed', type: 'error' });
 }
 };

 const handleBulkDelete = async () => {
 const ids = Array.from(selectedIds);
 if (ids.length === 0) return;
 if (!window.confirm(`Delete ${ids.length} orders?`)) return;
 const { success } = await bulkDeleteOrders(ids);
 if (success) {
 setOrders(prev => prev.filter(o => !ids.includes(o.id)));
 setSelectedIds(new Set());
 setToastMessage({ message: `${ids.length} orders deleted`, type: 'success' });
 } else {
 setToastMessage({ message: 'Bulk delete failed', type: 'error' });
 }
 };

 const statusColors: Record<string, string> = {
 'pending': 'bg-yellow-900/20 text-yellow-400 ',
 'confirmed': 'bg-red-900/20 text-red-400 ',
 'printing': 'bg-indigo-900/20 text-indigo-400 ',
 'ready': 'bg-purple-900/20 text-purple-400 ',
 'completed': 'bg-green-900/20 text-green-400 ',
 };

 const paymentColors: Record<string, string> = {
 'paid': 'bg-green-900/20 text-green-400 ',
 'unpaid': 'bg-red-900/20 text-red-400 ',
 'pending': 'bg-yellow-900/20 text-yellow-400 ',
 'failed': 'bg-red-900/20 text-red-400 ',
 };

 const filteredOrders = useMemo(() => orders.filter(order => {
 const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
 const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
 const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
 order.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (order.orderToken && order.orderToken.toLowerCase().includes(searchQuery.toLowerCase())) ||
 (order.userEmail && order.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
 (order.fileName && order.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

 // Date filter
 let matchesDate = true;
 if (dateFilter !== 'all') {
 const now = new Date();
 const orderDate = new Date(order.createdAt);
 if (dateFilter === 'today') {
 matchesDate = orderDate.toDateString() === now.toDateString();
 } else if (dateFilter === 'week') {
 const weekAgo = new Date(now);
 weekAgo.setDate(weekAgo.getDate() - 7);
 matchesDate = orderDate >= weekAgo;
 } else if (dateFilter === 'month') {
 matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
 }
 }

 return matchesStatus && matchesPayment && matchesSearch && matchesDate;
 }), [orders, statusFilter, paymentFilter, searchQuery, dateFilter]);

 const statusCounts = useMemo(() => ({
 all: orders.length,
 pending: orders.filter(o => o.status === 'pending').length,
 confirmed: orders.filter(o => o.status === 'confirmed').length,
 printing: orders.filter(o => o.status === 'printing').length,
 ready: orders.filter(o => o.status === 'ready').length,
 completed: orders.filter(o => o.status === 'completed').length,
 }), [orders]);

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h2 className="text-2xl font-bold text-white ">Orders</h2>
 <p className="text-[#666] text-sm mt-1 flex items-center gap-2">
 Manage print orders and track fulfillment
 {/* Realtime connection indicator */}
 <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 
 ${realtimeStatus === 'connected'
 ? 'bg-green-900/20/10 text-green-500'
 : realtimeStatus === 'error'
 ? 'bg-red-900/20/10 text-red-500'
 : 'bg-amber-900/200/10 text-amber-500'
 }`}>
 <span className={`size-1.5 inline-block
 ${realtimeStatus === 'connected'
 ? 'bg-green-900/20 animate-pulse'
 : realtimeStatus === 'error'
 ? 'bg-red-900/20'
 : 'bg-amber-900/200 animate-pulse'
 }`} />
 {realtimeStatus === 'connected' ? 'Live' : realtimeStatus === 'error' ? 'Offline' : 'Connecting…'}
 </span>
 </p>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={handleExport}
 className="inline-flex items-center justify-center h-10 px-4 border border-[#333] bg-[#0A0A0A] text-[#666] text-sm font-medium hover:bg-[#0A0A0A] transition-colors shadow-sm"
 >
 <Icon name="download" className="text-lg mr-2" />
 Export
 </button>
 </div>
 </div>

 {/* Status Tabs */}
 <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
 {(['all', 'confirmed', 'printing', 'ready', 'completed'] as const).map((status) => (
 <button
 key={status}
 onClick={() => setStatusFilter(status)}
 className={`
 inline-flex items-center gap-2 px-4 py-2 text-sm font-bold whitespace-nowrap transition-all
 ${statusFilter === status
 ? 'bg-[#0A0A0A] bg-[#0A0A0A] text-white shadow-md transform scale-105'
 : 'bg-[#0A0A0A] text-[#666] hover:bg-[#1A1A1A] border border-[#333] '
 }
 `}
 >
 <span className="capitalize">{status === 'all' ? 'All Orders' : status}</span>
 <span className={`px-2 py-0.5 text-xs ${statusFilter === status
 ? 'bg-[#1A1A1A] '
 : 'bg-[#111] '
 }`}>
 {status === 'all' ? statusCounts.all : statusCounts[status]}
 </span>
 </button>
 ))}
 </div>

 {/* Search & Advanced Filters */}
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="relative flex-1 max-w-md">
 <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-lg" />
 <input
 type="text"
 placeholder="Search by OTP, name, email, or file..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#333] text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary"
 aria-label="Search orders"
 />
 </div>
 <select
 value={dateFilter}
 onChange={(e) => setDateFilter(e.target.value as any)}
 className="px-3 py-2.5 bg-[#0A0A0A] border border-[#333] text-sm text-[#666] focus:ring-2 focus:ring-primary"
 aria-label="Filter by date"
 >
 <option value="all">All Time</option>
 <option value="today">Today</option>
 <option value="week">This Week</option>
 <option value="month">This Month</option>
 </select>
 <select
 value={paymentFilter}
 onChange={(e) => setPaymentFilter(e.target.value)}
 className="px-3 py-2.5 bg-[#0A0A0A] border border-[#333] text-sm text-[#666] focus:ring-2 focus:ring-primary"
 aria-label="Filter by payment"
 >
 <option value="all">All Payments</option>
 <option value="paid">Paid</option>
 <option value="unpaid">Unpaid</option>
 </select>
 </div>

 {/* Bulk Action Bar */}
 {selectedIds.size > 0 && (
 <div className="flex items-center gap-3 p-3 bg-[#111] border border-red-600/20 animate-fade-in">
 <span className="text-sm font-bold text-red-400 ">{selectedIds.size} selected</span>
 <div className="flex items-center gap-2 ml-auto">
 <button onClick={() => handleBulkStatus('printing')} className="px-3 py-1.5 text-xs font-bold bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30 transition-colors">
 <Icon name="print" className="text-sm mr-1" />Print
 </button>
 <button onClick={() => handleBulkStatus('ready')} className="px-3 py-1.5 text-xs font-bold bg-purple-900/20 text-purple-400 hover:bg-purple-900/30 transition-colors">
 <Icon name="check_circle" className="text-sm mr-1" />Ready
 </button>
 <button onClick={() => handleBulkStatus('completed')} className="px-3 py-1.5 text-xs font-bold bg-green-900/20 text-green-400 hover:bg-green-200 transition-colors">
 <Icon name="done_all" className="text-sm mr-1" />Complete
 </button>
 <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-bold bg-red-900/20 text-red-400 hover:bg-red-900/30 transition-colors">
 <Icon name="delete" className="text-sm mr-1" />Delete
 </button>
 <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs font-medium text-[#666] hover:bg-[#111] transition-colors">
 Clear
 </button>
 </div>
 </div>
 )}

 {/* Desktop Orders Table */}
 <div className="hidden md:block bg-[#050505] border border-[#333] overflow-hidden shadow-sm">
 {loading ? (
 <div className="p-6 space-y-4">
 {[1, 2, 3, 4, 5].map((i) => (
 <div key={i} className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-4 flex-1">
 <Skeleton className="size-10 " />
 <div className="space-y-2 flex-1">
 <Skeleton className="h-4 w-1/3" />
 <Skeleton className="h-3 w-1/4" />
 </div>
 </div>
 <Skeleton className="h-8 w-24 " />
 <Skeleton className="h-4 w-16" />
 <Skeleton className="size-8 " />
 </div>
 ))}
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr>
 <th className="py-3 px-3 w-10">
 <input
 type="checkbox"
 checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
 onChange={toggleSelectAll}
 className="rounded border-[#333] text-primary focus:ring-primary"
 aria-label="Select all orders"
 />
 </th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#666] ">OTP</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#666] ">User</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#666] ">Items</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#666] ">Payment</th>
 <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#666] ">Status</th>
 <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-[#666] ">Actions</th>
 </tr>
 </thead>
 <motion.tbody
 variants={{
 hidden: { opacity: 0 },
 visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
 }}
 initial="hidden"
 animate="visible"
 className="divide-y divide-[#1A1A1A]"
 >
 {filteredOrders.length === 0 ? (
 <tr>
 <td colSpan={7} className="py-12 text-center text-[#666] ">
 <div className="flex flex-col items-center justify-center">
 <Icon name="inbox" className="text-4xl text-[#666] mb-3" />
 <p>No orders found</p>
 </div>
 </td>
 </tr>
 ) : (
 filteredOrders.map((order) => (
 <motion.tr
 variants={{
 hidden: { opacity: 0, x: -10 },
 visible: { opacity: 1, x: 0 }
 }}
 key={order.id}
 className={`hover:bg-[#0A0A0A] /40 transition-colors cursor-pointer ${selectedIds.has(order.id) ? 'bg-[#111]/50' : ''}`}
 onClick={() => setSelectedOrder(order)}
 >
 <td className="py-4 px-3" onClick={(e) => e.stopPropagation()}>
 <input
 type="checkbox"
 checked={selectedIds.has(order.id)}
 onChange={() => toggleSelect(order.id)}
 className="rounded border-[#333] text-primary focus:ring-primary"
 aria-label={`Select order ${order.orderToken || order.id}`}
 />
 </td>
 <td className="py-4 px-4">
 <div className="flex flex-col items-start gap-1">
 {order.orderToken ? (
 <span className="font-mono text-sm font-black tracking-wider text-amber-700 bg-amber-900/20 px-2 py-0.5 border border-amber-900/50">
 {order.orderToken}
 </span>
 ) : (
 <span className="font-mono text-xs text-[#666]">—</span>
 )}
 <span className="text-[10px] text-[#666] font-mono">#{order.id.slice(-6)}</span>
 </div>
 </td>
 <td className="py-4 px-4">
 <div className="flex items-center gap-2">
 <div className={`size-8 flex items-center justify-center text-xs font-bold bg-primary/10 text-primary`}>
 {order.userName.charAt(0).toUpperCase()}
 </div>
 <span className="text-white font-medium">{order.userName}</span>
 </div>
 </td>

 <td className="py-4 px-4">
 <div className="flex items-center gap-2">
 {order.items && order.items.length > 0 ? (
 <>
 <Icon name="shopping_bag" className="text-primary text-lg" />
 <span className="text-[#666] truncate max-w-[150px]">
 {order.items.length} items
 </span>
 </>
 ) : (
 <>
 <Icon name="description" className="text-red-500 text-lg" />
 <span className="text-[#666] truncate max-w-[150px]">{order.fileName || 'Unknown File'}</span>
 </>
 )}
 </div>
 </td>
 <td className="py-4 px-4">
 <span className="font-semibold text-white ">
 ₹{order.totalAmount.toLocaleString()}
 </span>
 </td>
 <td className="py-4 px-4">
 <div className="flex flex-col items-center gap-1">
 <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${paymentColors[order.paymentStatus] || 'bg-[#111]'}`}>
 {order.paymentStatus}
 </span>
 </div>
 </td>
 <td className="py-4 px-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] || 'bg-[#111]'} `}>
 {order.status}
 </span>
 </td>
 <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() => setSelectedOrder(order)}
 className="p-2 text-[#666] hover:text-primary hover:bg-primary/10 transition-colors"
 title="View Details"
 >
 <Icon name="visibility" className="text-xl" />
 </button>

 {order.status === 'confirmed' && (
 <button
 onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'printing'); }}
 className="p-2 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
 title="Start Printing"
 >
 <Icon name="print" className="text-xl" />
 </button>
 )}
 {order.status === 'printing' && (
 <button
 onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
 className="p-2 bg-purple-900/20 text-purple-400 hover:bg-purple-600 hover:text-white transition-all"
 title="Mark Ready"
 >
 <Icon name="check_circle" className="text-xl" />
 </button>
 )}
 {order.status === 'ready' && (
 <button
 onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
 className="p-2 bg-green-900/20 text-green-400 hover:bg-green-600 hover:text-white transition-all"
 title="Mark Completed"
 >
 <Icon name="done_all" className="text-xl" />
 </button>
 )}

 {order.status === 'completed' && (
 <button
 onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
 className="p-2 bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white transition-all"
 title="Delete Order"
 >
 <Icon name="delete" className="text-xl" />
 </button>
 )}
 </div>
 </td>
 </motion.tr>
 ))
 )}
 </motion.tbody>
 </table>
 </div>
 )}
 </div>

 {/* Mobile Orders List (Card View) */}
 <div className="md:hidden space-y-4">
 {filteredOrders.length === 0 ? (
 <div className="py-12 text-center text-[#666] bg-[#0A0A0A] border border-[#333] ">
 <div className="flex flex-col items-center justify-center">
 <Icon name="inbox" className="text-4xl text-[#666] mb-3" />
 <p>No orders found</p>
 </div>
 </div>
 ) : (
 filteredOrders.map((order) => (
 <div
 key={order.id}
 className="bg-[#050505] border border-[#333] p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
 onClick={() => setSelectedOrder(order)}
 >
 {/* Header: OTP and Status */}
 <div className="flex justify-between items-start mb-3">
 <div>
 <div className="flex items-center gap-2 mb-1">
 {order.orderToken ? (
 <span className="font-mono text-sm font-black tracking-wider text-amber-700 bg-amber-900/20 px-2 py-0.5 border border-amber-900/50">
 {order.orderToken}
 </span>
 ) : null}
 <span className="font-mono text-[10px] text-[#666]">#{order.id.slice(-6)}</span>
 </div>

 <div className="flex items-center gap-2">
 <div className={`size-6 flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary`}>
 {order.userName.charAt(0).toUpperCase()}
 </div>
 <span className="font-bold text-white text-sm">
 {order.userName}
 </span>
 </div>
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${statusColors[order.status] || 'bg-[#111]'}`}>
 {order.status}
 </span>
 <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${paymentColors[order.paymentStatus] || 'bg-[#111]'}`}>
 {order.paymentStatus}
 </span>
 </div>
 </div>

 {/* Content: Items and Amount */}
 <div className="flex justify-between items-center py-3 border-t border-b border-[#333] /50 mb-3">
 <div className="flex items-center gap-2 text-sm text-[#666] ">
 {order.items && order.items.length > 0 ? (
 <>
 <Icon name="shopping_bag" className="text-primary" />
 <span>{order.items.length} items</span>
 </>
 ) : (
 <>
 <Icon name="description" className="text-red-500" />
 <span className="truncate max-w-[120px]">{order.fileName || 'File'}</span>
 </>
 )}
 </div>
 <span className="font-bold text-white ">
 ₹{order.totalAmount.toLocaleString()}
 </span>
 </div>

 {/* Actions Footer */}
 <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
 <button
 onClick={() => setSelectedOrder(order)}
 className="flex-1 py-2 bg-[#1A1A1A] text-[#666] font-bold text-xs hover:bg-[#333] transition-colors flex items-center justify-center gap-1.5"
 >
 <Icon name="visibility" className="text-sm" />
 View
 </button>

 {order.status === 'confirmed' && (
 <button
 onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'printing'); }}
 className="flex-1 py-2 bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20"
 >
 <Icon name="print" className="text-sm" />
 Print
 </button>
 )}
 {order.status === 'printing' && (
 <button
 onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
 className="flex-1 py-2 bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
 >
 <Icon name="check_circle" className="text-sm" />
 Ready
 </button>
 )}
 {order.status === 'ready' && (
 <button
 onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
 className="flex-1 py-2 bg-green-600 text-white font-bold text-xs hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20"
 >
 <Icon name="done_all" className="text-sm" />
 Complete
 </button>
 )}

 {order.status === 'completed' && (
 <button
 onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
 className="py-2 px-3 bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20"
 title="Delete Order"
 >
 <Icon name="delete" className="text-lg" />
 Delete
 </button>
 )}
 </div>
 </div>
 ))
 )}
 </div>

 {/* Order Details Modal */}
 {selectedOrder && (
 <OrderDetails
 order={selectedOrder}
 onClose={() => setSelectedOrder(null)}
 onStatusChange={updateOrderStatus}
 />
 )}

 {/* Notifications */}
 {toastMessage && (
 <Toast
 message={toastMessage.message}
 type={toastMessage.type}
 onClose={() => setToastMessage(null)}
 />
 )}
 </div>
 );
};
