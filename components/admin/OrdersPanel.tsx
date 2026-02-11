import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../ui/Icon';
import { Toast } from '../ui/Toast';
import { OrderDetails } from './OrderDetails';
import { Order, OrderStatus } from '../../types';
import { fetchOrders, fetchAdminOrders, supabase } from '../../services/data';
import { Skeleton } from '../ui/Skeleton'; // Added Skeleton import

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
    const [loading, setLoading] = useState(true); // Added loading state

    const loadOrders = async () => {
        setLoading(true); // Set loading to true before fetching
        try {
            let data;
            if (currentUserId) {
                // Admin specific fetch (bypassing RLS via RPC)
                data = await fetchAdminOrders(currentUserId);
            } else {
                // Fallback to regular fetch (though this component is admin-only)
                data = await fetchOrders();
            }
            setOrders(data);

            // Check for new orders
            if (prevOrdersCountRef.current > 0 && data.length > prevOrdersCountRef.current) {
                const newOrder = data[0];
                setToastMessage({
                    message: `New Order Received! ID: ${newOrder.id.split('-')[1] || newOrder.id} `,
                    type: 'success'
                });
            }
            prevOrdersCountRef.current = data.length;
        } catch (error) {
            console.error("Failed to fetch orders", error);
            setToastMessage({ message: 'Failed to load orders', type: 'error' });
        } finally {
            setLoading(false); // Set loading to false after fetching, regardless of success or error
        }
    };

    useEffect(() => {
        loadOrders();

        // Polling fallback every 30 seconds (slower since we have realtime)
        const interval = setInterval(loadOrders, 30000);

        // Real-time subscription for instant updates
        const channel = supabase
            .channel('admin-orders-sync')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for ALL changes (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'Order'
                },
                (payload) => {
                    console.log('Real-time order update received:', payload);
                    loadOrders(); // Refresh the list
                }
            )
            .subscribe((status) => {
                console.log('Real-time subscription status:', status);
            });

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
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
            setToastMessage({ message: `Order updated to ${newStatus} `, type: 'success' });

            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus, updatedAt: new Date() });
            }
        }
    };

    const deleteOrder = async (orderId: string) => {
        if (!window.confirm('Are you sure you want to permanently delete this order? This action cannot be undone.')) {
            return;
        }

        const { error } = await supabase
            .from('Order')
            .delete()
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

        const headers = ['Order ID', 'Date', 'Customer', 'Email', 'Items', 'Total Amount', 'Status', 'Payment'];
        const csvContent = [
            headers.join(','),
            ...filteredOrders.map(order => {
                const itemsCount = order.items ? order.items.length : (order.fileName ? 1 : 0);
                const itemsDesc = order.items ? `${itemsCount} items` : order.fileName || 'N/A';

                return [
                    order.id,
                    new Date(order.createdAt).toLocaleDateString(),
                    `"${order.userName}"`,
                    order.userEmail,
                    `"${itemsDesc}"`,
                    order.totalAmount,
                    order.status,
                    order.paymentStatus
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
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
                            inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all
                            ${statusFilter === status
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md transform scale-105'
                                : 'bg-surface-light dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-light dark:border-border-dark'
                            }
                        `}
                    >
                        <span className="capitalize">{status === 'all' ? 'All Orders' : status}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === status
                            ? 'bg-white/20 dark:bg-black/10'
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

            {/* Desktop Orders Table */}
            <div className="hidden md:block bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl rounded-xl border border-border-light dark:border-border-dark overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <Skeleton className="size-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/4" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-24 rounded-full" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="size-8 rounded-lg" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">ID</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Items</th>
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
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentColors[order.paymentStatus] || 'bg-gray-100'}`}>
                                                        {order.paymentStatus}
                                                    </span>
                                                    {order.status === 'cancelled' && order.paymentStatus === 'paid' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200 shadow-sm animate-pulse">
                                                            Refund Needed
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100'} `}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-2 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Icon name="visibility" className="text-xl" />
                                                    </button>

                                                    {order.status === 'confirmed' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'printing'); }}
                                                            className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white transition-all"
                                                            title="Start Printing"
                                                        >
                                                            <Icon name="print" className="text-xl" />
                                                        </button>
                                                    )}
                                                    {order.status === 'printing' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
                                                            className="p-2 rounded-lg bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-600 dark:hover:text-white transition-all"
                                                            title="Mark Ready"
                                                        >
                                                            <Icon name="check_circle" className="text-xl" />
                                                        </button>
                                                    )}
                                                    {order.status === 'ready' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
                                                            className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-600 hover:text-white dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white transition-all"
                                                            title="Mark Completed"
                                                        >
                                                            <Icon name="done_all" className="text-xl" />
                                                        </button>
                                                    )}

                                                    {(order.status === 'completed' || order.status === 'cancelled') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                                                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white transition-all"
                                                            title="Delete Order"
                                                        >
                                                            <Icon name="delete" className="text-xl" />
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
                )}
            </div>

            {/* Mobile Orders List (Card View) */}
            <div className="md:hidden space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 dark:text-slate-400 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                        <div className="flex flex-col items-center justify-center">
                            <Icon name="inbox" className="text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                            <p>No orders found</p>
                        </div>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div
                            key={order.id}
                            className="bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-xl rounded-xl border border-border-light dark:border-border-dark p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedOrder(order)}
                        >
                            {/* Header: ID and Status */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 block mb-1">
                                        {order.id}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/10 text-primary`}>
                                            {order.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                                            {order.userName}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusColors[order.status] || 'bg-gray-100'}`}>
                                        {order.status}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${paymentColors[order.paymentStatus] || 'bg-gray-100'}`}>
                                        {order.paymentStatus}
                                    </span>
                                </div>
                            </div>

                            {/* Content: Items and Amount */}
                            <div className="flex justify-between items-center py-3 border-t border-b border-border-light dark:border-border-dark/50 mb-3">
                                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
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
                                <span className="font-bold text-slate-900 dark:text-white">
                                    ₹{order.totalAmount.toLocaleString()}
                                </span>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <Icon name="visibility" className="text-sm" />
                                    View
                                </button>

                                {order.status === 'confirmed' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'printing'); }}
                                        className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20"
                                    >
                                        <Icon name="print" className="text-sm" />
                                        Print
                                    </button>
                                )}
                                {order.status === 'printing' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}
                                        className="flex-1 py-2 rounded-lg bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
                                    >
                                        <Icon name="check_circle" className="text-sm" />
                                        Ready
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'completed'); }}
                                        className="flex-1 py-2 rounded-lg bg-green-600 text-white font-bold text-xs hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-green-500/20"
                                    >
                                        <Icon name="done_all" className="text-sm" />
                                        Complete
                                    </button>
                                )}

                                {(order.status === 'completed' || order.status === 'cancelled') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                                        className="py-2 px-3 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-500/20"
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
