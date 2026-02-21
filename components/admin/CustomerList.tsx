import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { fetchCustomers, CustomerSummary } from '../../services/data';

const AVATAR_COLORS = [
    'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
    'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300',
    'bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-300',
    'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300',
];

export const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<CustomerSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        fetchCustomers()
            .then(setCustomers)
            .finally(() => setLoading(false));
    }, []);

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0);
    const activeThisMonth = customers.filter(c => {
        const d = new Date(c.lastOrderAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">All users who have placed at least one order</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchCustomers().then(setCustomers).finally(() => setLoading(false)); }}
                    className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold shadow-md hover:opacity-90 transition-colors gap-2"
                >
                    <Icon name="refresh" className="text-lg" />
                    Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20"><Icon name="people" className="text-xl text-blue-600 dark:text-blue-400" /></div>
                        <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{customers.length}</p><p className="text-sm text-slate-500 dark:text-slate-400">Total Customers</p></div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20"><Icon name="person_check" className="text-xl text-green-600 dark:text-green-400" /></div>
                        <div><p className="text-2xl font-bold text-slate-900 dark:text-white">{activeThisMonth}</p><p className="text-sm text-slate-500 dark:text-slate-400">Active This Month</p></div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20"><Icon name="payments" className="text-xl text-purple-600 dark:text-purple-400" /></div>
                        <div><p className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalRevenue.toLocaleString()}</p><p className="text-sm text-slate-500 dark:text-slate-400">Lifetime Revenue</p></div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary"
                />
            </div>

            {/* Table */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                {loading ? (
                    <div className="py-16 text-center">
                        <div className="size-8 border-2 border-slate-300 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading customers…</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border-light dark:border-border-dark">
                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Orders</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Spent</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                {filtered.map((customer, i) => {
                                    const initials = customer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
                                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                                    return (
                                        <tr key={customer.email} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    {customer.avatar ? (
                                                        <img src={customer.avatar} alt={customer.name} className="size-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm ${color}`}>{initials}</div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{customer.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4"><span className="font-medium text-slate-900 dark:text-white">{customer.totalOrders}</span></td>
                                            <td className="py-4 px-4"><span className="font-semibold text-green-600 dark:text-green-400">₹{customer.totalSpent.toLocaleString()}</span></td>
                                            <td className="py-4 px-4"><span className="text-slate-600 dark:text-slate-400">{new Date(customer.lastOrderAt).toLocaleDateString()}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="py-12 text-center">
                                <Icon name="person_search" className="text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-slate-500 dark:text-slate-400">{searchQuery ? 'No customers match your search' : 'No customers yet'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

