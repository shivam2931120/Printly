import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { fetchOrders } from '../../services/data';
import { Order } from '../../types';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

// Mini chart data (Static for now, hard to aggregate real-time cleanly without backend grouping)
const revenueData = [
    { day: 'M', value: 0 },
    { day: 'T', value: 0 },
    { day: 'W', value: 0 },
    { day: 'T', value: 0 },
    { day: 'F', value: 0 },
    { day: 'S', value: 0 },
    { day: 'S', value: 0 },
];

interface DashboardOverviewProps {
    onNavigate: (section: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchOrders();
                setOrders(data);
            } catch (e) {
                console.error('Failed to load dashboard data:', e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const pendingOrders = orders.filter(o => o.status === 'confirmed');
    const printingOrders = orders.filter(o => o.status === 'printing');
    const completedToday = orders.filter(o => o.status === 'completed' && new Date(o.updatedAt).toDateString() === new Date().toDateString());

    // Calculate Today's Revenue
    const todayRevenue = orders
        .filter(o => new Date(o.createdAt).toDateString() === new Date().toDateString())
        .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back, Admin</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Here's what's happening with your print shop today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <Icon name="calendar_today" className="text-lg mr-2" />
                        Today
                    </button>
                    <button
                        onClick={() => onNavigate('orders')}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover transition-colors"
                    >
                        <Icon name="add" className="text-lg mr-2" />
                        Manage Orders
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Today's Revenue"
                    value={`₹${todayRevenue.toLocaleString()}`}
                    change="Daily Total"
                    positive
                    icon="payments"
                    iconBg="bg-green-50 dark:bg-green-900/20"
                    iconColor="text-green-600 dark:text-green-400"
                />
                <StatCard
                    title="Pending Orders"
                    value={pendingOrders.length.toString()}
                    change={pendingOrders.length > 0 ? "Needs Attention" : "All Caught Up"}
                    positive={pendingOrders.length === 0}
                    icon="pending_actions"
                    iconBg="bg-orange-50 dark:bg-orange-900/20"
                    iconColor="text-orange-600 dark:text-orange-400"
                    urgent={pendingOrders.length > 0}
                />
                <StatCard
                    title="Now Printing"
                    value={printingOrders.length.toString()}
                    change="Active Jobs"
                    positive
                    icon="print"
                    iconBg="bg-blue-50 dark:bg-blue-900/20"
                    iconColor="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    title="Completed Today"
                    value={completedToday.length.toString()}
                    change="Finished Jobs"
                    positive
                    icon="check_circle"
                    iconBg="bg-purple-50 dark:bg-purple-900/20"
                    iconColor="text-purple-600 dark:text-purple-400"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="xl:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Overview</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Lifetime</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Synced from Database</p>
                        </div>
                    </div>
                    <div className="h-48 flex items-center justify-center text-slate-500">
                        {/* Chart disabled as real historical data isn't easily aggregatable on client side without expensive ops */}
                        <p>Chart requires historical data aggregation</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <QuickAction icon="print" label="Manage Orders" color="bg-blue-500" onClick={() => onNavigate('orders')} />
                        <QuickAction icon="inventory_2" label="Check Inventory" color="bg-purple-500" onClick={() => onNavigate('inventory')} />
                        <QuickAction icon="people" label="Customers" color="bg-green-500" onClick={() => onNavigate('customers')} />
                        <QuickAction icon="settings" label="Platform Settings" color="bg-slate-500" onClick={() => onNavigate('settings')} />
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Orders</h3>
                    <button
                        onClick={() => onNavigate('orders')}
                        className="text-sm text-primary font-medium hover:underline"
                    >
                        View All
                    </button>
                </div>
                <div className="divide-y divide-border-light dark:divide-border-dark">
                    {orders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Icon name="inbox" className="text-3xl mb-2" />
                            <p>No orders found</p>
                        </div>
                    ) : (
                        orders.slice(0, 4).map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {(order.userName || 'C').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{order.userName || 'Customer'}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{order.id.split('-')[1] || order.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'confirmed'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                        : order.status === 'printing'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                        }`}>
                                        {order.status}
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        ₹{order.totalAmount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard: React.FC<{
    title: string;
    value: string;
    change: string;
    positive: boolean;
    icon: string;
    iconBg: string;
    iconColor: string;
    urgent?: boolean;
}> = ({ title, value, change, positive, icon, iconBg, iconColor, urgent }) => (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
        <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 rounded-xl ${iconBg}`}>
                <Icon name={icon} className={`text-xl ${iconColor}`} />
            </div>
            {urgent && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Urgent
                </span>
            )}
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
            <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-orange-600'}`}>
                {change}
            </span>
        </div>
    </div>
);

// Quick Action Component
const QuickAction: React.FC<{ icon: string; label: string; color: string; onClick?: () => void }> = ({ icon, label, color, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
        <div className={`size-10 rounded-xl ${color} flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
            <Icon name={icon} className="text-lg" />
        </div>
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <Icon name="chevron_right" className="ml-auto text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
    </button>
);
