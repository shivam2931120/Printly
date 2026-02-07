import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../ui/Icon';

interface OrderData {
    totalAmount: number;
    createdAt: string;
    shopId?: string;
}

export const SalesOverview: React.FC = () => {
    const [orders, setOrders] = useState<OrderData[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem('printwise_orders');
        if (stored) {
            try {
                setOrders(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse orders:', e);
            }
        }
    }, []);

    // Simple aggregate stats
    const stats = useMemo(() => {
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        // Calculate today's stats
        const today = new Date().toDateString();
        const todaysOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
        const todayRevenue = todaysOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        return {
            totalRevenue,
            totalOrders,
            avgOrderValue,
            todayOrders: todaysOrders.length,
            todayRevenue,
        };
    }, [orders]);

    // Weekly revenue breakdown
    const weeklyData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayTotals: Record<string, number> = {};
        days.forEach(d => dayTotals[d] = 0);

        orders.forEach(order => {
            const day = days[new Date(order.createdAt).getDay()];
            dayTotals[day] += order.totalAmount || 0;
        });

        const maxRevenue = Math.max(...Object.values(dayTotals), 1);
        return days.map(day => ({
            day,
            revenue: dayTotals[day],
            percentage: (dayTotals[day] / maxRevenue) * 100,
        }));
    }, [orders]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sales Overview</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Aggregate sales data across all shops
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20">
                            <Icon name="payments" className="text-xl text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{stats.totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Revenue</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                            <Icon name="receipt_long" className="text-xl text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalOrders}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Orders</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                            <Icon name="trending_up" className="text-xl text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{stats.avgOrderValue}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Avg Order</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                            <Icon name="today" className="text-xl text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.todayOrders}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Today's Orders</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-pink-900/20">
                            <Icon name="monetization_on" className="text-xl text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{stats.todayRevenue.toLocaleString()}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Today's Revenue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Revenue Chart (Simple Bar) */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Weekly Revenue</h3>
                <div className="space-y-3">
                    {weeklyData.map(item => (
                        <div key={item.day} className="flex items-center gap-4">
                            <span className="w-10 text-sm font-medium text-slate-600 dark:text-slate-400">{item.day}</span>
                            <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-lg flex items-center justify-end pr-3 transition-all duration-500"
                                    style={{ width: `${Math.max(item.percentage, 2)}%` }}
                                >
                                    {item.revenue > 0 && (
                                        <span className="text-xs font-bold text-white">₹{item.revenue.toLocaleString()}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {orders.length === 0 && (
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-12 text-center">
                    <Icon name="analytics" className="text-5xl text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Sales Data Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400">Sales data will appear here once orders are placed.</p>
                </div>
            )}
        </div>
    );
};
