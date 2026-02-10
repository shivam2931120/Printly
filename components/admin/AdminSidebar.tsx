import React from 'react';
import { Icon } from '../ui/Icon';

interface AdminSidebarProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
    collapsed?: boolean;
    onToggle?: () => void;
    adminAvatar?: string | null;
    adminName?: string;
}

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'orders', label: 'Orders', icon: 'receipt_long' },
    { id: 'products', label: 'Products', icon: 'inventory_2' },
    { id: 'services', label: 'Services', icon: 'build' },
    { id: 'pricing', label: 'Pricing', icon: 'attach_money' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'customers', label: 'Customers', icon: 'people' },
    { id: 'inventory', label: 'Inventory', icon: 'warehouse' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
    activeSection,
    onSectionChange,
    collapsed = false,
    onToggle,
    adminAvatar,
    adminName = 'Admin'
}) => {
    return (
        <aside className={`
      fixed left-0 top-0 z-40 h-screen flex flex-col
      bg-surface-light/95 dark:bg-surface-darker/95 backdrop-blur-xl
      border-r border-border-light dark:border-border-dark
      transition-all duration-300 ease-in-out
      ${collapsed ? 'w-20' : 'w-64'}
    `}>
            {/* Logo Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border-light dark:border-border-dark shrink-0">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
                    <div className="flex items-center justify-center size-10 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <Icon name="print" className="text-2xl" />
                    </div>
                    {!collapsed && (
                        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Printly Admin
                        </span>
                    )}
                </div>
                {onToggle && !collapsed && (
                    <button
                        onClick={onToggle}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Icon name="menu_open" className="text-xl" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 no-scrollbar">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={`
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              transition-all duration-200 group
              ${activeSection === item.id
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-md'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                            }
              ${collapsed ? 'justify-center px-3' : ''}
            `}
                        title={collapsed ? item.label : undefined}
                    >
                        <Icon
                            name={item.icon}
                            className={`text-xl flex-shrink-0 ${activeSection === item.id ? '' : 'group-hover:scale-110'} transition-transform`}
                        />
                        {!collapsed && <span className="text-sm">{item.label}</span>}
                    </button>
                ))}
            </nav>

            {/* Collapse Toggle for collapsed state */}
            {collapsed && onToggle && (
                <div className="p-4 flex justify-center shrink-0">
                    <button
                        onClick={onToggle}
                        className="p-3 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                        <Icon name="chevron_right" className="text-xl" />
                    </button>
                </div>
            )}

            {/* User Section */}
            {!collapsed && (
                <div className="p-4 border-t border-border-light dark:border-border-dark shrink-0">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                        {adminAvatar ? (
                            <img
                                src={adminAvatar}
                                alt="Admin"
                                className="size-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Icon name="person" className="text-primary" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {adminName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};
