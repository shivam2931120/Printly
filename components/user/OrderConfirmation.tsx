import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { PrintOptions } from '../../types';

interface OrderConfirmationProps {
    order: {
        id: string;
        tokenNumber: string;
        fileName: string;
        pageCount: number;
        options: PrintOptions;
        totalAmount: number;
        status: string;
        createdAt: string;
        estimatedReady?: string;
    };
    onClose: () => void; // Keeping onClose to clear state in parent, but might add nav
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
    order,
    onClose,
}) => {
    const navigate = useNavigate();

    const handleViewOrders = () => {
        onClose(); // Clear modal state first
        navigate('/my-orders');
    };

    const handleClose = () => {
        onClose(); // Just close modal, stay on page (or nav to home?)
        // Usually "New Order" implies staying on dashboard/home
    };
    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const getBindingLabel = (binding: string) => {
        const labels: Record<string, string> = {
            none: 'No Binding',
            spiral: 'Spiral Binding',
            softcover: 'Soft Cover',
            hardcover: 'Hard Cover',
        };
        return labels[binding] || binding;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Success Header */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center text-white">
                    <div className="inline-flex items-center justify-center size-20 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                        <Icon name="check_circle" className="text-5xl" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Order Confirmed!</h2>
                    <p className="text-white/80">Your print order has been placed successfully</p>
                </div>

                {/* Token Display */}
                <div className="p-6 border-b border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-2">Your Token Number</p>
                    <div className="flex items-center justify-center gap-1">
                        {order.tokenNumber.split('').map((char, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center justify-center w-10 h-12 bg-white dark:bg-slate-700 rounded-lg border-2 border-primary text-2xl font-bold text-primary shadow-sm"
                            >
                                {char}
                            </span>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-3">
                        <Icon name="info" className="text-xs align-middle mr-1" />
                        Show this token at the print shop to collect your order
                    </p>
                </div>

                {/* Order Details */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                        <div className="size-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <Icon name="picture_as_pdf" className="text-xl text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{order.fileName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {order.pageCount} pages • {order.options.copies} {order.options.copies > 1 ? 'copies' : 'copy'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                            <p className="text-slate-500 dark:text-slate-400">Paper Size</p>
                            <p className="font-medium text-slate-900 dark:text-white">{order.options.paperSize.toUpperCase()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                            <p className="text-slate-500 dark:text-slate-400">Print Type</p>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {order.options.colorMode === 'color' ? 'Color' : 'Black & White'}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                            <p className="text-slate-500 dark:text-slate-400">Sides</p>
                            <p className="font-medium text-slate-900 dark:text-white">
                                {order.options.sides === 'single' ? 'Single-sided' : 'Double-sided'}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                            <p className="text-slate-500 dark:text-slate-400">Binding</p>
                            <p className="font-medium text-slate-900 dark:text-white">{getBindingLabel(order.options.binding)}</p>
                        </div>
                    </div>

                    {/* Total & Time */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/20">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Paid</p>
                            <p className="text-2xl font-bold text-primary">₹{order.totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Ordered On</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDateTime(order.createdAt)}</p>
                        </div>
                    </div>

                    {order.estimatedReady && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <Icon name="schedule" className="text-yellow-600 dark:text-yellow-400" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Estimated ready by <strong>{order.estimatedReady}</strong>
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 pt-0">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3 rounded-xl border border-border-light dark:border-border-dark text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        New Order
                    </button>
                    <button
                        onClick={handleViewOrders}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                        <Icon name="receipt_long" />
                        View My Orders
                    </button>
                </div>
            </div>
        </div>
    );
};

// Generate a unique 6-character alphanumeric token
export const generateOrderToken = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters (0, O, I, 1)
    let token = '';
    for (let i = 0; i < 6; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};
