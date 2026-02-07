import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { ShopsManagement } from './ShopsManagement';
import { SalesOverview } from './SalesOverview';
import { User } from '../../types';

interface DeveloperDashboardProps {
    currentUser: User | null;
    onSignOut: () => void;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
}

type DevSection = 'shops' | 'sales' | 'settings';

const NAV_ITEMS: { id: DevSection; label: string; icon: string }[] = [
    { id: 'shops', label: 'Shops', icon: 'store' },
    { id: 'sales', label: 'Sales', icon: 'analytics' },
    { id: 'settings', label: 'Platform', icon: 'settings' },
];

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = ({
    currentUser,
    onSignOut,
    darkMode,
    onToggleDarkMode,
}) => {
    const [activeSection, setActiveSection] = useState<DevSection>('shops');

    const renderContent = () => {
        switch (activeSection) {
            case 'shops':
                return <ShopsManagement />;
            case 'sales':
                return <SalesOverview />;
            case 'settings':
                return <PlatformSettings />;
            default:
                return <ShopsManagement />;
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                                <Icon name="code" className="text-xl" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Developer Panel</h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Printly Platform</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
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

// Simple Platform Settings
const PlatformSettings: React.FC = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Platform Settings</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Global configuration for the Printly platform
                </p>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Icon name="info" className="text-blue-500" />
                    Platform Information
                </h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-border-light dark:border-border-dark">
                        <span className="text-slate-500 dark:text-slate-400">Version</span>
                        <span className="font-medium text-slate-900 dark:text-white">1.0.0</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border-light dark:border-border-dark">
                        <span className="text-slate-500 dark:text-slate-400">Environment</span>
                        <span className="font-medium text-green-600 dark:text-green-400">Development</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span className="text-slate-500 dark:text-slate-400">Storage</span>
                        <span className="font-medium text-slate-900 dark:text-white">localStorage</span>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <Icon name="warning" className="text-amber-600 dark:text-amber-400 text-xl mt-0.5" />
                    <div>
                        <p className="font-medium text-amber-800 dark:text-amber-300">Development Mode</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                            All data is stored in browser localStorage. For production, connect to a backend database.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
