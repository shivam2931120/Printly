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
import { fetchAllOrdersForAnalytics } from '../../services/data';

type TimePeriod = 'week' | 'month' | 'year' | 'all';

interface AnalyticsOrder {
    totalAmount: number;
    createdAt: string;
    userEmail?: string;
    options?: { colorMode?: string; paperSize?: string };
    items?: any[];
}

export const AnalyticsDashboard: React.FC = () => {
    const [period, setPeriod] = useState<TimePeriod>('month');
    const [orders, setOrders] = useState<AnalyticsOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedOrders = await fetchAllOrdersForAnalytics();
            setOrders(fetchedOrders.map(o => ({
                totalAmount: o.totalAmount,
                createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date(o.createdAt).toISOString(),
                userEmail: o.userEmail,
                options: o.options as any,
                items: Array.isArray(o.items) ? o.items : []
            })));
        } catch (e) {
            console.error('Failed to load analytics:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = useMemo(() =>
        orders.filter(o => o.createdAt.split('T')[0] === todayStr),
        [orders, todayStr]);

    // ===== Filter stats by period =====
    const filteredOrders = useMemo(() => {
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
        return orders.filter(o => new Date(o.createdAt) >= cutoff);
    }, [orders, period]);

    // ===== Aggregate totals =====
    const totals = useMemo(() => {
        let revenue = 0;
        const emails = new Set<string>();
        let printJobs = 0;
        let productSales = 0;
        let bwPages = 0;
        let colorPages = 0;

        for (const order of filteredOrders) {
            revenue += order.totalAmount || 0;
            if (order.userEmail) emails.add(order.userEmail);

            const items = order.items || [];
            for (const item of items) {
                if (item.type === 'print') {
                    printJobs += item.quantity || 1;
                    const cfg = item.printConfig || item.options || {};
                    const pages = (item.pageCount || 0) * (item.quantity || 1);
                    if (cfg.colorMode === 'color') colorPages += pages;
                    else bwPages += pages;
                } else {
                    productSales += item.quantity || 1;
                }
            }
        }

        return {
            revenue,
            orders: filteredOrders.length,
            avgOrderValue: filteredOrders.length > 0 ? revenue / filteredOrders.length : 0,
            customers: emails.size,
            printJobs,
            productSales,
            bwPages,
            colorPages,
        };
    }, [filteredOrders]);

    // ===== Chart data: revenue by day =====
    const revenueChartData = useMemo(() => {
        const byDate: Record<string, { revenue: number, orders: number }> = {};
        for (const order of filteredOrders) {
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            if (!byDate[dateStr]) {
                byDate[dateStr] = { revenue: 0, orders: 0 };
            }
            byDate[dateStr].revenue += order.totalAmount || 0;
            byDate[dateStr].orders += 1;
        }

        // Convert to array and sort by actual date
        const sortedDates = Object.keys(byDate).sort((a, b) => {
            // Basic sort, assuming data falls within a year, or we can just sort by original order creation date
            return 0; // The original orders were already sorted, but if we need chronological graph we should sort.
        });

        // Better way: group by YYYY-MM-DD then map to label
        const ISObyDate: Record<string, { revenue: number, orders: number }> = {};
        for (const order of filteredOrders) {
            const d = new Date(order.createdAt);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!ISObyDate[iso]) ISObyDate[iso] = { revenue: 0, orders: 0 };
            ISObyDate[iso].revenue += order.totalAmount || 0;
            ISObyDate[iso].orders += 1;
        }

        const sortedIsos = Object.keys(ISObyDate).sort();
        return sortedIsos.map(iso => {
            const d = new Date(iso);
            return {
                date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
                revenue: ISObyDate[iso].revenue,
                orders: ISObyDate[iso].orders
            };
        });
    }, [filteredOrders]);

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
            const items = order.items || [];
            items.forEach(item => {
                if (item.type === 'print') {
                    const cfg = item.printConfig || item.options || {};
                    const size = (cfg.paperSize || 'a4').toLowerCase();
                    if (sizeCount[size] !== undefined) {
                        sizeCount[size] += (item.quantity || 1);
                    } else {
                        sizeCount['a4'] += (item.quantity || 1);
                    }
                }
            });
        });
        const total = Object.values(sizeCount).reduce((a, b) => a + b, 0) || 1;
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
                    <h2 className="text-2xl font-bold text-white ">Analytics Overview</h2>
                    <p className="text-[#666] text-sm mt-1">
                        Live analytics generated from real-time orders
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Period Selector */}
                    <div className="flex p-1 bg-[#1A1A1A] ">
                        {(['week', 'month', 'year', 'all'] as TimePeriod[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-2 text-sm font-medium capitalize transition-all
                                    ${period === p
                                        ? 'bg-[#0A0A0A] text-white shadow-sm'
                                        : 'text-[#666] hover:text-white '
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-28 bg-[#1A1A1A] animate-pulse" />
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
                    <div className="xl:col-span-2 bg-[#0A0A0A] border border-[#333] p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white ">Revenue Trend</h3>
                                <p className="text-sm text-[#666] ">
                                    Daily revenue ({period === 'all' ? 'all time' : `last ${period}`})
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <div className="size-3 bg-[#DC2626]" />
                                <span className="text-[#666] ">Revenue</span>
                            </div>
                        </div>
                        <div className="h-72" style={{ minWidth: 0 }}>
                            {revenueChartData.length > 0 ? (
                                <ResponsiveContainer width="99%" height={280} debounce={1}>
                                    <AreaChart data={revenueChartData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1A1A1A',
                                                border: '1px solid #333',
                                                borderRadius: '0',
                                                color: '#fff'
                                            }}
                                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#DC2626"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorRev)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-[#666]">
                                    <div className="text-center">
                                        <Icon name="analytics" className="text-4xl mb-2" />
                                        <p className="text-sm">No data for this period.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Print Type Distribution */}
                    <div className="bg-[#0A0A0A] border border-[#333] p-6">
                        <h3 className="text-lg font-bold text-white mb-2">Print Type</h3>
                        <p className="text-sm text-[#666] mb-4">B&W vs Color pages</p>
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
                                                    <span className="text-[#666] text-sm">{value}</span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-6 mt-2">
                                    {printTypeData.map((item) => (
                                        <div key={item.name} className="text-center">
                                            <p className="text-2xl font-bold text-white ">{item.value}%</p>
                                            <p className="text-xs text-[#666] ">{item.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-56 flex items-center justify-center text-[#666]">
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
                    <div className="bg-[#0A0A0A] border border-[#333] p-6">
                        <h3 className="text-lg font-bold text-white mb-2">Today&apos;s Peak Hours</h3>
                        <p className="text-sm text-[#666] mb-4">Order volume by hour (live)</p>
                        <div className="h-64" style={{ minWidth: 0 }}>
                            <ResponsiveContainer width="99%" height={250} debounce={1}>
                                <BarChart data={peakHoursData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                                    <YAxis stroke="#94a3b8" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1A1A1A',
                                            border: '1px solid #333',
                                            borderRadius: '0',
                                            color: '#fff'
                                        }}
                                    />
                                    <Bar dataKey="orders" fill="#DC2626" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="bg-[#0A0A0A] border border-[#333] p-6">
                        <h3 className="text-lg font-bold text-white mb-2">Breakdown</h3>
                        <p className="text-sm text-[#666] mb-4">Jobs & sales summary</p>

                        <div className="space-y-4">
                            <SummaryRow icon="print" label="Print Jobs" value={totals.printJobs} color="blue" />
                            <SummaryRow icon="shopping_bag" label="Product Sales" value={totals.productSales} color="violet" />
                            <SummaryRow icon="description" label="B&W Pages" value={totals.bwPages} color="slate" />
                            <SummaryRow icon="palette" label="Color Pages" value={totals.colorPages} color="emerald" />
                        </div>

                        {/* Paper Size (today) */}
                        <div className="mt-6 pt-4 border-t border-[#333] ">
                            <h4 className="text-sm font-semibold text-[#666] mb-3">Today&apos;s Paper Sizes</h4>
                            <div className="space-y-3">
                                {paperSizeData.map((item) => (
                                    <div key={item.name} className="flex items-center gap-4">
                                        <span className="w-14 text-sm font-medium text-[#666] ">{item.name}</span>
                                        <div className="flex-1 h-2.5 bg-[#1A1A1A] overflow-hidden">
                                            <div
                                                className="h-full transition-all duration-500"
                                                style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                            />
                                        </div>
                                        <span className="w-10 text-sm font-bold text-white text-right">{item.value}%</span>
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
        emerald: 'bg-emerald-900/20 text-emerald-500',
        blue: 'bg-[#1A1A1A] text-red-500',
        violet: 'bg-violet-900/20 text-violet-500',
        amber: 'bg-amber-900/20 text-amber-500',
    };

    return (
        <div className="bg-[#0A0A0A] border border-[#333] p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-[#666] mb-1">{title}</p>
                    <p className="text-2xl font-bold text-white ">{value}</p>
                </div>
                <div className={`p-2.5 ${colors[accent]}`}>
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
        blue: 'text-red-500',
        violet: 'text-violet-500',
        slate: 'text-[#666]',
        emerald: 'text-emerald-500',
    };
    const bgColors = {
        blue: 'bg-[#1A1A1A]',
        violet: 'bg-violet-900/20',
        slate: 'bg-[#1A1A1A]',
        emerald: 'bg-emerald-900/20',
    };

    return (
        <div className="flex items-center gap-4">
            <div className={`p-2 ${bgColors[color]}`}>
                <Icon name={icon} className={`text-lg ${iconColors[color]}`} />
            </div>
            <div className="flex-1">
                <p className="text-sm text-[#666] ">{label}</p>
            </div>
            <p className="text-lg font-bold text-white ">{value.toLocaleString()}</p>
        </div>
    );
};
