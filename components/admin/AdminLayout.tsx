import React, { useState } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { Icon } from '../ui/Icon';
import { NotificationDropdown } from '../layout/NotificationDropdown';

interface AdminLayoutProps {
 children: React.ReactNode;
 activeSection: string;
 onSectionChange: (section: string) => void;
 adminAvatar?: string | null;
 adminName?: string;
 onSignOut?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
 children,
 activeSection,
 onSectionChange,
 adminAvatar,
 adminName = 'Admin',
 onSignOut
}) => {
 const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

 return (
 <div className="min-h-screen bg-[#050505] font-display overflow-x-hidden">
 {/* Desktop Sidebar */}
 <div className="hidden lg:block">
 <AdminSidebar
 activeSection={activeSection}
 onSectionChange={onSectionChange}
 collapsed={sidebarCollapsed}
 onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
 adminAvatar={adminAvatar}
 adminName={adminName}
 onSignOut={onSignOut}
 />
 </div>

 {/* Mobile Menu Overlay */}
 {mobileMenuOpen && (
 <div
 className="fixed inset-0 bg-black/70 z-30 lg:hidden animate-fade-in"
 onClick={() => setMobileMenuOpen(false)}
 />
 )}

 {/* Mobile Sidebar */}
 <div className={`
 lg:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-out shadow-2xl
 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
 `}>
 <AdminSidebar
 activeSection={activeSection}
 onSectionChange={(section) => {
 onSectionChange(section);
 setMobileMenuOpen(false);
 }}
 adminAvatar={adminAvatar}
 adminName={adminName}
 onSignOut={onSignOut}
 />
 </div>

 {/* Main Content */}
 <div className={`
 transition-all duration-300
 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
 `}>
 {/* Top Bar */}
 <header className="sticky top-0 z-20 h-16 bg-[#050505] border-b border-[#333]">
 <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
 {/* Mobile Menu Button */}
 <button
 onClick={() => setMobileMenuOpen(true)}
 className="lg:hidden p-2 -ml-2 text-[#666] hover:text-white"
 >
 <Icon name="menu" className="text-2xl" />
 </button>

 {/* Page Title */}
 <div className="hidden lg:block">
 <h1 className="text-xl font-bold text-white capitalize">
 {activeSection}
 </h1>
 </div>

 {/* Actions */}
 <div className="flex items-center gap-3">
 {/* Search */}
 <div className="hidden sm:flex items-center">
 <div className="relative">
 <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] text-lg" />
 <input
 type="text"
 placeholder="Search..."
 className="w-64 pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#333] text-sm text-white placeholder-[#666] focus:ring-2 focus:ring-red-600 focus:border-red-600 outline-none"
 />
 </div>
 </div>

 {/* Notifications */}
 <div className="text-white">
 <NotificationDropdown />
 </div>

 {/* Mobile User Avatar */}
 <div className="lg:hidden">
 {adminAvatar ? (
 <img
 src={adminAvatar}
 alt="Admin"
 className="size-9 object-cover border-2 border-[#333]"
 />
 ) : (
 <div className="size-9 bg-red-600/10 flex items-center justify-center border-2 border-[#333]">
 <Icon name="person" className="text-red-500" />
 </div>
 )}
 </div>
 </div>
 </div>
 </header>

 {/* Page Content */}
 <main className="p-4 sm:p-6 lg:p-8">
 {children}
 </main>
 </div>
 </div>
 );
};
