import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { fetchOrders } from '../../services/data';
import { userStorage, ordersStorage } from '../../services/storage';

import { Order } from '../../types';

interface MyOrdersPageProps {
    onBack: () => void;
}

const statusColors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Printing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ onBack }) => {
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        const loadOrders = async () => {
            const user = userStorage.get();
            if (user?.id) {
                // Logged in user - fetch from API
                const dbOrders = await fetchOrders(user.id);
                setOrders(dbOrders);
            } else {
                // Guest user with no session - show empty or handle via cookie if implemented later
                setOrders([]);
            }
        };

        loadOrders();
    }, []);

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getSpecsString = (order: Order) => {
        if (!order.options) return 'Standard Print';
        const { paperSize, colorMode, sides, binding } = order.options;
        const parts = [
            paperSize?.toUpperCase(),
            colorMode === 'color' ? 'Color' : 'B&W',
            sides === 'double' ? 'Double-sided' : 'Single-sided',
            binding !== 'none' ? binding.charAt(0).toUpperCase() + binding.slice(1) + ' Binding' : null,
        ].filter(Boolean);
        return parts.join(', ');
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                            <span className="font-medium">Back</span>
                        </button>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">My Orders</h1>
                        <div className="w-20"></div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Order History</h2>
                    <p className="text-slate-500 dark:text-slate-400">View and track all your print orders</p>
                </div>

                {/* Orders List */}
                {orders.length > 0 ? (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            {order.orderToken && (
                                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-bold">
                                                    #{order.orderToken}
                                                </span>
                                            )}
                                            <span className="font-bold text-slate-900 dark:text-white">{order.id.split('-')[0]}-{order.id.split('-')[1]}</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || statusColors.confirmed}`}>
                                                {order.status === 'confirmed' ? 'Confirmed' : order.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(order.createdAt)}</p>
                                    </div>
                                    <span className="text-xl font-bold text-primary">₹{order.totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-lg bg-background-light dark:bg-background-dark">
                                    <Icon name="picture_as_pdf" className="text-red-500 text-xl shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                                            {order.fileName || 'Print Job'} ({order.pageCount || 0} pages)
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{getSpecsString(order)}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button className="flex-1 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                        View Details
                                    </button>
                                    {order.status === 'completed' && (
                                        <button className="flex-1 py-2 rounded-lg text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
                                            Reorder
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="text-center py-16">
                        <Icon name="receipt_long" className="text-5xl text-slate-300 dark:text-slate-600 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No orders yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">Start by uploading a document to print</p>
                        <button
                            onClick={onBack}
                            className="px-6 py-2.5 rounded-lg bg-primary text-white font-bold text-sm hover:bg-primary-hover transition-colors"
                        >
                            Upload Document
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};
