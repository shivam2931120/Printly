import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';

interface Customer {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    initials?: string;
    color?: string;
    totalOrders: number;
    totalSpent: number;
    lastOrder: string;
    status: 'active' | 'inactive';
}

export const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Load customers from localStorage (aggregated from orders)
    useEffect(() => {
        const orders = JSON.parse(localStorage.getItem('printwise_orders') || '[]');
        const customerMap = new Map<string, Customer>();

        orders.forEach((order: { userEmail?: string; userName?: string; totalAmount: number; createdAt: string }) => {
            const email = order.userEmail || 'unknown@example.com';
            const name = order.userName || 'Unknown';

            if (customerMap.has(email)) {
                const existing = customerMap.get(email)!;
                existing.totalOrders += 1;
                existing.totalSpent += order.totalAmount;
                existing.lastOrder = new Date(order.createdAt).toLocaleDateString();
            } else {
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const colors = [
                    'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300',
                    'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300',
                    'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300',
                    'bg-pink-100 text-pink-600 dark:bg-pink-900/50 dark:text-pink-300',
                ];
                customerMap.set(email, {
                    id: `C-${customerMap.size + 1}`,
                    name,
                    email,
                    initials,
                    color: colors[customerMap.size % colors.length],
                    totalOrders: 1,
                    totalSpent: order.totalAmount,
                    lastOrder: new Date(order.createdAt).toLocaleDateString(),
                    status: 'active',
                });
            }
        });

        setCustomers(Array.from(customerMap.values()));
    }, []);

    const filteredCustomers = customers.filter(customer => {
        const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || customer.status === filter;
        return matchesSearch && matchesFilter;
    });

    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customers</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Manage and view customer information
                    </p>
                </div>
                <button className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold shadow-md hover:bg-primary-hover transition-colors">
                    <Icon name="person_add" className="text-lg mr-2" />
                    Add Customer
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                            <Icon name="people" className="text-xl text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCustomers}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Customers</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20">
                            <Icon name="person_check" className="text-xl text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeCustomers}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Active This Month</p>
                        </div>
                    </div>
                </div>
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                            <Icon name="payments" className="text-xl text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{totalRevenue.toLocaleString()}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Lifetime Revenue</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {(['all', 'active', 'inactive'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`
                px-4 py-2 text-sm font-medium rounded-md capitalize transition-all
                ${filter === f
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }
              `}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Customer List */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-border-light dark:border-border-dark">
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Customer</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Orders</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Spent</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Last Order</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light dark:divide-border-dark">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            {customer.avatar ? (
                                                <div
                                                    className="size-10 rounded-full bg-slate-200 bg-cover bg-center"
                                                    style={{ backgroundImage: `url("${customer.avatar}")` }}
                                                />
                                            ) : (
                                                <div className={`size-10 rounded-full flex items-center justify-center font-bold ${customer.color}`}>
                                                    {customer.initials}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{customer.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="font-medium text-slate-900 dark:text-white">{customer.totalOrders}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="font-semibold text-green-600 dark:text-green-400">₹{customer.totalSpent.toLocaleString()}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="text-slate-600 dark:text-slate-400">{customer.lastOrder}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.status === 'active'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                            }`}>
                                            {customer.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors" title="View Orders">
                                                <Icon name="receipt_long" className="text-lg" />
                                            </button>
                                            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit">
                                                <Icon name="edit" className="text-lg" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredCustomers.length === 0 && (
                    <div className="py-12 text-center">
                        <Icon name="person_search" className="text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No customers found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
