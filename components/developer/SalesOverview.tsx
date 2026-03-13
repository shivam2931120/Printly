import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../ui/Icon';
import { fetchAllOrdersForAnalytics, exportToCSV } from '../../services/data';
import { Order } from '../../types';

export const SalesOverview: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const orderData = await fetchAllOrdersForAnalytics();
        setOrders(orderData);
      } catch (e) {
        console.error('Failed to load sales data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;

    const today = new Date().toDateString();
    const todaysOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const todayRevenue = todaysOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);

    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return { totalRevenue, totalOrders, avgOrderValue, todayOrders: todaysOrders.length, todayRevenue };
  }, [orders]);

  const weeklyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayTotals: Record<string, number> = {};
    days.forEach(d => dayTotals[d] = 0);

    // Use last 7 days of orders for weekly breakdown
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    orders
      .filter(o => new Date(o.createdAt) >= weekAgo)
      .forEach(order => {
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
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Sales Overview</h2>
          <p className="text-foreground-muted text-sm mt-1">
            Aggregate sales data across all shops (real-time + persisted)
          </p>
        </div>
        <button
          onClick={() => {
            if (orders.length === 0) return;
            const rows = orders.map(o => ({
              'Order ID': o.id,
              'OTP': o.orderToken || '',
              'Date': new Date(o.createdAt).toLocaleDateString(),
              'Customer': o.userName,
              'Email': o.userEmail,
              'Amount (₹)': o.totalAmount.toFixed(2),
              'Status': o.status.toUpperCase(),
              'Payment': o.paymentStatus.toUpperCase(),
            }));
            exportToCSV(rows, 'printly_sales_report');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-background-subtle border border-border rounded-2xl shadow-2xl/[0.10] text-sm font-medium text-foreground hover:bg-background-card/[0.10] transition-colors"
          disabled={orders.length === 0}
        >
          <Icon name="download" className="text-lg" />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-8 border-2 border-border border-t-white animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-900/20">
                  <Icon name="payments" className="text-xl text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-foreground-muted">Total Revenue</p>
                </div>
              </div>
            </div>
            <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10">
                  <Icon name="receipt_long" className="text-xl text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                  <p className="text-sm text-foreground-muted">Total Orders</p>
                </div>
              </div>
            </div>
            <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10">
                  <Icon name="trending_up" className="text-xl text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">₹{stats.avgOrderValue}</p>
                  <p className="text-sm text-foreground-muted">Avg Order</p>
                </div>
              </div>
            </div>
            <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-900/20">
                  <Icon name="today" className="text-xl text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.todayOrders}</p>
                  <p className="text-sm text-foreground-muted">Today's Orders</p>
                </div>
              </div>
            </div>
            <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-pink-900/20">
                  <Icon name="monetization_on" className="text-xl text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">₹{stats.todayRevenue.toLocaleString()}</p>
                  <p className="text-sm text-foreground-muted">Today's Revenue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Revenue Chart */}
          <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Weekly Revenue</h3>
            <div className="space-y-3">
              {weeklyData.map(item => (
                <div key={item.day} className="flex items-center gap-4">
                  <span className="w-10 text-sm font-medium text-foreground-muted">{item.day}</span>
                  <div className="flex-1 h-8 bg-background-card overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent-hover flex items-center justify-end pr-3 transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, 2)}%` }}
                    >
                      {item.revenue > 0 && (
                        <span className="text-xs font-bold text-foreground">₹{item.revenue.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Empty State */}
          {orders.length === 0 && (
            <div className="bg-background-card border border-border rounded-2xl shadow-2xl p-12 text-center">
              <Icon name="analytics" className="text-5xl text-foreground-muted mb-4" />
              <h3 className="text-lg font-semibold text-foreground-muted mb-2">No Sales Data Yet</h3>
              <p className="text-foreground-muted">Sales data will appear here once orders are placed.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
