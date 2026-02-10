import React from 'react';
import { useCartStore } from '../../store/useCartStore';
import { ShoppingBag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { User } from '../../types';

interface HeaderProps {
    user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
    const totalItems = useCartStore((state) => state.getItemCount());
    const toggleCart = useCartStore((state) => state.toggleCart);

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 bg-background/80 backdrop-blur-xl border-b border-border lg:hidden">
            <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-white flex items-center justify-center shadow-glow">
                    <span className="text-black font-bold text-xl font-display">P</span>
                </div>
                <span className="font-bold text-lg text-white font-display tracking-tight">Printly</span>
            </div>

            {/* Mobile Header Cart (Visible only on mobile header) */}
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
        </header>
    );
};
