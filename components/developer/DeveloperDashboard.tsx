import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { ShopsManagement } from './ShopsManagement';
import { SalesOverview } from './SalesOverview';
import { ViewMode, User } from '../../types';

interface DeveloperDashboardProps {
    currentUser: User | null;
    onSignOut: () => void;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
    onNavigate?: (view: ViewMode) => void;
}

type DevSection = 'shops' | 'sales';

const NAV_ITEMS: { id: DevSection; label: string; icon: string }[] = [
    { id: 'shops', label: 'Shops Management', icon: 'store' },
    { id: 'sales', label: 'Sales Overview', icon: 'analytics' },
];

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
    currentUser,
    onSignOut,
    darkMode,
    onToggleDarkMode,
    onNavigate,
}) => {
    const [activeSection, setActiveSection] = useState<DevSection>('shops');

    const renderContent = () => {
        switch (activeSection) {
            case 'shops':
                return <ShopsManagement onManageShop={() => onNavigate?.('admin')} />;
            case 'sales':
                return <SalesOverview />;
            default:
                return <ShopsManagement />;
        }
    };

    return (
        <div className="min-h-screen bg-background-dark text-text-primary font-sans transition-colors duration-200">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border-dark bg-surface-darker/95 backdrop-blur-md shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover text-white shadow-lg shadow-primary/20">
                                <Icon name="code" className="text-xl" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">Developer Panel</h1>
                                <p className="text-xs text-text-secondary font-medium">Printly Platform</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Navigation Shortcuts */}
                            <div className="hidden md:flex items-center gap-2 mr-4 border-r border-border-dark pr-4">
                                <button
                                    onClick={() => onNavigate?.('student')}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:bg-surface-dark transition-all"
                                >
                                    <Icon name="school" className="text-lg" />
                                    Student Portal
                                </button>
                                <button
                                    onClick={() => onNavigate?.('admin')}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:bg-surface-dark transition-all"
                                >
                                    <Icon name="admin_panel_settings" className="text-lg" />
                                    Admin Console
                                </button>
                            </div>

                            <div className="flex items-center gap-2 pl-2">
                                <span className="text-sm font-medium text-text-secondary hidden sm:block">
                                    {currentUser?.name}
                                </span>
                                {onToggleDarkMode && (
                                    <button
                                        onClick={onToggleDarkMode}
                                        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        title="Toggle Dark Mode"
                                    >
                                        <Icon name={darkMode ? 'light_mode' : 'dark_mode'} className="text-xl" />
                                    </button>
                                )}
                                <button
                                    onClick={onSignOut}
                                    className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Sign Out"
                                >
                                    <Icon name="logout" className="text-xl" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Navigation Tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-fit">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                                ${activeSection === item.id
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }
                            `}
                        >
                            <Icon name={item.icon} className="text-lg" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {renderContent()}
            </div>
        </div>
    );
};


