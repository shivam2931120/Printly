import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { ShopsManagement } from './ShopsManagement';
import { SalesOverview } from './SalesOverview';
import { ViewMode, User } from '../../types';

interface DeveloperDashboardProps {
    currentUser: User | null;
    onSignOut: () => void;
    darkMode?: boolean;
    onToggleDarkMode?: () => void;
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
}) => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<DevSection>('shops');

    const renderContent = () => {
        switch (activeSection) {
            case 'shops':
                return <ShopsManagement onManageShop={() => navigate('/admin')} />;
            case 'sales':
                return <SalesOverview />;
            default:
                return <ShopsManagement />;
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-text-primary font-sans transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-black/85 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-white/[0.03] border border-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)]">
                                <Icon name="code" className="text-xl" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white tracking-tight">Developer Panel</h1>
                                <p className="text-xs text-text-muted font-medium">Printly Platform</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Navigation Shortcuts */}
                            <div className="hidden md:flex items-center gap-2 mr-4 border-r border-white/[0.08] pr-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-text-secondary hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all duration-200"
                                >
                                    <Icon name="school" className="text-lg" />
                                    Student Portal
                                </button>
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-text-secondary hover:text-white hover:bg-white/[0.05] border border-transparent hover:border-white/10 transition-all duration-200"
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
                                        className="p-2 rounded-xl text-text-secondary hover:text-white hover:bg-white/[0.05] transition-colors duration-200"
                                        title="Toggle Dark Mode"
                                    >
                                        <Icon name={darkMode ? 'light_mode' : 'dark_mode'} className="text-xl" />
                                    </button>
                                )}
                                <button
                                    onClick={onSignOut}
                                    className="glass-btn glass-btn-danger p-2 rounded-xl"
                                    title="Sign Out"
                                >
                                    <Icon name="logout" className="text-xl" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="md:hidden pb-3 flex items-center gap-2">
                        <button
                            onClick={() => navigate('/')}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-white hover:bg-white/[0.05] border border-white/10 transition-all duration-200 active:scale-[0.98]"
                        >
                            <Icon name="school" className="text-base" />
                            Student Portal
                        </button>
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-white hover:bg-white/[0.05] border border-white/10 transition-all duration-200 active:scale-[0.98]"
                        >
                            <Icon name="admin_panel_settings" className="text-base" />
                            Admin Console
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Navigation Tabs */}
                <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl mb-6 w-fit shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                    {NAV_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                ${activeSection === item.id
                                    ? 'bg-white/15 text-white border border-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
                                    : 'text-text-secondary hover:text-white hover:bg-white/[0.04]'
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


