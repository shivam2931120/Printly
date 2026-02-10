import React from 'react';
import { useCartStore } from '../../store/useCartStore';
import { ShoppingBag, LogOut, LogIn } from 'lucide-react';
import { cn } from '../../lib/utils';
import { User } from '../../types';
import { useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
    const totalItems = useCartStore((state) => state.getItemCount());
    const toggleCart = useCartStore((state) => state.toggleCart);
    const { signOut } = useClerk();
    const navigate = useNavigate();

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-xl border-b border-border lg:hidden">
            <div className="flex items-center gap-2">
                <img src="/Printly.png" alt="Printly Logo" className="size-8 object-contain" />
                <span className="font-bold text-lg text-white font-display tracking-tight">Printly</span>
            </div>

            <div className="flex items-center gap-2">
                {/* Auth Button */}
                {user ? (
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold transition-all active:scale-95"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                ) : (
                    <button
                        onClick={() => navigate('/sign-in')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-bold transition-all active:scale-95 shadow-glow-white/10"
                    >
                        <LogIn size={16} />
                        Sign In
                    </button>
                )}

                {/* Mobile Header Cart */}
                <button
                    onClick={() => toggleCart(true)}
                    className="relative p-2 text-text-muted hover:text-white transition-colors"
                >
                    <ShoppingBag size={24} />
                    {totalItems > 0 && (
                        <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-black text-[10px] font-bold border border-black">
                            {totalItems}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
};
