import React from 'react';
import { NavLink } from 'react-router-dom';
import { Upload, Store, Receipt, UserCircle, ShoppingBag, LayoutDashboard, Code, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCartStore } from '../../store/useCartStore';

import { User } from '../../types';

interface BottomNavProps {
    user: User | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({ user }) => {
    const totalItems = useCartStore((state) => state.getItemCount());
    const toggleCart = useCartStore((state) => state.toggleCart);

    const links = [
        { name: 'Home', path: '/', icon: Upload },
        { name: 'Store', path: '/store', icon: Store },
        { name: 'Contact', path: '/contact', icon: Phone },
    ];

    // Only show private links if logged in
    if (user) {
        links.push(
            { name: 'Orders', path: '/my-orders', icon: Receipt },
            { name: 'Profile', path: '/profile', icon: UserCircle }
        );

        if (user.isDeveloper) {
            links.push({ name: 'Dev', path: '/developer', icon: Code });
        } else if (user.isAdmin) {
            links.push({ name: 'Admin', path: '/admin', icon: LayoutDashboard });
        }
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border lg:hidden pb-safe">
            <nav className="flex items-center justify-around p-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) => cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 active:scale-95",
                                isActive ? "text-white bg-white/[0.06]" : "text-text-muted hover:text-white"
                            )}
                        >
                            <Icon size={22} strokeWidth={2} />
                            <span className="text-[10px] font-medium">{link.name}</span>
                        </NavLink>
                    );
                })}

                {/* Floating Cart Trigger - Logged in only */}
                {user && (
                    <button
                        onClick={() => toggleCart(true)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl text-text-muted hover:text-white relative group transition-all duration-200 active:scale-95"
                    >
                        <div className="relative">
                            <ShoppingBag size={22} strokeWidth={2} />
                            {totalItems > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-white text-black text-[9px] font-bold border border-black ring-2 ring-background">
                                    {totalItems}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Cart</span>
                    </button>
                )}
            </nav>
        </div>
    );
};
