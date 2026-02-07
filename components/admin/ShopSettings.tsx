import React, { useState, useEffect } from 'react';
import { Icon } from '../ui/Icon';
import { ShopConfig, DEFAULT_SHOP_CONFIG } from '../../types';

interface ShopSettingsProps {
    onSave?: (config: ShopConfig) => void;
}

export const ShopSettings: React.FC<ShopSettingsProps> = ({ onSave }) => {
    const [config, setConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('printwise_shop_config');
        if (stored) {
            try {
                setConfig({ ...DEFAULT_SHOP_CONFIG, ...JSON.parse(stored) });
            } catch (e) {
                console.error('Failed to parse shop config:', e);
            }
        }
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate save
        localStorage.setItem('printwise_shop_config', JSON.stringify(config));
        setIsSaving(false);
        setIsEditing(false);
        onSave?.(config);
    };

    const handleChange = (field: keyof ShopConfig, value: string) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Icon name="store" className="text-blue-500" />
                    Shop Information
                </h3>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                    >
                        <Icon name="edit" className="text-sm" />
                        Edit
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Icon name={isSaving ? 'hourglass_empty' : 'save'} className="text-sm" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <EditableSettingRow
                    icon="storefront"
                    title="Shop Name"
                    value={config.shopName}
                    isEditing={isEditing}
                    onChange={(v) => handleChange('shopName', v)}
                />
                <EditableSettingRow
                    icon="tag"
                    title="Tagline"
                    value={config.tagline}
                    isEditing={isEditing}
                    onChange={(v) => handleChange('tagline', v)}
                />
                <EditableSettingRow
                    icon="schedule"
                    title="Operating Hours"
                    value={config.operatingHours}
                    isEditing={isEditing}
                    onChange={(v) => handleChange('operatingHours', v)}
                />
                <EditableSettingRow
                    icon="location_on"
                    title="Location"
                    value={config.location}
                    isEditing={isEditing}
                    onChange={(v) => handleChange('location', v)}
                />
                <EditableSettingRow
                    icon="phone"
                    title="Phone"
                    value={config.contact}
                    isEditing={isEditing}
                    onChange={(v) => handleChange('contact', v)}
                />
                <EditableSettingRow
                    icon="mail"
                    title="Email"
                    value={config.email}
                    isEditing={isEditing}
                    onChange={(v) => handleChange('email', v)}
                />
            </div>

            {/* Developer Info (non-editable) */}
            <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark">
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Icon name="lock" className="text-xs" />
                    Shop ID: {config.shopId} • Powered by Printly Platform
                </p>
            </div>
        </div>
    );
};

// Editable Setting Row Component
const EditableSettingRow: React.FC<{
    icon: string;
    title: string;
    value: string;
    isEditing: boolean;
    onChange: (value: string) => void;
}> = ({ icon, title, value, isEditing, onChange }) => (
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
            <Icon name={icon} className="text-slate-500 dark:text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 dark:text-white text-sm mb-1">{title}</p>
            {isEditing ? (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 dark:text-white"
                />
            ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">{value}</p>
            )}
        </div>
    </div>
);
