import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { OrderDetails } from './OrderDetails';

// Local Order type compatible with Types.Order
interface LocalOrder {
    id: string;
    user: { name: string; avatar?: string; initials: string; color: string };
    file: { name: string };
    specs: { summary: string; pages: number };
    copies: number;
    amount: number;
    status: 'Pending' | 'Printing' | 'Shipped' | 'On Hold';
    paymentStatus: 'Paid' | 'Unpaid';
}

export const OrdersPanel: React.FC = () => {
    const [selectedOrder, setSelectedOrder] = useState<LocalOrder | null>(null);
    const [orders, setOrders] = useState<LocalOrder[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const statusColors = {
        'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        'Printing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'Shipped': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        'On Hold': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };

    const paymentColors = {
        'Paid': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'Unpaid': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.file.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const statusCounts = {
        all: orders.length,
        Pending: orders.filter(o => o.status === 'Pending').length,
        Printing: orders.filter(o => o.status === 'Printing').length,
        Shipped: orders.filter(o => o.status === 'Shipped').length,
        'On Hold': orders.filter(o => o.status === 'On Hold').length,
    };

    const handleStatusChange = (orderId: string, newStatus: LocalOrder['status']) => {
        setOrders(prev => prev.map(order =>
            order.id === orderId ? { ...order, status: newStatus } : order
        ));
        setSelectedOrder(null);
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
                    <button className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover transition-colors">
                        <Icon name="add" className="text-lg mr-2" />
                        New Order
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'Pending', 'Printing', 'Shipped', 'On Hold'] as const).map((status) => (
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
                            {statusCounts[status]}
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
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">File</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Specs</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Amount</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light dark:divide-border-dark">
                            {filteredOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <td className="py-4 px-4">
                                        <span className="font-semibold text-slate-900 dark:text-white">{order.id}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            {order.user.avatar ? (
                                                <div
                                                    className="size-8 rounded-full bg-slate-200 bg-cover bg-center"
                                                    style={{ backgroundImage: `url("${order.user.avatar}")` }}
                                                />
                                            ) : (
                                                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${order.user.color}`}>
                                                    {order.user.initials}
                                                </div>
                                            )}
                                            <span className="text-slate-900 dark:text-white">{order.user.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <Icon name="description" className="text-red-500 text-lg" />
                                            <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{order.file.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div>
                                            <p className="text-slate-900 dark:text-white text-sm">{order.specs.summary}</p>
                                            <p className="text-xs text-slate-500">{order.specs.pages} pages × {order.copies}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            ₹{order.amount.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentColors[order.paymentStatus]}`}>
                                            {order.paymentStatus}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
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
                                            {order.status === 'Pending' && (
                                                <button
                                                    onClick={() => handleStatusChange(order.id, 'Printing')}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                    title="Start Printing"
                                                >
                                                    <Icon name="print" className="text-lg" />
                                                </button>
                                            )}
                                            {order.status === 'Printing' && (
                                                <button
                                                    onClick={() => handleStatusChange(order.id, 'Shipped')}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                                    title="Mark Shipped"
                                                >
                                                    <Icon name="local_shipping" className="text-lg" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredOrders.length === 0 && (
                    <div className="py-12 text-center">
                        <Icon name="inbox" className="text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No orders found</p>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetails
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onStatusChange={handleStatusChange}
                />
            )}
        </div>
    );
};
