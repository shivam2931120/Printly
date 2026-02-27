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
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { User } from '../../types';
import { useUIStore } from '../../store/useUIStore';

interface SidebarProps {
 user: User | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ user }) => {
 const location = useLocation();
 const navigate = useNavigate();
 const { signOut } = useAuth();
 const { isSidebarExpanded, setSidebarExpanded } = useUIStore();

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
 "hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-[#050505] border-r border-[#333] transition-all duration-500 z-50",
 isSidebarExpanded ? "w-64" : "w-[80px]"
 )}
 onMouseEnter={() => setSidebarExpanded(true)}
 onMouseLeave={() => setSidebarExpanded(false)}
 >
 {/* Logo Area */}
 <div className="h-20 flex items-center px-6 border-b border-[#333]">
 <div className="flex items-center gap-3 w-full">
 <div className="relative shrink-0">
 <img src="/Printly.png" alt="Printly Logo" className="size-9 object-contain" />
 </div>
 <span className={cn(
 "font-black text-xl text-white font-display tracking-tight transition-all duration-300",
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
 ? "bg-red-600 text-white"
 : "text-[#666] hover:bg-[#111] hover:text-white"
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
 <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#0A0A0A]" />
 )}
 </NavLink>
 );
 })}
 </nav>

 {/* Bottom Actions */}
 <div className="p-4 border-t border-[#333]">
 {user ? (
 <div className="space-y-3">
 <div
 onClick={() => navigate('/profile')}
 className={cn(
 "flex items-center gap-3 px-3 py-3 hover:bg-[#111] transition-all cursor-pointer group",
 !isSidebarExpanded && "justify-center"
 )}>
 <div className="relative shrink-0">
 <img
 src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
 alt="Profile"
 className="size-9 border-2 border-[#333] group-hover:border-[#333] transition-colors"
 />
 <div className="absolute -bottom-0.5 -right-0.5 size-3 bg-green-900/20 border-2 border-[#050505]" />
 </div>
 <div className={cn(
 "flex-1 min-w-0 transition-all duration-300",
 isSidebarExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 hidden"
 )}>
 <p className="text-sm font-bold text-white truncate">{user.name}</p>
 <p className={cn(
 "text-[10px] font-bold uppercase tracking-wider",
 user.isDeveloper ? "text-red-400" : user.isAdmin ? "text-red-400" : "text-[#666]"
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
 "flex items-center gap-4 px-4 py-3.5 bg-red-600 text-white font-bold hover:bg-red-700 transition-all w-full",
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
