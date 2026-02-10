import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import { Icon } from '../ui/Icon';

type TimePeriod = 'today' | 'week' | 'month' | 'year';

interface Order {
    totalAmount: number;
    createdAt: string;
    options?: {
        colorMode?: string;
        paperSize?: string;
    };
}

export const AnalyticsDashboard: React.FC = () => {
    const [period, setPeriod] = useState<TimePeriod>('week');
    const [orders, setOrders] = useState<Order[]>([]);

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

    // Calculate stats from real orders
    const stats = useMemo(() => {
        const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Count unique customers (simplified)
        const uniqueEmails = new Set(orders.map((o: Order & { userEmail?: string }) => o.userEmail));

        return {
            totalRevenue: `₹${totalRevenue.toLocaleString()}`,
            totalOrders,
            avgOrderValue: `₹${Math.round(avgOrderValue)}`,
            conversionRate: totalOrders > 0 ? '78%' : '0%',
            newCustomers: uniqueEmails.size,
            returningCustomers: Math.max(0, totalOrders - uniqueEmails.size),
        };
    }, [orders]);

    // Generate revenue data from real orders
    const revenueData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayMap = new Map<string, { revenue: number; orders: number }>();

        days.forEach(d => dayMap.set(d, { revenue: 0, orders: 0 }));

        orders.forEach(order => {
            const date = new Date(order.createdAt);
            const dayName = days[date.getDay()];
            const existing = dayMap.get(dayName)!;
            existing.revenue += order.totalAmount || 0;
            existing.orders += 1;
        });

        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
            date: day,
            revenue: dayMap.get(day)?.revenue || 0,
            orders: dayMap.get(day)?.orders || 0,
        }));
    }, [orders]);

    // Calculate print type distribution
    const printTypeData = useMemo(() => {
        let bw = 0, color = 0;
        orders.forEach(order => {
            if (order.options?.colorMode === 'color') color++;
            else bw++;
        });
        const total = bw + color || 1;
        return [
            { name: 'B&W', value: Math.round((bw / total) * 100), color: '#64748b' },
            { name: 'Color', value: Math.round((color / total) * 100), color: '#2b7cee' },
        ];
    }, [orders]);

    // Calculate paper size distribution
    const paperSizeData = useMemo(() => {
        const sizeCount: Record<string, number> = { a4: 0, a3: 0, letter: 0, legal: 0 };
        orders.forEach(order => {
            const size = order.options?.paperSize || 'a4';
            sizeCount[size] = (sizeCount[size] || 0) + 1;
        });
        const total = orders.length || 1;
        return [
            { name: 'A4', value: Math.round((sizeCount.a4 / total) * 100), color: '#2b7cee' },
            { name: 'A3', value: Math.round((sizeCount.a3 / total) * 100), color: '#8b5cf6' },
            { name: 'Letter', value: Math.round((sizeCount.letter / total) * 100), color: '#f59e0b' },
            { name: 'Legal', value: Math.round((sizeCount.legal / total) * 100), color: '#10b981' },
        ];
    }, [orders]);

    // Calculate peak hours from real orders
    const peakHoursData = useMemo(() => {
        const hourMap = new Map<string, number>();
        const hours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'];
        hours.forEach(h => hourMap.set(h, 0));

        orders.forEach(order => {
            const date = new Date(order.createdAt);
            const hour = date.getHours();
            const hourLabels: Record<number, string> = {
                9: '9AM', 10: '10AM', 11: '11AM', 12: '12PM',
                13: '1PM', 14: '2PM', 15: '3PM', 16: '4PM', 17: '5PM', 18: '6PM'
            };
            if (hourLabels[hour]) {
                hourMap.set(hourLabels[hour], (hourMap.get(hourLabels[hour]) || 0) + 1);
            }
        });

        return hours.map(hour => ({ hour, orders: hourMap.get(hour) || 0 }));
    }, [orders]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Overview</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Track your business performance and insights
                    </p>
                </div>

                {/* Period Selector */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {(['today', 'week', 'month', 'year'] as TimePeriod[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`
                px-4 py-2 text-sm font-medium rounded-md capitalize transition-all
                ${period === p
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }
              `}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Revenue"
                    value={stats.totalRevenue}
                    change="+12.5%"
                    positive
                    icon="payments"
                />
                <StatsCard
                    title="Total Orders"
                    value={stats.totalOrders.toString()}
                    change="+8.2%"
                    positive
                    icon="receipt_long"
                />
                <StatsCard
                    title="Avg Order Value"
                    value={stats.avgOrderValue}
                    change="+3.1%"
                    positive
                    icon="trending_up"
                />
                <StatsCard
                    title="Conversion Rate"
                    value={stats.conversionRate}
                    change="-2.4%"
                    positive={false}
                    icon="conversion_path"
                />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="xl:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Daily revenue this week</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="size-3 rounded-full bg-blue-600 dark:bg-blue-400" />
                                <span className="text-slate-600 dark:text-slate-400">Revenue</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2b7cee" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2b7cee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--tw-bg-opacity, 1) rgb(255 255 255)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#2b7cee"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Print Type Distribution */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Print Type</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">B&W vs Color distribution</p>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={printTypeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {printTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend
                                    verticalAlign="bottom"
                                    formatter={(value) => <span className="text-slate-600 dark:text-slate-400 text-sm">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-2">
                        {printTypeData.map((item) => (
                            <div key={item.name} className="text-center">
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}%</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{item.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Peak Hours */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Peak Hours</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Order volume by hour</p>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHoursData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Bar dataKey="orders" fill="#2b7cee" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Paper Size Distribution */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Paper Size Usage</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Distribution by paper size</p>
                    <div className="space-y-4">
                        {paperSizeData.map((item) => (
                            <div key={item.name} className="flex items-center gap-4">
                                <span className="w-16 text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                    />
                                </div>
                                <span className="w-12 text-sm font-bold text-slate-900 dark:text-white text-right">{item.value}%</span>
                            </div>
                        ))}
                    </div>

                    {/* Customer Stats */}
                    <div className="mt-8 pt-6 border-t border-border-light dark:border-border-dark">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Customer Insights</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon name="person_add" className="text-green-600 dark:text-green-400 text-lg" />
                                    <span className="text-xs text-green-700 dark:text-green-400 font-medium">New</span>
                                </div>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.newCustomers}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon name="person" className="text-blue-600 dark:text-blue-400 text-lg" />
                                    <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Returning</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.returningCustomers}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Stats Card Component
const StatsCard: React.FC<{
    title: string;
    value: string;
    change: string;
    positive: boolean;
    icon: string;
}> = ({ title, value, change, positive, icon }) => (
    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
            <div className={`p-2.5 rounded-xl ${positive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <Icon name={icon} className={`text-xl ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
        </div>
        <div className="flex items-center gap-1 mt-3">
            <Icon
                name={positive ? 'trending_up' : 'trending_down'}
                className={`text-sm ${positive ? 'text-green-600' : 'text-red-600'}`}
            />
            <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}>{change}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">vs last period</span>
        </div>
    </div>
);
