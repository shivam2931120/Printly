import React, { useState } from 'react';
import { AdminLayout } from './admin/AdminLayout';
import { DashboardOverview } from './admin/DashboardOverview';
import { OrdersPanel } from './admin/OrdersPanel';
import { InventoryPanel } from './admin/InventoryPanel';
import { AnalyticsDashboard } from './admin/AnalyticsDashboard';
import { ProductManagement } from './admin/ProductManagement';
import { PricingSettings } from './admin/PricingSettings';
import { ShopSettings } from './admin/ShopSettings';
import { AuditViewer } from './admin/AuditViewer';
import { CustomerList } from './admin/CustomerList';
import { ServiceManagement } from './admin/ServiceManagement';
import { Icon } from './ui/Icon';
import { User, PricingConfig, ShopConfig } from '../types';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';

interface AdminDashboardProps {
 currentUser: User | null;
 pricing: PricingConfig;
 onPricingUpdate: (pricing: PricingConfig) => void;
 shopConfig: ShopConfig;
 onShopConfigUpdate: (config: ShopConfig) => void;
 onSignOut: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
 currentUser,
 pricing,
 onPricingUpdate,
 shopConfig,
 onShopConfigUpdate,
 onSignOut,
}) => {
 const [activeSection, setActiveSection] = useState('dashboard');
 const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

 // Real-time push notifications for admin
 useRealtimeNotifications({ userId: currentUser?.id, role: 'admin', enabled: !!currentUser });

 const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onload = (event) => {
 const dataUrl = event.target?.result as string;
 setAdminAvatar(dataUrl);
 };
 reader.readAsDataURL(file);
 }
 };

 const renderContent = () => {
 switch (activeSection) {
 case 'dashboard':
 return <DashboardOverview onNavigate={(section) => setActiveSection(section)} />;
 case 'orders':
 return <OrdersPanel currentUserId={currentUser?.id || ''} />;
 case 'customers':
 return <CustomerList />;
 case 'analytics':
 return <AnalyticsDashboard />;
 case 'products':
 return <ProductManagement />;
 case 'pricing':
 return <PricingSettings pricing={pricing} onUpdate={onPricingUpdate} />;
 case 'services':
 return <ServiceManagement />;
 case 'inventory':
 return <InventoryPanel />;
 case 'audit':
 return <AuditViewer />;
 case 'settings':
 return (
 <SettingsPanel
 currentUser={currentUser}
 adminAvatar={adminAvatar}
 onAvatarChange={handleAvatarChange}
 shopConfig={shopConfig}
 onShopConfigUpdate={onShopConfigUpdate}
 onSignOut={onSignOut}
 />
 );
 default:
 return <DashboardOverview onNavigate={setActiveSection} />;
 }
 };

 return (
 <AdminLayout
 activeSection={activeSection}
 onSectionChange={setActiveSection}
 adminAvatar={adminAvatar}
 adminName={currentUser?.name || 'Admin'}
 onSignOut={onSignOut}
 >
 {renderContent()}
 </AdminLayout>
 );
};

// Settings Panel with Avatar Upload
interface SettingsPanelProps {
 currentUser: User | null;
 adminAvatar: string | null;
 onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
 shopConfig: ShopConfig;
 onShopConfigUpdate: (config: ShopConfig) => void;
 onSignOut: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
 currentUser,
 adminAvatar,
 onAvatarChange,
 shopConfig,
 onShopConfigUpdate,
 onSignOut
}) => (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-white ">Settings</h2>
 <p className="text-[#666] text-sm mt-1">
 Configure your print shop settings
 </p>
 </div>

 <div className="grid gap-6">
 {/* Profile Settings */}
 <div className="bg-[#050505] border border-[#333] p-6">
 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 <Icon name="person" className="text-primary" />
 Admin Profile
 </h3>
 <div className="flex items-center gap-6">
 <div className="relative">
 {adminAvatar ? (
 <img
 src={adminAvatar}
 alt="Admin Avatar"
 className="size-24 object-cover border-4 border-primary/20"
 />
 ) : (
 <div className="size-24 bg-primary/10 flex items-center justify-center border-4 border-primary/20">
 <Icon name="person" className="text-4xl text-primary" />
 </div>
 )}
 <label className="absolute bottom-0 right-0 p-2 bg-primary text-white cursor-pointer hover:bg-primary-hover transition-colors shadow-lg">
 <Icon name="camera_alt" className="text-sm" />
 <input
 type="file"
 accept="image/*"
 onChange={onAvatarChange}
 className="hidden"
 />
 </label>
 </div>
 <div>
 <p className="text-lg font-bold text-white ">
 {currentUser?.name || 'Admin User'}
 </p>
 <p className="text-[#666] ">
 {currentUser?.email || 'admin@printwise.in'}
 </p>
 <button
 onClick={onSignOut}
 className="mt-3 text-sm"
 >
 <Icon name="logout" className="text-sm" />
 Sign Out
 </button>
 </div>
 </div>
 </div>

 {/* Shop Settings (Editable) */}
 <ShopSettings shopConfig={shopConfig} onUpdate={onShopConfigUpdate} />

 {/* Notifications */}
 <div className="bg-[#050505] border border-[#333] p-6">
 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
 <Icon name="notifications" className="text-amber-500" />
 Notifications
 </h3>
 <div className="space-y-4">
 <ToggleSetting
 icon="mail"
 title="Email Notifications"
 description="Receive order alerts via email"
 defaultValue={true}
 />
 <ToggleSetting
 icon="warning"
 title="Low Stock Alerts"
 description="Get notified when inventory is low"
 defaultValue={true}
 />
 </div>
 </div>

 {/* Danger Zone */}
 <div className="bg-red-600/5 border border-red-600/20 p-6">
 <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
 <Icon name="warning" className="text-red-500 " />
 Danger Zone
 </h3>
 <p className="text-sm text-red-500 mb-4">
 Clears cached preferences and UI state. Database data is not affected.
 </p>
 <button
 onClick={() => {
 if (confirm('Clear all locally cached data? This does NOT delete database records — it only resets local preferences and cached UI state.')) {
 localStorage.clear();
 window.location.reload();
 }
 }}
 className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
 >
 <Icon name="delete_forever" />
 Clear Local Cache
 </button>
 </div>
 </div>
 </div>
);

// Setting Row Component
const SettingRow: React.FC<{
 icon: string;
 title: string;
 description: string;
}> = ({ icon, title, description }) => (
 <div className="flex items-start gap-4 p-3 hover:bg-[#0A0A0A] /50 transition-colors">
 <div className="p-2 bg-[#111] ">
 <Icon name={icon} className="text-[#666] " />
 </div>
 <div>
 <p className="font-medium text-white ">{title}</p>
 <p className="text-sm text-[#666] ">{description}</p>
 </div>
 </div>
);

// Toggle Setting Component
const ToggleSetting: React.FC<{
 icon: string;
 title: string;
 description: string;
 defaultValue: boolean;
}> = ({ icon, title, description, defaultValue }) => {
 const [enabled, setEnabled] = useState(defaultValue);

 return (
 <div className="flex items-center justify-between p-3 hover:bg-[#0A0A0A] /50 transition-colors">
 <div className="flex items-start gap-4">
 <div className="p-2 bg-[#111] ">
 <Icon name={icon} className="text-[#666] " />
 </div>
 <div>
 <p className="font-medium text-white ">{title}</p>
 <p className="text-sm text-[#666] ">{description}</p>
 </div>
 </div>
 <button
 onClick={() => setEnabled(!enabled)}
 className={`relative w-11 h-6 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${enabled ? 'bg-primary' : 'bg-[#1A1A1A] '
 }`}
 >
 <span
 className={`absolute left-0.5 top-0.5 bg-[#0A0A0A] h-5 w-5 shadow transform transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'
 }`}
 />
 </button>
 </div>
 );
};