import React from 'react';
import { useCartStore } from '../../store/useCartStore';
import { ShoppingBag, LogOut, LogIn } from 'lucide-react';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';

interface HeaderProps {
 user: User | null;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
 const totalItems = useCartStore((state) => state.getItemCount());
 const toggleCart = useCartStore((state) => state.toggleCart);
 const { signOut } = useAuth();
 const navigate = useNavigate();

 const handleSignOut = async () => {
 await signOut();
 navigate('/');
 };

 return (
 <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-5 bg-[#050505] border-b border-[#333] lg:hidden">
 <div className="flex items-center gap-3">
 <div className="relative">
 <img src="/Printly.png" alt="Printly Logo" className="size-9 object-contain" />
 </div>
 <span className="font-black text-xl text-white font-display tracking-tight">Printly</span>
 </div>

 <div className="flex items-center gap-4">
 {/* Notifications */}
 <NotificationDropdown />

 {/* Mobile Header Cart */}
 <button
 onClick={() => toggleCart(true)}
 className="relative p-2 text-[#666] hover:text-white hover:bg-[#111] transition-all duration-200 active:scale-90"
 >
 <ShoppingBag size={24} strokeWidth={2.5} />
 {totalItems > 0 && (
 <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black border-2 border-[#050505]">
 {totalItems}
 </span>
 )}
 </button>

 {/* Auth Button */}
 {user ? (
 <button
 onClick={handleSignOut}
 className="flex items-center justify-center size-10 bg-transparent text-red-500 border border-red-500/30 hover:bg-red-900/20/10 transition-all duration-200 active:scale-90"
 >
 <LogOut size={20} />
 </button>
 ) : (
 <button
 onClick={() => navigate('/sign-in')}
 className="flex items-center justify-center size-10 bg-red-600 text-white hover:bg-red-700 transition-all duration-200 active:scale-90"
 >
 <LogIn size={20} />
 </button>
 )}
 </div>
 </header>
 );
};
