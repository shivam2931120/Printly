import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { OrderTimeline, mockOrderEvents } from './OrderTimeline';

// Order interface compatible with OrdersPanel.LocalOrder
interface Order {
    id: string;
    user: { name: string; avatar?: string; initials: string; color: string };
    file: { name: string };
    specs: { summary: string; pages: number };
    copies: number;
    amount: number;
    status: 'Pending' | 'Printing' | 'Shipped' | 'On Hold';
    paymentStatus: 'Paid' | 'Unpaid';
    paperSize?: string;
    orientation?: string;
}

interface OrderDetailsProps {
    order: Order;
    onClose: () => void;
    onStatusChange?: (orderId: string, newStatus: Order['status']) => void;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onClose, onStatusChange }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon name="receipt_long" className="text-2xl text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{order.id}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                                    {order.status}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentColors[order.paymentStatus]}`}>
                                    {order.paymentStatus}
                                </span>
                            </div>
                        </div>
                    </div>
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
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Order Details
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'timeline'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Activity Timeline
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {activeTab === 'details' ? (
                        <div className="space-y-6">
                            {/* Customer Info */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Customer</h3>
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    {order.user.avatar ? (
                                        <div
                                            className="size-12 rounded-full bg-slate-200 bg-cover bg-center"
                                            style={{ backgroundImage: `url("${order.user.avatar}")` }}
                                        />
                                    ) : (
                                        <div className={`size-12 rounded-full flex items-center justify-center text-lg font-bold ${order.user.color || 'bg-slate-200'}`}>
                                            {order.user.initials}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{order.user.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">customer@email.com</p>
                                    </div>
                                </div>
                            </section>

                            {/* File Info */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">File</h3>
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-border-light dark:border-border-dark">
                                    <div className="size-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                        <Icon name="picture_as_pdf" className="text-2xl text-red-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate">{order.file.name}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{order.specs.pages} pages</p>
                                    </div>
                                    <button className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors">
                                        <Icon name="download" className="text-xl" />
                                    </button>
                                </div>
                            </section>

                            {/* Print Specifications */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Print Specifications</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailRow icon="content_copy" label="Copies" value={order.copies.toString()} />
                                    <DetailRow icon="description" label="Paper Size" value={order.paperSize} />
                                    <DetailRow icon="crop_rotate" label="Orientation" value={order.orientation} />
                                    <DetailRow icon="palette" label="Print Mode" value={order.specs.summary.split(',')[0]} />
                                    <DetailRow icon="menu_book" label="Binding" value={order.specs.summary.includes('Spiral') ? 'Spiral' : order.specs.summary.includes('Soft') ? 'Soft Cover' : 'None'} />
                                    <DetailRow icon="pages" label="Total Pages" value={`${order.specs.pages * order.copies}`} />
                                </div>
                            </section>

                            {/* Pricing */}
                            <section>
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Pricing</h3>
                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-slate-600 dark:text-slate-400">Total Amount</span>
                                        <span className="text-3xl font-bold text-green-700 dark:text-green-400">
                                            ₹{order.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    ) : (
                        <OrderTimeline events={mockOrderEvents} />
                    )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex gap-2">
                        {order.status === 'Pending' && (
                            <button
                                onClick={() => onStatusChange?.(order.id, 'Printing')}
                                className="px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary-hover transition-colors flex items-center gap-2"
                            >
                                <Icon name="print" className="text-lg" />
                                Start Printing
                            </button>
                        )}
                        {order.status === 'Printing' && (
                            <button
                                onClick={() => onStatusChange?.(order.id, 'Shipped')}
                                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors flex items-center gap-2"
                            >
                                <Icon name="local_shipping" className="text-lg" />
                                Mark Shipped
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

// Detail Row Component
const DetailRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <Icon name={icon} className="text-lg text-slate-400" />
        <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="font-medium text-slate-900 dark:text-white">{value}</p>
        </div>
    </div>
);
