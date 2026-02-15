import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { OrderTimeline, generateOrderEvents } from './OrderTimeline';
import { OrderTracker } from '../user/OrderTracker';
import { Order, CartItem, OrderStatus } from '../../types';
import { supabase } from '../../services/data';

interface OrderDetailsProps {
    order: Order;
    onClose: () => void;
    onStatusChange?: (orderId: string, newStatus: OrderStatus) => void;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order: initialOrder, onClose, onStatusChange }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');
    const [order, setOrder] = useState<Order>(initialOrder);

    // Subscribe to real-time updates
    useEffect(() => {
        const channel = supabase
            .channel(`order_${order.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'Order', filter: `id=eq.${order.id}` },
                (payload) => {
                    if (payload.new && payload.new.status) {
                        const updatedOrder = { ...order, ...payload.new, status: payload.new.status.toLowerCase() as OrderStatus };
                        setOrder(updatedOrder);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [order.id]);

    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        'printing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        'ready': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'confirmed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    };

    const paymentColors = {
        'paid': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        'unpaid': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        'failed': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };



    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden glass rounded-2xl shadow-2xl animate-zoom-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <Icon name="receipt_long" className="text-2xl text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                Order #{order.id.slice(-8).toUpperCase()}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-slate-100'}`}>
                                    {order.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentColors[order.paymentStatus] || 'bg-slate-100'}`}>
                                    {order.paymentStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Pickup OTP - prominent display for verification */}
                    {order.orderToken && (
                        <div className="flex flex-col items-center mr-2">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Pickup OTP</span>
                            <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-600 border-dashed">
                                <span className="text-lg font-black font-mono tracking-[0.2em] text-amber-700 dark:text-amber-400">
                                    {order.orderToken}
                                </span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Icon name="close" className="text-xl" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border-light dark:border-border-dark px-6">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Order Details
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline'
                            ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Activity Timeline
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain no-scrollbar">
                    {activeTab === 'details' ? (
                        <div className="space-y-4">
                            {/* Customer & Status Grid */}
                            <div className="space-y-4">
                                {/* Status - Full Width for better visibility */}
                                <section>
                                    <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
                                        <OrderTracker
                                            status={order.status}
                                            onStepClick={(newStatus) => onStatusChange?.(order.id, newStatus)}
                                            className="w-full"
                                        />
                                    </div>
                                </section>

                                {/* Customer Info */}
                                <section>
                                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Customer Details</h3>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-white/10 backdrop-blur-sm">
                                        <div className="size-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {order.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-900 dark:text-white">{order.userName}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{order.userEmail}</p>
                                        </div>
                                        {/* Inline OTP for quick glance */}
                                        {order.orderToken && order.status !== 'completed' && (
                                            <div className="flex flex-col items-center px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">OTP</span>
                                                <span className="text-sm font-black font-mono tracking-wider text-amber-700 dark:text-amber-400">
                                                    {order.orderToken}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Order Items */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                    items ({order.items.length})
                                </h3>
                                <div className="space-y-3">
                                    {order.items.map((item, index) => (
                                        <div key={item.id || index} className="p-4 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-darker">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex gap-4">
                                                    {/* Icon/Image */}
                                                    <div className="size-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-xl">
                                                        {item.type === 'product' ? (item.image || '📦') : <Icon name="description" className="text-red-500" />}
                                                    </div>

                                                    {/* Details */}
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 dark:text-white">{item.name}</h4>
                                                        {item.type === 'print' ? (
                                                            <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1 mt-1">
                                                                <p>{item.pageCount} pages • {item.options.copies} copies</p>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                                        {item.options.colorMode}
                                                                    </span>
                                                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                                        {item.options.paperSize}
                                                                    </span>
                                                                    <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                                        {item.options.sides}
                                                                    </span>
                                                                    {item.options.binding !== 'none' && (
                                                                        <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-900/50">
                                                                            Binding: {item.options.binding}
                                                                        </span>
                                                                    )}
                                                                    {item.options.holePunch && (
                                                                        <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900/50">
                                                                            Hole Punch
                                                                        </span>
                                                                    )}
                                                                    {item.options.coverPage !== 'none' && (
                                                                        <span className="text-xs bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-900/50">
                                                                            Cover: {item.options.coverPage}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.fileUrl && (
                                                                    <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border-light dark:border-border-dark/50">
                                                                        <a
                                                                            href={item.fileUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors shadow-sm"
                                                                        >
                                                                            <Icon name="print" className="text-base" />
                                                                            Print
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                                Quantity: {item.quantity}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-900 dark:text-white">₹{(item.price * item.quantity).toFixed(2)}</p>
                                                    {item.quantity > 1 && (
                                                        <p className="text-xs text-slate-500">₹{item.price} each</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Legacy Single File Support (if items is empty but file exists) */}
                            {(!order.items || order.items.length === 0) && order.fileName && (
                                <section>
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Legacy File</h3>
                                    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <p className="font-bold">{order.fileName}</p>
                                        <p className="text-sm text-gray-500">{order.pageCount} pages</p>
                                    </div>
                                </section>
                            )}

                            {/* Total Pricing */}
                            <section>
                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-slate-600 dark:text-slate-400 font-medium">Total Amount</span>
                                        <span className="text-3xl font-bold text-green-700 dark:text-green-400">
                                            ₹{order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {order.paymentId && (
                                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/30 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wider">Payment ID</span>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(order.paymentId || '')}
                                                className="flex items-center gap-2 text-xs font-mono bg-white dark:bg-black/20 px-2 py-1 rounded border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                                title="Click to Copy"
                                            >
                                                {order.paymentId}
                                                <Icon name="content_copy" className="text-[10px]" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    ) : (
                        <OrderTimeline events={generateOrderEvents(order)} />
                    )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex gap-2">
                        {/* Action buttons based on status */}
                        {order.status === 'confirmed' && (
                            <button
                                onClick={() => onStatusChange?.(order.id, 'printing')}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                            >
                                <Icon name="print" className="text-lg" />
                                Start Printing
                            </button>
                        )}
                        {order.status === 'printing' && (
                            <button
                                onClick={() => onStatusChange?.(order.id, 'ready')}
                                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <Icon name="check_circle" className="text-lg" />
                                Mark Ready
                            </button>
                        )}
                        {order.status === 'ready' && (
                            <button
                                onClick={() => onStatusChange?.(order.id, 'completed')}
                                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                                <Icon name="done_all" className="text-lg" />
                                Mark Completed
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-border-light dark:border-border-dark text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
