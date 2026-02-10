import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Upload,
    LogOut,
    LogIn,
    UserCircle,
    Store,
    Receipt,
    Settings,
    ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useClerk } from '@clerk/clerk-react';
import { User } from '../../types';
import { useUIStore } from '../../store/useUIStore';

interface SidebarProps {
    user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useClerk();
    const { isSidebarExpanded, setSidebarExpanded } = useUIStore();

    const links = [
        { name: 'Upload', path: '/', icon: Upload },
        { name: 'Store', path: '/store', icon: Store },
    ];

    if (user) {
        links.push(
            { name: 'Orders', path: '/my-orders', icon: Receipt },
            { name: 'Support', path: '/support', icon: UserCircle }
        );
    }

    if (user?.isAdmin) {
        links.push({ name: 'Admin', path: '/admin', icon: LayoutDashboard });
    }

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-background border-r border-border transition-all duration-300 ease-in-out z-50",
                isSidebarExpanded ? "w-64" : "w-[72px]"
            )}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
        >
            {/* Logo Area */}
            <div className="h-16 flex items-center justify-center border-b border-border/50 truncate">
                <div className="flex items-center gap-3 px-4 w-full">
                    <img src="/Printly.png" alt="Printly Logo" className="size-8 object-contain shrink-0" />
                    <span className={cn(
                        "font-bold text-lg text-white font-display tracking-tight transition-opacity duration-200",
                        isSidebarExpanded ? "opacity-100" : "opacity-0 hidden"
                    )}>
                        Printly
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto no-scrollbar">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={cn(
                                "flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "bg-white text-black"
                                    : "text-text-muted hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Icon size={20} className="shrink-0" />
                            <span className={cn(
                                "font-medium text-sm whitespace-nowrap transition-all duration-200",
                                isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 hidden"
                            )}>
                                {link.name}
                            </span>
                        </NavLink>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-border/50 bg-background">
                {user ? (
                    <>
                        <div className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer mb-2",
                            !isSidebarExpanded && "justify-center"
                        )}>
                            <img
                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                                alt="Profile"
                                className="size-8 rounded-full border border-white/10 shrink-0"
                            />
                            <div className={cn(
                                "flex-1 min-w-0 transition-all duration-200",
                                isSidebarExpanded ? "opacity-100" : "opacity-0 hidden"
                            )}>
                                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                                <p className="text-[11px] text-text-muted truncate">Free Plan</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className={cn(
                                "flex items-center gap-4 px-3 py-3 rounded-xl text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all w-full",
                                !isSidebarExpanded && "justify-center"
                            )}
                            title="Sign Out"
                        >
                            <LogOut size={20} className="shrink-0" />
                            <span className={cn(
                                "font-medium text-sm whitespace-nowrap transition-all duration-200",
                                isSidebarExpanded ? "opacity-100" : "opacity-0 hidden"
                            )}>
                                Sign Out
                            </span>
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => navigate('/sign-in')}
                        className={cn(
                            "flex items-center gap-4 px-3 py-3 rounded-xl text-text-muted hover:text-white hover:bg-white/10 transition-all w-full",
                            !isSidebarExpanded && "justify-center"
                        )}
                        title="Sign In"
                    >
                        <LogIn size={20} className="shrink-0" />
                        <span className={cn(
                            "font-medium text-sm whitespace-nowrap transition-all duration-200",
                            isSidebarExpanded ? "opacity-100" : "opacity-0 hidden"
                        )}>
                            Sign In
                        </span>
                    </button>
                )}
            </div>
        </aside>
    );
};
