import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Upload,
    LogOut,
    LogIn,
    Store,
    Receipt,
    Code,
    Phone,
    ShoppingBag,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import { useUIStore } from '../../store/useUIStore';
import { useCartStore } from '../../store/useCartStore';
import { NotificationDropdown } from './NotificationDropdown';

interface SidebarProps {
    user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { isSidebarExpanded, setSidebarExpanded } = useUIStore();
    const totalItems = useCartStore((state) => state.getItemCount());
    const toggleCart = useCartStore((state) => state.toggleCart);

    const links = [
        { name: 'Upload', path: '/', icon: Upload },
        { name: 'Store', path: '/store', icon: Store },
        { name: 'Contact', path: '/contact', icon: Phone },
    ];

    if (user) {
        links.push(
            { name: 'Orders', path: '/my-orders', icon: Receipt }
        );
    }

    if (user?.isAdmin) {
        links.push({ name: 'Admin', path: '/admin', icon: LayoutDashboard });
    }

    if (user?.isDeveloper) {
        links.push({ name: 'Developer', path: '/developer', icon: Code });
    }

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-background border-r border-border transition-all duration-500 z-50",
                isSidebarExpanded ? "w-64" : "w-[80px]"
            )}
            onMouseEnter={() => setSidebarExpanded(true)}
            onMouseLeave={() => setSidebarExpanded(false)}
        >
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-border">
                <div className="flex items-center gap-3 w-full">
                    <div className="relative shrink-0">
                        <img src="/Printly.png" alt="Printly Logo" className="size-9 object-contain" />
                    </div>
                    <span className={cn(
                        "font-black text-xl text-foreground font-display tracking-tight transition-all duration-300",
                        isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 hidden"
                    )}>
                        Printly
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 space-y-1 overflow-y-auto no-scrollbar">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3.5 transition-all duration-200 group relative",
                                isActive
                                    ? "bg-primary text-foreground"
                                    : "text-foreground-muted hover:bg-background-subtle hover:text-foreground"
                            )}
                        >
                            <Icon size={20} className={cn("shrink-0 transition-transform duration-200", !isActive && "group-hover:scale-110")} />
                            <span className={cn(
                                "font-bold text-sm whitespace-nowrap transition-all duration-300",
                                isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 hidden"
                            )}>
                                {link.name}
                            </span>
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-background-card" />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Utilities (Cart & Notifications) */}
            <div className={cn(
                "p-4 border-t border-border flex items-center gap-2",
                isSidebarExpanded ? "justify-start" : "flex-col justify-center"
            )}>
                <button
                    onClick={() => toggleCart(true)}
                    className="relative p-2 text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all duration-200 active:scale-90"
                    title="Cart"
                >
                    <ShoppingBag size={20} />
                    {totalItems > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-primary text-foreground text-[9px] font-black border-2 border-[#050505]">
                            {totalItems}
                        </span>
                    )}
                </button>

                <NotificationDropdown isSidebar />
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-border">
                {user ? (
                    <div className="space-y-3">
                        <div
                            onClick={() => navigate('/profile')}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 hover:bg-background-subtle transition-all cursor-pointer group",
                                !isSidebarExpanded && "justify-center"
                            )}>
                            <div className="relative shrink-0">
                                <img
                                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                                    alt="Profile"
                                    className="size-9 border-2 border-border group-hover:border-border transition-colors"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-900/20 border-2 border-[#050505]" />
                            </div>
                            <div className={cn(
                                "flex-1 min-w-0 transition-all duration-300",
                                isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 hidden"
                            )}>
                                <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
                                <p className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider",
                                    user.isDeveloper ? "text-error" : user.isAdmin ? "text-error" : "text-foreground-muted"
                                )}>
                                    {user.isDeveloper ? 'Developer' : user.isAdmin ? 'Admin' : 'User'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSignOut}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3.5 btn-flat btn-danger transition-all w-full group",
                                !isSidebarExpanded && "justify-center"
                            )}
                        >
                            <LogOut size={20} className="shrink-0 transition-transform group-hover:-translate-x-1" />
                            <span className={cn(
                                "font-bold text-sm whitespace-nowrap transition-all duration-300",
                                isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 hidden"
                            )}>
                                Sign Out
                            </span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/sign-in')}
                        className={cn(
                            "flex items-center gap-4 px-4 py-3.5 bg-primary text-foreground font-bold hover:bg-primary-hover transition-all w-full",
                            !isSidebarExpanded && "justify-center"
                        )}
                    >
                        <LogIn size={20} className="shrink-0" />
                        <span className={cn(
                            "font-bold text-sm whitespace-nowrap transition-all duration-300",
                            isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 hidden"
                        )}>
                            Sign In
                        </span>
                    </button>
                )}
            </div>
        </aside>
    );
};
