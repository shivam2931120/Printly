import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Icon } from '../ui/Icon';

interface AdminLayoutProps {
    children: React.ReactNode;
    activeSection: string;
    onSectionChange: (section: string) => void;
    adminAvatar?: string | null;
    adminName?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
    children,
    activeSection,
    onSectionChange,
    adminAvatar,
    adminName = 'Admin'
}) => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display overflow-x-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <AdminSidebar
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    adminAvatar={adminAvatar}
                    adminName={adminName}
                />
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div className={`
        lg:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-out shadow-2xl
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <AdminSidebar
                    activeSection={activeSection}
                    onSectionChange={(section) => {
                        onSectionChange(section);
                        setMobileMenuOpen(false);
                    }}
                    adminAvatar={adminAvatar}
                    adminName={adminName}
                />
            </div>

            {/* Main Content */}
            <div className={`
        transition-all duration-300
        ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
                {/* Top Bar */}
                <header className="sticky top-0 z-20 h-16 bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md border-b border-border-light dark:border-border-dark">
                    <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            <Icon name="menu" className="text-2xl" />
                        </button>

                        {/* Page Title */}
                        <div className="hidden lg:block">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                                {activeSection}
                            </h1>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="hidden sm:flex items-center">
                                <div className="relative">
                                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="w-64 pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* Notifications */}
                            <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Icon name="notifications" className="text-xl" />
                                <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
                            </button>

                            {/* Mobile User Avatar */}
                            <div className="lg:hidden">
                                {adminAvatar ? (
                                    <img
                                        src={adminAvatar}
                                        alt="Admin"
                                        className="size-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-700"
                                    />
                                ) : (
                                    <div className="size-9 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center ring-2 ring-white dark:ring-slate-700">
                                        <Icon name="person" className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};
