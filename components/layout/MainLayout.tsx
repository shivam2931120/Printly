import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { User } from '../../types';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../store/useUIStore';
import { BottomNav } from './BottomNav';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

interface MainLayoutProps {
 children: React.ReactNode;
 user: User | null;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, user }) => {
 const { isSidebarExpanded } = useUIStore();

 // Real-time push notifications for students
 useRealtimeNotifications({ userId: user?.id, role: 'student', enabled: !!user });

 return (
 <div className="min-h-screen bg-background text-text-primary flex">
 {/* Desktop Sidebar (Fixed) */}
 <Sidebar user={user} />

 {/* Main Wrapper */}
 <div className={cn(
 "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
 "lg:ml-[72px]" // Base collapsed width
 // Expanded width handled by Sidebar's own expansion visual, this margin preserves space for collapsed
 )}>
 {/* Mobile Header */}
 <Header user={user} />

 {/* Content */}
 <main className="flex-1 p-4 lg:p-8 w-full max-w-7xl mx-auto pb-24 lg:pb-8">
 {children}
 </main>

 {/* Mobile Bottom Nav */}
 <BottomNav user={user} />
 </div>
 </div>
 );
};
