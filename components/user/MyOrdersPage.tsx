import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Package,
    Calendar,
    ChevronRight,
    Ban
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useOrderStore } from '../../store/useOrderStore';
import { Order } from '../../types';
import { fetchOrders, cancelOrder } from '../../services/data';
import { Skeleton } from '../ui/Skeleton';
import { OrderTracker } from './OrderTracker';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: Clock, label: 'Pending' },
    confirmed: { color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: CheckCircle2, label: 'Confirmed' },
    printing: { color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: Loader2, label: 'Printing' },
    ready: { color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle2, label: 'Ready for Pickup' },
    completed: { color: 'text-text-muted bg-white/5 border-white/10', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: XCircle, label: 'Cancelled' },
};

export const MyOrdersPage: React.FC = () => {
    const { user, isLoaded } = useUser();
    const { orders: storeOrders, setOrders } = useOrderStore();
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const navigate = useNavigate();

    // Fetch latest orders on mount
    React.useEffect(() => {
        const loadOrders = async () => {
            if (user?.id) {
                try {
                    const data = await fetchOrders(user.id);
                    setOrders(data);
                } catch (error) {
                    console.error('Failed to sync orders:', error);
                } finally {
                    setLoading(false);
                }
            } else if (isLoaded && !user) {
                setLoading(false); // No user, stop loading
            }
        };

        if (isLoaded) {
            loadOrders();
        }
    }, [isLoaded, user?.id, setOrders]);

    // Derived state for orders (sorting)
    const orders = storeOrders.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getOrderSummary = (order: Order) => {
        if (order.items && order.items.length > 0) {
            const printItems = order.items.filter(i => i.type === 'print');
            const productItems = order.items.filter(i => i.type === 'product');

            const summaryParts = [];
            if (printItems.length > 0) summaryParts.push(`${printItems.length} Document${printItems.length > 1 ? 's' : ''}`);
            if (productItems.length > 0) summaryParts.push(`${productItems.length} Item${productItems.length > 1 ? 's' : ''}`);

            return summaryParts.join(' • ');
        }
        return order.fileName || 'Order Details';
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) return;

        setCancellingId(orderId);
        try {
            if (!user?.id) return;

            const result = await cancelOrder(orderId, user.id);

            if (!result.success) {
                alert(result.error || 'Failed to cancel order.');
                return;
            }

            // Optimistic update
            setOrders(storeOrders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));

        } catch (error) {
            console.error('Failed to cancel order:', error);
            alert('Failed to cancel order. Please try again.');
        } finally {
            setCancellingId(null);
        }
    };

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(o => o.status.toLowerCase() === filterStatus);

    if (!isLoaded) return (
        <div className="max-w-5xl mx-auto space-y-8 p-4">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-16 w-32 rounded-xl" />
                    <Skeleton className="h-16 w-32 rounded-xl" />
                </div>
            </div>
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                ))}
            </div>
        </div>
    );

    if (loading) return (
        <div className="max-w-5xl mx-auto space-y-8 p-4">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-16 w-32 rounded-xl" />
                    <Skeleton className="h-16 w-32 rounded-xl" />
                </div>
            </div>
            {/* List Skeleton */}
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-48 w-full rounded-2xl" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-20 max-w-5xl mx-auto">

            {/* Dashboard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-2 text-sm"
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </button>
                    <h1 className="text-3xl font-bold text-white font-display">My Orders</h1>
                    <p className="text-text-muted mt-1">Track pending jobs and view history</p>
                </div>

                {/* Stats Cards (Mini) */}
                <div className="flex gap-4">
                    <div className="px-4 py-3 bg-background-card border border-border rounded-xl">
                        <p className="text-xs text-text-muted uppercase font-bold">Total Spent</p>
                        <p className="text-lg font-bold text-white">₹{orders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(0)}</p>
                    </div>
                    <div className="px-4 py-3 bg-background-card border border-border rounded-xl">
                        <p className="text-xs text-text-muted uppercase font-bold">Active Jobs</p>
                        <p className="text-lg font-bold text-white">{orders.filter(o => ['pending', 'printing', 'confirmed'].includes(o.status.toLowerCase())).length}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 pb-2">
                {['all', 'pending', 'printing', 'completed', 'cancelled'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all border capitalize",
                            filterStatus === status
                                ? "bg-white text-black border-white"
                                : "bg-transparent text-text-muted border-border hover:border-white/20 hover:text-white"
                        )}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length > 0 ? (
                <div className="grid gap-4">
                    {filteredOrders.map((order) => {
                        const status = statusConfig[order.status.toLowerCase()] || statusConfig.pending;
                        const StatusIcon = status.icon;

                        return (
                            <div
                                key={order.id}
                                className="group relative bg-background-card border border-border rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                                        {/* Left Info */}
                                        <div className="flex items-start gap-4">
                                            <div className={cn("size-10 rounded-full flex items-center justify-center shrink-0 border", status.color)}>
                                                <StatusIcon size={18} className={order.status === 'printing' ? 'animate-spin' : ''} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-bold text-white text-lg">{getOrderSummary(order)}</span>
                                                    <span className={cn("text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-opacity-10", status.color)}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-text-muted">
                                                    <span className="font-mono">#{order.id.slice(-6)}</span>
                                                    {order.otp && (
                                                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded border border-blue-500/30 tracking-wider">
                                                            OTP: {order.otp}
                                                        </span>
                                                    )}
                                                    <span>•</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={14} />
                                                        {formatDate(order.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Info */}
                                        <div className="flex items-end flex-col gap-2">
                                            <span className="text-2xl font-bold text-white">₹{order.totalAmount.toFixed(2)}</span>
                                            <div className="flex items-center gap-2">
                                                {order.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order.id)}
                                                        disabled={cancellingId === order.id}
                                                        className="text-sm px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors flex items-center gap-1.5"
                                                    >
                                                        {cancellingId === order.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <Ban size={12} />
                                                        )}
                                                        Cancel
                                                    </button>
                                                )}
                                                <button className="text-sm text-text-muted hover:text-white flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5">
                                                    View Details <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Tracker */}
                                    <div className="mt-6 pt-6 border-t border-border">
                                        <OrderTracker status={order.status} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-background-card/50 rounded-3xl border border-dashed border-border">
                    <Package size={48} className="text-text-muted opacity-20 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-white">No orders found</h3>
                    <p className="text-text-muted mt-1 mb-6">You haven't placed any orders in this category yet.</p>
                    {filterStatus !== 'all' && (
                        <Button variant="outline" onClick={() => setFilterStatus('all')}>
                            View all orders
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
