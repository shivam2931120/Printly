import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    Loader2,
    Package,
    ChevronRight,
    Copy,
    Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { useOrderStore } from '../../store/useOrderStore';
import { Order } from '../../types';
import { fetchOrders, markOrderCollected, supabase } from '../../services/data';
import { toast } from 'sonner';
import { Skeleton } from '../ui/Skeleton';
import { OrderTracker } from './OrderTracker';

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
    pending: { color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20', icon: Clock, label: 'Pending' },
    confirmed: { color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: CheckCircle2, label: 'Confirmed' },
    printing: { color: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: Loader2, label: 'Printing' },
    ready: { color: 'text-green-500 bg-green-500/10 border-green-500/20', icon: CheckCircle2, label: 'Ready for Pickup' },
    completed: { color: 'text-text-muted bg-white/5 border-white/10', icon: CheckCircle2, label: 'Completed' },
};

export const MyOrdersPage: React.FC = () => {
    const { user, isLoaded } = useAuth();
    const { orders: storeOrders, setOrders } = useOrderStore();
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyOtp = useCallback((orderId: string, otp: string) => {
        navigator.clipboard.writeText(otp).then(() => {
            setCopiedId(orderId);
            toast.success('OTP copied!');
            setTimeout(() => setCopiedId(null), 2000);
        }).catch(() => toast.error('Failed to copy'));
    }, []);

    // Fetch latest orders on mount — use email-based query as fast fallback
    React.useEffect(() => {
        let cancelled = false;
        const loadOrders = async () => {
            if (!user) {
                if (isLoaded) setLoading(false);
                return;
            }
            try {
                // Try userId first, but also accept temp_ users by fetching via email
                const userId = user.id.startsWith('temp_') ? undefined : user.id;
                const data = await fetchOrders(userId, user.email);
                if (!cancelled) setOrders(data);
            } catch (error) {
                console.error('Failed to sync orders:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (isLoaded || user) {
            loadOrders();

            // Real-time subscription for instant order updates
            const userId = user?.id;
            const channel = userId ? supabase
                .channel(`student-orders-${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'Order',
                        filter: `userId=eq.${userId}`,
                    },
                    () => { loadOrders(); }
                )
                .subscribe() : null;

            // Fallback polling every 60s
            const interval = setInterval(loadOrders, 60000);
            return () => {
                cancelled = true;
                clearInterval(interval);
                if (channel) supabase.removeChannel(channel);
            };
        }
    }, [isLoaded, user?.id, user?.email, setOrders]);

    // Derived state for orders (sorting)
    const orders = storeOrders.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );



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

    const handleMarkCollected = async (orderId: string) => {
        if (!confirm('Have you collected this order? This will mark it as completed.')) return;

        try {
            const result = await markOrderCollected(orderId);

            if (!result.success) {
                toast.error('Failed to update order. Please try again.');
                return;
            }

            // Optimistic update
            setOrders(storeOrders.map(o => o.id === orderId ? { ...o, status: 'completed' } : o));
            toast.success('Order marked as collected.');
        } catch (error) {
            console.error('Failed to mark collected:', error);
            toast.error('An error occurred.');
        }
    };

    const filteredOrders = filterStatus === 'all'
        ? orders
        : orders.filter(o => o.status.toLowerCase() === filterStatus);

    if (!isLoaded) return (
        <div className="max-w-3xl mx-auto space-y-4 p-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-36" />
                <div className="flex gap-3">
                    <Skeleton className="h-12 w-24 rounded-lg" />
                    <Skeleton className="h-12 w-24 rounded-lg" />
                </div>
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );

    if (loading) return (
        <div className="max-w-3xl mx-auto space-y-4 p-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-36" />
                <div className="flex gap-3">
                    <Skeleton className="h-12 w-24 rounded-lg" />
                    <Skeleton className="h-12 w-24 rounded-lg" />
                </div>
            </div>
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in pb-20 max-w-3xl mx-auto">

            {/* Dashboard Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-1 text-xs"
                    >
                        <ArrowLeft size={14} />
                        Back
                    </button>
                    <h1 className="text-2xl font-bold text-white font-display">My Orders</h1>
                </div>

                {/* Stats Cards (Mini) */}
                <div className="flex gap-3">
                    <div className="px-3 py-2 bg-background-card border border-border rounded-lg">
                        <p className="text-[10px] text-text-muted uppercase font-bold">Total Spent</p>
                        <p className="text-base font-bold text-white">₹{orders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(0)}</p>
                    </div>
                    <div className="px-3 py-2 bg-background-card border border-border rounded-lg">
                        <p className="text-[10px] text-text-muted uppercase font-bold">Active Jobs</p>
                        <p className="text-base font-bold text-white">{orders.filter(o => ['pending', 'printing', 'confirmed'].includes(o.status.toLowerCase())).length}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-1.5">
                {['all', 'pending', 'printing', 'completed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium transition-all border capitalize",
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
                <motion.div
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4"
                >
                    {filteredOrders.map((order) => {
                        const status = statusConfig[order.status.toLowerCase()] || statusConfig.pending;
                        const StatusIcon = status.icon;

                        return (
                            <motion.div
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    visible: { opacity: 1, y: 0 }
                                }}
                                key={order.id}
                                className="group relative bg-background-card border border-border rounded-xl overflow-hidden hover:border-white/20 transition-all duration-300"
                            >
                                <div className="p-4">
                                    {/* Top row: status icon + summary + price */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn("size-8 rounded-full flex items-center justify-center shrink-0 border", status.color)}>
                                                <StatusIcon size={14} className={order.status === 'printing' ? 'animate-spin' : ''} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-white text-sm truncate">{getOrderSummary(order)}</span>
                                                    <span className={cn("text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border whitespace-nowrap", status.color)}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-text-muted font-mono">#{order.id.slice(-6)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="text-lg font-bold text-white">₹{order.totalAmount.toFixed(0)}</span>
                                        </div>
                                    </div>

                                    {/* Action row */}
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                                        <OrderTracker status={order.status} className="!py-1" />

                                        <div className="flex items-center gap-2 shrink-0 ml-3">
                                            {order.status === 'ready' && (
                                                <button
                                                    onClick={() => handleMarkCollected(order.id)}
                                                    className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
                                                >
                                                    <CheckCircle2 size={12} />
                                                    Collected
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Big OTP Display */}
                                    {order.orderToken && order.status !== 'completed' && (
                                        <div className="mt-3 pt-3 border-t border-border/50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Pickup OTP</p>
                                                    <div className="flex items-center gap-1">
                                                        {order.orderToken.split('').map((char, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="w-8 h-10 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-center text-lg font-black text-amber-400 font-mono"
                                                            >
                                                                {char}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCopyOtp(order.id, order.orderToken!)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                                                        copiedId === order.id
                                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                                            : "bg-white/5 text-text-muted border border-border hover:bg-white/10 hover:text-white"
                                                    )}
                                                >
                                                    {copiedId === order.id ? (
                                                        <><Check size={12} /> Copied</>
                                                    ) : (
                                                        <><Copy size={12} /> Copy</>
                                                    )}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-text-muted mt-1.5">Show this code at the counter to collect your order</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            ) : (
                <div className="text-center py-12 bg-background-card/50 rounded-2xl border border-dashed border-border">
                    <Package size={36} className="text-text-muted opacity-20 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white">No orders found</h3>
                    <p className="text-text-muted text-sm mt-1 mb-4">You haven't placed any orders yet.</p>
                    {filterStatus !== 'all' && (
                        <Button variant="outline" onClick={() => setFilterStatus('all')}>
                            View all orders
                        </Button>
                    )}
                </div>
            )
            }
        </div >
    );
};
