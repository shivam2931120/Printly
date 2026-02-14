import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
    fetchAllOrdersForAnalytics,
    fetchDailyStats,
    snapshotDailyStats,
    DailyStatsRow,
} from '../../services/data';

type TimePeriod = 'week' | 'month' | 'year' | 'all';

interface AnalyticsOrder {
    totalAmount: number;
    createdAt: string;
    userEmail?: string;
    options?: { colorMode?: string; paperSize?: string };
}

export const AnalyticsDashboard: React.FC = () => {
    const [period, setPeriod] = useState<TimePeriod>('month');
    const [dailyStats, setDailyStats] = useState<DailyStatsRow[]>([]);
    const [todayOrders, setTodayOrders] = useState<AnalyticsOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [snapshotting, setSnapshotting] = useState(false);
    const [lastSnapshot, setLastSnapshot] = useState<string | null>(null);
    const [liveOrderCount, setLiveOrderCount] = useState(0);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [stats, orders] = await Promise.all([
                fetchDailyStats(),
                fetchAllOrdersForAnalytics(),
            ]);
            setDailyStats(stats);
            setLiveOrderCount(orders.length);

            // Today's orders (not yet snapshotted) for live view
            const todayStr = new Date().toISOString().split('T')[0];
            const todayMapped = orders
                .filter(o => new Date(o.createdAt).toISOString().split('T')[0] === todayStr)
                .map(o => ({
                    totalAmount: o.totalAmount,
                    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(o.createdAt).toISOString(),
                    userEmail: o.userEmail,
                    options: o.options as any,
                }));
            setTodayOrders(todayMapped);

            // Determine last snapshot date
            if (stats.length > 0) {
                const last = stats[stats.length - 1];
                setLastSnapshot(last.date);
            }
        } catch (e) {
            console.error('Failed to load analytics:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ===== Snapshot handler =====
    const handleSnapshot = async () => {
        setSnapshotting(true);
        try {
            const res = await snapshotDailyStats();
            if (res.success) {
                await loadData();
            }
        } catch (e) {
            console.error('Snapshot failed:', e);
        } finally {
            setSnapshotting(false);
        }
    };

    // ===== Filter stats by period =====
    const filteredStats = useMemo(() => {
        const now = new Date();
        let cutoff: Date;
        switch (period) {
            case 'week':
                cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case 'year':
                cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                cutoff = new Date(0);
        }
        return dailyStats.filter(s => new Date(s.date) >= cutoff);
    }, [dailyStats, period]);

    // ===== Aggregate totals =====
    const totals = useMemo(() => {
        const persisted = filteredStats.reduce(
            (a, s) => ({
                revenue: a.revenue + s.revenue,
                orders: a.orders + s.orderCount,
                printJobs: a.printJobs + s.printJobs,
                productSales: a.productSales + s.productSales,
                customers: a.customers + s.uniqueCustomers,
                bwPages: a.bwPages + s.bwPages,
                colorPages: a.colorPages + s.colorPages,
            }),
            { revenue: 0, orders: 0, printJobs: 0, productSales: 0, customers: 0, bwPages: 0, colorPages: 0 }
        );

        // Add today's live data
        const todayRevenue = todayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        const todayEmails = new Set(todayOrders.map(o => o.userEmail));

        return {
            revenue: persisted.revenue + todayRevenue,
            orders: persisted.orders + todayOrders.length,
            avgOrderValue: (persisted.orders + todayOrders.length) > 0
                ? (persisted.revenue + todayRevenue) / (persisted.orders + todayOrders.length) : 0,
            customers: persisted.customers + todayEmails.size,
            printJobs: persisted.printJobs,
            productSales: persisted.productSales,
            bwPages: persisted.bwPages,
            colorPages: persisted.colorPages,
        };
    }, [filteredStats, todayOrders]);

    // ===== Chart data: revenue by day =====
    const revenueChartData = useMemo(() => {
        const data = filteredStats.map(s => ({
            date: new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
            revenue: s.revenue,
            orders: s.orderCount,
        }));

        // Append today's live data
        const todayLabel = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const todayRevenue = todayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        if (todayOrders.length > 0) {
            const existing = data.find(d => d.date === todayLabel);
            if (existing) {
                existing.revenue += todayRevenue;
                existing.orders += todayOrders.length;
            } else {
                data.push({ date: todayLabel, revenue: todayRevenue, orders: todayOrders.length });
            }
        }

        return data;
    }, [filteredStats, todayOrders]);

    // ===== Print type distribution =====
    const printTypeData = useMemo(() => {
        const bw = totals.bwPages || 0;
        const color = totals.colorPages || 0;
        const total = bw + color || 1;
        return [
            { name: 'B&W', value: Math.round((bw / total) * 100), color: '#64748b' },
            { name: 'Color', value: Math.round((color / total) * 100), color: '#2b7cee' },
        ];
    }, [totals]);

    // ===== Peak hours from today's live orders =====
    const peakHoursData = useMemo(() => {
        const hourMap = new Map<string, number>();
        const hours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'];
        hours.forEach(h => hourMap.set(h, 0));

        todayOrders.forEach(order => {
            const date = new Date(order.createdAt);
            const hour = date.getHours();
            const labels: Record<number, string> = {
                9: '9AM', 10: '10AM', 11: '11AM', 12: '12PM',
                13: '1PM', 14: '2PM', 15: '3PM', 16: '4PM', 17: '5PM', 18: '6PM'
            };
            if (labels[hour]) hourMap.set(labels[hour], (hourMap.get(labels[hour]) || 0) + 1);
        });

        return hours.map(hour => ({ hour, orders: hourMap.get(hour) || 0 }));
    }, [todayOrders]);

    // ===== Paper size from today's live orders =====
    const paperSizeData = useMemo(() => {
        const sizeCount: Record<string, number> = { a4: 0, a3: 0, letter: 0, legal: 0 };
        todayOrders.forEach(order => {
            const size = order.options?.paperSize || 'a4';
            sizeCount[size] = (sizeCount[size] || 0) + 1;
        });
        const total = todayOrders.length || 1;
        return [
            { name: 'A4', value: Math.round((sizeCount.a4 / total) * 100), color: '#2b7cee' },
            { name: 'A3', value: Math.round((sizeCount.a3 / total) * 100), color: '#8b5cf6' },
            { name: 'Letter', value: Math.round((sizeCount.letter / total) * 100), color: '#f59e0b' },
            { name: 'Legal', value: Math.round((sizeCount.legal / total) * 100), color: '#10b981' },
        ];
    }, [todayOrders]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Overview</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Persistent revenue data — safe to delete old orders
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Snapshot Button */}
                    <button
                        onClick={handleSnapshot}
                        disabled={snapshotting || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                    >
                        <Icon name={snapshotting ? 'sync' : 'backup'} className={`text-lg ${snapshotting ? 'animate-spin' : ''}`} />
                        {snapshotting ? 'Saving...' : 'Snapshot Data'}
                    </button>

                    {/* Period Selector */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        {(['week', 'month', 'year', 'all'] as TimePeriod[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-2 text-sm font-medium rounded-md capitalize transition-all
                                    ${period === p
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Snapshot Info Banner */}
            {liveOrderCount > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                    <Icon name="info" className="text-amber-600 dark:text-amber-400 text-xl shrink-0" />
                    <div className="flex-1 text-sm">
                        <span className="font-medium text-amber-800 dark:text-amber-300">
                            {liveOrderCount} orders in database.
                        </span>
                        <span className="text-amber-700 dark:text-amber-400 ml-1">
                            Click &quot;Snapshot Data&quot; to persist analytics before deleting orders.
                            {lastSnapshot && ` Last snapshot: ${new Date(lastSnapshot).toLocaleDateString('en-IN')}`}
                        </span>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Revenue"
                        value={`₹${totals.revenue.toLocaleString()}`}
                        icon="payments"
                        accent="emerald"
                    />
                    <StatsCard
                        title="Total Orders"
                        value={totals.orders.toString()}
                        icon="receipt_long"
                        accent="blue"
                    />
                    <StatsCard
                        title="Avg Order Value"
                        value={`₹${Math.round(totals.avgOrderValue)}`}
                        icon="trending_up"
                        accent="violet"
                    />
                    <StatsCard
                        title="Unique Customers"
                        value={totals.customers.toString()}
                        icon="group"
                        accent="amber"
                    />
                </div>
            )}

            {/* Charts Row 1 */}
            {!loading && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Revenue Chart */}
                    <div className="xl:col-span-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue Trend</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Daily revenue ({period === 'all' ? 'all time' : `last ${period}`})
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="size-3 rounded-full bg-blue-600 dark:bg-blue-400" />
                                <span className="text-slate-600 dark:text-slate-400">Revenue</span>
                            </div>
                        </div>
                        <div className="h-72" style={{ minWidth: 0 }}>
                            {revenueChartData.length > 0 ? (
                                <ResponsiveContainer width="99%" height={280} debounce={1}>
                                    <AreaChart data={revenueChartData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2b7cee" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2b7cee" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#fff',
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
                                            fill="url(#colorRev)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                                    <div className="text-center">
                                        <Icon name="analytics" className="text-4xl mb-2" />
                                        <p className="text-sm">No data for this period. Snapshot orders first.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Print Type Distribution */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Print Type</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">B&W vs Color pages</p>
                        {(totals.bwPages + totals.colorPages) > 0 ? (
                            <>
                                <div className="h-56" style={{ minWidth: 0 }}>
                                    <ResponsiveContainer width="99%" height={220} debounce={1}>
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
                                                formatter={(value) => (
                                                    <span className="text-slate-600 dark:text-slate-400 text-sm">{value}</span>
                                                )}
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
                            </>
                        ) : (
                            <div className="h-56 flex items-center justify-center text-slate-400 dark:text-slate-500">
                                <div className="text-center">
                                    <Icon name="print" className="text-4xl mb-2" />
                                    <p className="text-sm">No print data yet</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Charts Row 2 */}
            {!loading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Peak Hours (today) */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Today&apos;s Peak Hours</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Order volume by hour (live)</p>
                        <div className="h-64" style={{ minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height={250} debounce={1}>
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

                    {/* Summary Cards */}
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Breakdown</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Jobs & sales summary</p>

                        <div className="space-y-4">
                            <SummaryRow icon="print" label="Print Jobs" value={totals.printJobs} color="blue" />
                            <SummaryRow icon="shopping_bag" label="Product Sales" value={totals.productSales} color="violet" />
                            <SummaryRow icon="description" label="B&W Pages" value={totals.bwPages} color="slate" />
                            <SummaryRow icon="palette" label="Color Pages" value={totals.colorPages} color="emerald" />
                        </div>

                        {/* Paper Size (today) */}
                        <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Today&apos;s Paper Sizes</h4>
                            <div className="space-y-3">
                                {paperSizeData.map((item) => (
                                    <div key={item.name} className="flex items-center gap-4">
                                        <span className="w-14 text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                            />
                                        </div>
                                        <span className="w-10 text-sm font-bold text-slate-900 dark:text-white text-right">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ===== Stats Card =====
const StatsCard: React.FC<{
    title: string;
    value: string;
    icon: string;
    accent: 'emerald' | 'blue' | 'violet' | 'amber';
}> = ({ title, value, icon, accent }) => {
    const colors = {
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        violet: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    };

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${colors[accent]}`}>
                    <Icon name={icon} className="text-xl" />
                </div>
            </div>
        </div>
    );
};

// ===== Summary Row =====
const SummaryRow: React.FC<{
    icon: string;
    label: string;
    value: number;
    color: 'blue' | 'violet' | 'slate' | 'emerald';
}> = ({ icon, label, value, color }) => {
    const iconColors = {
        blue: 'text-blue-600 dark:text-blue-400',
        violet: 'text-violet-600 dark:text-violet-400',
        slate: 'text-slate-600 dark:text-slate-400',
        emerald: 'text-emerald-600 dark:text-emerald-400',
    };
    const bgColors = {
        blue: 'bg-blue-50 dark:bg-blue-900/20',
        violet: 'bg-violet-50 dark:bg-violet-900/20',
        slate: 'bg-slate-100 dark:bg-slate-800',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
    };

    return (
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${bgColors[color]}`}>
                <Icon name={icon} className={`text-lg ${iconColors[color]}`} />
            </div>
            <div className="flex-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
            </div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
        </div>
    );
};
