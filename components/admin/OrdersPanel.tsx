import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { Toast } from '../ui/Toast';
import { OrderDetails } from './OrderDetails';
import { Order, OrderStatus } from '../../types';
import { fetchOrders, supabase } from '../../services/data';

export const OrdersPanel: React.FC = () => {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [toastMessage, setToastMessage] = useState<{ message: string, type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
    const prevOrdersCountRef = useRef<number>(0);

    const loadOrders = () => {
        const stored = localStorage.getItem('printwise_orders');
        if (stored) {
            try {
                const parsed: Order[] = JSON.parse(stored);
                setOrders(parsed);

                // Check for new orders
                if (prevOrdersCountRef.current > 0 && parsed.length > prevOrdersCountRef.current) {
                    const newOrder = parsed[0]; // Assuming new orders are at index 0
                    setToastMessage({
                        message: `New Order Received! ID: ${newOrder.id.split('-').slice(1, 3).join('-')}`,
                        type: 'success'
                    });
                }
                prevOrdersCountRef.current = parsed.length;
            } catch (e) {
                console.error("Failed to parse orders", e);
            }
        }
    };

    useEffect(() => {
        loadOrders();

        // Listen for storage events (updates from other tabs/windows)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'printwise_orders') {
                loadOrders();
            }
        };

        // Listen for custom events (updates from same window/tab if any)
        const handleCustomEvent = () => loadOrders();

        window.addEventListener('storage', handleStorageChange);
        // Dispatching a custom event on localStorage setItem isn't automatic, 
        // but for now storage event handles cross-tab which is the main use case suitable for this architecture.
        // We can simplisticly assume page refresh or just polling if needed, but 'storage' event is good for multi-tab.

        // Timer to poll every few seconds just in case (as 'storage' event might not fire in same tab if slightly buggy mechanism used)
        const interval = setInterval(loadOrders, 5000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        const { error } = await supabase
            .from('Order')
            .update({ status: newStatus.toUpperCase() })
            .eq('id', orderId);

        if (error) {
            console.error('Failed to update status', error);
            setToastMessage({ message: 'Failed to update status', type: 'error' });
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            setToastMessage({ message: `Order updated to ${newStatus}`, type: 'success' });

            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus, updatedAt: new Date() });
            }
        }
    };

    const statusColors: Record<string, string> = {
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        'confirmed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'printing': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
        'ready': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    const paymentColors: Record<string, string> = {
        'paid': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'unpaid': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        'failed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (order.fileName && order.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const statusCounts = {
        all: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        printing: orders.filter(o => o.status === 'printing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        completed: orders.filter(o => o.status === 'completed').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Manage print orders and track fulfillment
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                        <Icon name="download" className="text-lg mr-2" />
                        Export
                    </button>
                    {/* New Order functionality typically for student side, mostly just for display here */}
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'confirmed', 'printing', 'ready', 'completed'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${statusFilter === status
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-surface-light dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-border-light dark:border-border-dark'
                            }
            `}
                    >
                        <span className="capitalize">{status === 'all' ? 'All Orders' : status}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === status
                            ? 'bg-white/20'
                            : 'bg-slate-100 dark:bg-slate-700'
                            }`}>
                            {status === 'all' ? statusCounts.all : statusCounts[status]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                    type="text"
                    placeholder="Search by order ID, customer, or file..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary"
                />
            </div>

            {/* Orders Table */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border-light dark:border-border-dark">
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order ID</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Items/File</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light dark:divide-border-dark">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <Icon name="inbox" className="text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                                            <p>No orders found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <td className="py-4 px-4 font-mono text-sm">
                                            <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[120px] block" title={order.id}>{order.id}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary`}>
                                                    {order.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-slate-900 dark:text-white font-medium">{order.userName}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                {order.items && order.items.length > 0 ? (
                                                    <>
                                                        <Icon name="shopping_bag" className="text-primary text-lg" />
                                                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                                                            {order.items.length} items
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icon name="description" className="text-red-500 text-lg" />
                                                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{order.fileName || 'Unknown File'}</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                ₹{order.totalAmount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentColors[order.paymentStatus] || 'bg-gray-100'}`}>
                                                {order.paymentStatus}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Icon name="visibility" className="text-lg" />
                                                </button>
                                                {order.status === 'confirmed' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'printing'); }}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                        title="Start Printing"
                                                    >
                                                        <Icon name="print" className="text-lg" />
                                                    </button>
                                                )}
                                                {order.status === 'printing' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                        title="Mark Ready"
                                                    >
                                                        <Icon name="check_circle" className="text-lg" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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
