import React, { useState } from 'react';
import { Icon } from '../ui/Icon';
import { PricingConfig, DEFAULT_PRICING } from '../../types';

interface PricingSettingsProps {
    pricing: PricingConfig;
    onUpdate: (pricing: PricingConfig) => void;
}

export const PricingSettings: React.FC<PricingSettingsProps> = ({ pricing, onUpdate }) => {
    const [localPricing, setLocalPricing] = useState<PricingConfig>(pricing);
    const [saved, setSaved] = useState(false);

    const handleChange = (path: string, value: number) => {
        const keys = path.split('.');
        const updated = { ...localPricing };

        if (keys.length === 1) {
            (updated as any)[keys[0]] = value;
        } else if (keys.length === 2) {
            (updated as any)[keys[0]] = {
                ...(updated as any)[keys[0]],
                [keys[1]]: value,
            };
        }

        setLocalPricing(updated);
        setSaved(false);
    };

    const handleSave = () => {
        onUpdate(localPricing);
        localStorage.setItem('printwise_pricing', JSON.stringify(localPricing));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = () => {
        setLocalPricing(DEFAULT_PRICING);
        setSaved(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pricing Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configure print pricing and discounts</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Reset to Default
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover transition-colors flex items-center gap-2"
                    >
                        {saved ? <Icon name="check" /> : <Icon name="save" />}
                        {saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Per Page Pricing */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Icon name="description" className="text-primary" />
                    Per Page Pricing
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Black & White (₹ per page)
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={localPricing.perPageBW}
                            onChange={(e) => handleChange('perPageBW', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Color (₹ per page)
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={localPricing.perPageColor}
                            onChange={(e) => handleChange('perPageColor', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Discounts */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Icon name="discount" className="text-green-500" />
                    Discounts
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Double-sided Discount (₹ per page)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={localPricing.doubleSidedDiscount}
                            onChange={(e) => handleChange('doubleSidedDiscount', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Service Fee (₹ per order)
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            value={localPricing.serviceFee}
                            onChange={(e) => handleChange('serviceFee', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Binding Prices */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Icon name="book" className="text-purple-500" />
                    Binding Prices
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(['none', 'spiral', 'soft', 'hard'] as const).map((type) => (
                        <div key={type}>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 capitalize">
                                {type === 'none' ? 'No Binding' : `${type} Cover`} (₹)
                            </label>
                            <input
                                type="number"
                                step="5"
                                min="0"
                                value={localPricing.bindingPrices[type]}
                                onChange={(e) => handleChange(`bindingPrices.${type}`, parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Paper Type Fees */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Icon name="layers" className="text-indigo-500" />
                    Paper Type Extra Fees (Per Page)
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                    {(['normal', 'bond', 'glossy'] as const).map((type) => (
                        <div key={type}>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 capitalize">
                                {type} Paper (+₹)
                            </label>
                            <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={localPricing.paperTypeFees?.[type] || 0}
                                onChange={(e) => handleChange(`paperTypeFees.${type}`, parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Additional Services */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Icon name="construction" className="text-orange-500" />
                    Finishing Options
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Hole Punch */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Hole Punch (₹ per file)
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            value={localPricing.holePunchPrice}
                            onChange={(e) => handleChange('holePunchPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    {/* Cover Page */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Cover Page (₹ per page)
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            value={localPricing.coverPagePrice}
                            onChange={(e) => handleChange('coverPagePrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-3 gap-4">
                    {/* Stapling */}
                    {(['none', 'corner', 'side'] as const).map((type) => (
                        <div key={type}>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 capitalize">
                                {type === 'none' ? 'No Stapling' : `${type} Staple`} (₹)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="0"
                                value={localPricing.staplingPrices?.[type] || 0}
                                onChange={(e) => handleChange(`staplingPrices.${type}`, parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Paper Size Multipliers */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Icon name="crop_portrait" className="text-blue-500" />
                    Paper Size Multipliers
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Price multiplier applied based on paper size (1x = normal rate)
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(['a4', 'a3', 'letter', 'legal'] as const).map((size) => (
                        <div key={size}>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 uppercase">
                                {size} (×)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="1"
                                value={localPricing.paperSizeMultiplier[size]}
                                onChange={(e) => handleChange(`paperSizeMultiplier.${size}`, parseFloat(e.target.value) || 1)}
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
