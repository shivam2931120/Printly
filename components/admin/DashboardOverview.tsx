import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../ui/Icon';
import { fetchAllOrdersForAnalytics, fetchInventory, InventoryRow } from '../../services/data';
import { Order } from '../../types';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

// Generate weekly revenue data from real orders
const generateWeeklyRevenue = (orders: Order[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayMap = new Map<string, number>();
    days.forEach(d => dayMap.set(d, 0));

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    orders.forEach(order => {
        const date = new Date(order.createdAt);
        const dayName = dayNames[date.getDay()];
        dayMap.set(dayName, (dayMap.get(dayName) || 0) + order.totalAmount);
    });

    return days.map(day => ({ day, value: dayMap.get(day) || 0 }));
};

interface DashboardOverviewProps {
    onNavigate: (section: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [inventory, setInventory] = useState<InventoryRow[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const [orderData, invData] = await Promise.all([
                fetchAllOrdersForAnalytics(),
                fetchInventory(),
            ]);
            setOrders(orderData);
            setInventory(invData);
        } catch (e) {
            console.error('Failed to load dashboard data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);



    const pendingOrders = useMemo(() => orders.filter(o => ['pending', 'confirmed'].includes(o.status)), [orders]);
    const printingOrders = useMemo(() => orders.filter(o => o.status === 'printing'), [orders]);
    const completedToday = useMemo(() => {
        const todayStr = new Date().toDateString();
        return orders.filter(o => o.status === 'completed' && new Date(o.updatedAt).toDateString() === todayStr);
    }, [orders]);

    const todayRevenue = useMemo(() => {
        const todayStr = new Date().toDateString();
        return orders
            .filter(o => new Date(o.createdAt).toDateString() === todayStr)
            .reduce((sum, o) => sum + o.totalAmount, 0);
    }, [orders]);

    const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + o.totalAmount, 0), [orders]);
    const revenueData = useMemo(() => generateWeeklyRevenue(orders), [orders]);

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white ">Welcome back, Admin</h2>
                    <p className="text-[#666] text-sm mt-1">
                        Here's what's happening with your print shop today.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="inline-flex items-center justify-center h-10 px-4 border border-[#333] bg-[#0A0A0A] text-[#666] text-sm font-medium hover:bg-[#0A0A0A] transition-colors">
                        <Icon name="calendar_today" className="text-lg mr-2" />
                        Today
                    </button>
                    <button
                        onClick={() => onNavigate('orders')}
                        className="inline-flex items-center justify-center h-10 px-4 bg-[#0A0A0A] bg-[#0A0A0A] text-white text-sm font-bold shadow-md hover:opacity-90 transition-colors"
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
                    iconBg="bg-green-900/20 bg-green-900/20"
                    iconColor="text-green-400 "
                />
                <StatCard
                    title="Pending Orders"
                    value={pendingOrders.length.toString()}
                    change={pendingOrders.length > 0 ? "Needs Attention" : "All Caught Up"}
                    positive={pendingOrders.length === 0}
                    icon="pending_actions"
                    iconBg="bg-orange-900/20 "
                    iconColor="text-orange-400 "
                    urgent={pendingOrders.length > 0}
                />
                <StatCard
                    title="Now Printing"
                    value={printingOrders.length.toString()}
                    change="Active Jobs"
                    positive
                    icon="print"
                    iconBg="bg-[#111] "
                    iconColor="text-red-500 "
                />
                <StatCard
                    title="Completed Today"
                    value={completedToday.length.toString()}
                    change="Finished Jobs"
                    positive
                    icon="check_circle"
                    iconBg="bg-purple-900/20 bg-purple-900/20"
                    iconColor="text-purple-400 "
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="xl:col-span-2 bg-[#0A0A0A] border border-[#333] p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-white ">Revenue Overview</h3>
                            <p className="text-sm text-[#666] ">Total Lifetime</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-white ">₹{totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-green-400 ">Synced from Database</p>
                        </div>
                    </div>
                    <div className="h-48" style={{ minWidth: 0, minHeight: 192 }}>
                        {!loading && revenueData.length > 0 && <ResponsiveContainer width="99%" height={180} debounce={1}>
                            <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} fill="url(#revenueGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>}
                    </div>
                </div>

                {/* Quick Actions + Inventory Status */}
                <div className="space-y-6">
                    <div className="bg-[#0A0A0A] border border-[#333] p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <QuickAction icon="print" label="Manage Orders" color="bg-[#111]0" onClick={() => onNavigate('orders')} />
                            <QuickAction icon="inventory_2" label="Add Products" color="bg-amber-900/200" onClick={() => onNavigate('products')} />
                            <QuickAction icon="warehouse" label="Check Inventory" color="bg-purple-900/200" onClick={() => onNavigate('inventory')} />
                            <QuickAction icon="attach_money" label="Update Pricing" color="bg-green-900/20" onClick={() => onNavigate('pricing')} />
                            <QuickAction icon="settings" label="Settings" color="bg-[#0A0A0A]0" onClick={() => onNavigate('settings')} />
                        </div>
                    </div>

                    {/* Inventory Status Widget */}
                    {inventory.length > 0 && (
                        <div className="bg-[#0A0A0A] border border-[#333] p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white ">Stock Status</h3>
                                <button
                                    onClick={() => onNavigate('inventory')}
                                    className="text-xs text-red-500 font-medium hover:underline"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="space-y-3">
                                {inventory
                                    .filter(i => i.stock <= i.threshold)
                                    .slice(0, 4)
                                    .map(item => {
                                        const isCritical = item.stock <= item.threshold * 0.3;
                                        return (
                                            <div key={item.id} className="flex items-center gap-3">
                                                <div className={`size-2 ${isCritical ? 'bg-red-900/20' : 'bg-yellow-900/200'}`} />
                                                <span className="text-sm text-[#666] flex-1 truncate">{item.name}</span>
                                                <span className={`text-xs font-bold ${isCritical ? 'text-red-500 ' : 'text-yellow-400 '}`}>
                                                    {item.stock} {item.unit}
                                                </span>
                                            </div>
                                        );
                                    })}
                                {inventory.filter(i => i.stock <= i.threshold).length === 0 && (
                                    <p className="text-sm text-green-400 flex items-center gap-2">
                                        <Icon name="check_circle" className="text-base" />
                                        All stock levels healthy
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-[#0A0A0A] border border-[#333] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-[#333] ">
                    <h3 className="text-lg font-bold text-white ">Recent Orders</h3>
                    <button
                        onClick={() => onNavigate('orders')}
                        className="text-sm text-red-500 font-medium hover:underline"
                    >
                        View All
                    </button>
                </div>
                <div className="divide-y divide-[#1A1A1A]">
                    {orders.length === 0 ? (
                        <div className="py-12 text-center text-[#666]">
                            <Icon name="inbox" className="text-3xl mb-2" />
                            <p>No orders found</p>
                        </div>
                    ) : (
                        orders.slice(0, 4).map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-4 hover:bg-[#0A0A0A] /40 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 bg-[#111] flex items-center justify-center font-bold text-red-500 ">
                                        {(order.userName || 'C').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white ">{order.userName || 'Customer'}</p>
                                        <p className="text-sm text-[#666] ">{order.id.split('-')[1] || order.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2.5 py-0.5 text-xs font-medium ${order.status === 'pending'
                                            ? 'bg-orange-900/20 text-orange-400 '
                                            : order.status === 'confirmed'
                                                ? 'bg-yellow-900/20 text-yellow-400 '
                                                : order.status === 'printing'
                                                    ? 'bg-red-900/20 text-red-400 '
                                                    : 'bg-green-900/20 text-green-400 '
                                        }`}>
                                        {order.status}
                                    </span>
                                    <span className="font-semibold text-white ">
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
    <div className="bg-[#0A0A0A] border border-[#333] p-5">
        <div className="flex items-start justify-between mb-3">
            <div className={`p-2.5 ${iconBg}`}>
                <Icon name={icon} className={`text-xl ${iconColor}`} />
            </div>
            {urgent && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-900/20 text-red-400 ">
                    Urgent
                </span>
            )}
        </div>
        <p className="text-2xl font-bold text-white ">{value}</p>
        <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-[#666] ">{title}</p>
            <span className={`text-xs font-medium ${positive ? 'text-green-400' : 'text-orange-400'}`}>
                {change}
            </span>
        </div>
    </div>
);

// Quick Action Component
const QuickAction: React.FC<{ icon: string; label: string; color: string; onClick?: () => void }> = ({ icon, label, color, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 hover:bg-[#0A0A0A] transition-colors group">
        <div className={`size-10 ${color} flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
            <Icon name={icon} className="text-lg" />
        </div>
        <span className="font-medium text-[#666] ">{label}</span>
        <Icon name="chevron_right" className="ml-auto text-[#666] group-hover:text-[#666] transition-colors" />
    </button>
);
