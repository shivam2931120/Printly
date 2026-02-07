import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

// Order type for display
interface OrderDisplay {
    id: string;
    userName: string;
    fileName: string;
    status: string;
    totalAmount: number;
}

// Mini chart data
const revenueData = [
    { day: 'M', value: 12400 },
    { day: 'T', value: 18200 },
    { day: 'W', value: 14800 },
    { day: 'T', value: 22100 },
    { day: 'F', value: 28500 },
    { day: 'S', value: 31200 },
    { day: 'S', value: 19800 },
];

export const DashboardOverview: React.FC = () => {
    const [orders, setOrders] = useState<OrderDisplay[]>([]);

    useEffect(() => {
        const storedOrders = localStorage.getItem('printwise_orders');
        if (storedOrders) {
            try {
                const parsed = JSON.parse(storedOrders);
                setOrders(parsed.map((o: any) => ({
                    id: o.id,
                    userName: o.userName || 'Customer',
                    fileName: o.fileName,
                    status: o.status === 'confirmed' ? 'Pending' : o.status,
                    totalAmount: o.totalAmount
                })));
            } catch (e) {
                console.error('Failed to parse orders:', e);
            }
        }
    }, []);

    const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'confirmed');
    const printingOrders = orders.filter(o => o.status === 'Printing' || o.status === 'printing');

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
                    <button className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover transition-colors">
                        <Icon name="add" className="text-lg mr-2" />
                        Quick Order
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Today's Revenue"
                    value="₹12,450"
                    change="+18%"
                    positive
                    icon="payments"
                    iconBg="bg-green-50 dark:bg-green-900/20"
                    iconColor="text-green-600 dark:text-green-400"
                />
                <StatCard
                    title="Pending Orders"
                    value={pendingOrders.length.toString()}
                    change="2 urgent"
                    positive={false}
                    icon="pending_actions"
                    iconBg="bg-orange-50 dark:bg-orange-900/20"
                    iconColor="text-orange-600 dark:text-orange-400"
                    urgent
                />
                <StatCard
                    title="Now Printing"
                    value={printingOrders.length.toString()}
                    change="Active"
                    positive
                    icon="print"
                    iconBg="bg-blue-50 dark:bg-blue-900/20"
                    iconColor="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                    title="Completed Today"
                    value="23"
                    change="+5 vs yesterday"
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
                            <p className="text-sm text-slate-500 dark:text-slate-400">This week's performance</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹1,47,000</p>
                            <p className="text-sm text-green-600 dark:text-green-400">+12.5% from last week</p>
                        </div>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2b7cee" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2b7cee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#2b7cee"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <QuickAction icon="print" label="Start Print Queue" color="bg-blue-500" />
                        <QuickAction icon="inventory_2" label="Check Inventory" color="bg-purple-500" />
                        <QuickAction icon="receipt_long" label="Generate Report" color="bg-green-500" />
                        <QuickAction icon="settings" label="Printer Settings" color="bg-slate-500" />
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Orders</h3>
                    <button className="text-sm text-primary font-medium hover:underline">View All</button>
                </div>
                <div className="divide-y divide-border-light dark:divide-border-dark">
                    {orders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Icon name="inbox" className="text-3xl mb-2" />
                            <p>No recent orders</p>
                        </div>
                    ) : (
                        orders.slice(0, 4).map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                        {order.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">{order.userName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{order.id} • {order.fileName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'Pending' || order.status === 'confirmed'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            : order.status === 'Printing' || order.status === 'printing'
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
const QuickAction: React.FC<{ icon: string; label: string; color: string }> = ({ icon, label, color }) => (
    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
        <div className={`size-10 rounded-xl ${color} flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
            <Icon name={icon} className="text-lg" />
        </div>
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <Icon name="chevron_right" className="ml-auto text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
    </button>
);
