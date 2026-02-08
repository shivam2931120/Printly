import React, { useState } from 'react';
import { AdminLayout } from './admin/AdminLayout';
import { DashboardOverview } from './admin/DashboardOverview';
import { AnalyticsDashboard } from './admin/AnalyticsDashboard';
import { OrdersPanel } from './admin/OrdersPanel';
import { CustomerList } from './admin/CustomerList';
import { InventoryPanel } from './admin/InventoryPanel';
import { ProductManagement } from './admin/ProductManagement';
import { ServiceManagement } from './admin/ServiceManagement';
import { PricingSettings } from './admin/PricingSettings';
import { ShopSettings } from './admin/ShopSettings';
import { Icon } from './ui/Icon';
import { User, PricingConfig } from '../types';

interface AdminDashboardProps {
  currentUser: User | null;
  pricing: PricingConfig;
  onPricingUpdate: (pricing: PricingConfig) => void;
  onSignOut: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  pricing,
  onPricingUpdate,
  onSignOut,
}) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);

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
        return <OrdersPanel />;
      case 'products':
        return <ProductManagement />;
      case 'services':
        return <ServiceManagement />;
      case 'pricing':
        return <PricingSettings pricing={pricing} onUpdate={onPricingUpdate} />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'customers':
        return <CustomerList />;
      case 'inventory':
        return <InventoryPanel />;
      case 'settings':
        return (
          <SettingsPanel
            currentUser={currentUser}
            adminAvatar={adminAvatar}
            onAvatarChange={handleAvatarChange}
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
  onSignOut: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  currentUser,
  adminAvatar,
  onAvatarChange,
  onSignOut
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
        Configure your print shop settings
      </p>
    </div>

    <div className="grid gap-6">
      {/* Profile Settings */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Icon name="person" className="text-primary" />
          Admin Profile
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            {adminAvatar ? (
              <img
                src={adminAvatar}
                alt="Admin Avatar"
                className="size-24 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                <Icon name="person" className="text-4xl text-primary" />
              </div>
            )}
            <label className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full cursor-pointer hover:bg-primary-hover transition-colors shadow-lg">
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
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              {currentUser?.name || 'Admin User'}
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              {currentUser?.email || 'admin@printwise.in'}
            </p>
            <button
              onClick={onSignOut}
              className="mt-3 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
            >
              <Icon name="logout" className="text-sm" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Shop Settings (Editable) */}
      <ShopSettings />

      {/* Notifications */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
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
      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/30 p-6">
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
          <Icon name="warning" className="text-red-600 dark:text-red-400" />
          Danger Zone
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
          Irreversible actions. Please be certain.
        </p>
        <button
          onClick={() => {
            if (confirm('CRITICAL WARNING: This will PERMANENTLY DELETE all products, orders, inventory, and settings. This cannot be undone. Are you sure?')) {
              if (confirm('Are you really sure? Everything will be reset.')) {
                localStorage.clear();
                window.location.reload();
              }
            }
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          <Icon name="delete_forever" />
          Factory Reset Data
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
  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
      <Icon name={icon} className="text-slate-500 dark:text-slate-400" />
    </div>
    <div>
      <p className="font-medium text-slate-900 dark:text-white">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
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
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
          <Icon name={icon} className="text-slate-500 dark:text-slate-400" />
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-md transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
        />
      </button>
    </div>
  );
};