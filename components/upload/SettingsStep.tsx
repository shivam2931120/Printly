import React from 'react';
import {
    Check,
    Layers,
    Book,
    File as FileIcon,
    Palette,
    X,
    Copy
} from 'lucide-react';
import { PrintOptions, PricingConfig } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface SettingsStepProps {
    options: PrintOptions;
    onChange: (opts: PrintOptions) => void;
    totalPrice: number;
    onNext: () => void;
}

export const SettingsStep: React.FC<SettingsStepProps> = ({
    options,
    onChange,
    totalPrice,
    onNext
}) => {
    const updateOption = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
        onChange({ ...options, [key]: value });
    };

    const optionBtnClass = (selected: boolean) => cn(
        "relative flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all duration-200",
        selected
            ? "bg-white text-black border-white shadow-glow-primary"
            : "bg-background-card border-border text-text-muted hover:border-white/20 hover:text-white"
    );

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            <div className="text-center lg:text-left space-y-2">
                <h2 className="text-3xl font-black text-white font-display">Print Settings</h2>
                <p className="text-text-muted">Customize how your documents should look.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {/* Color Mode */}
                <div className="glass rounded-2xl p-4 lg:p-5 space-y-3">
                    <label className="text-xs font-black text-text-muted uppercase tracking-[0.16em] block">Color Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['bw', 'color'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => updateOption('colorMode', mode)}
                                className={optionBtnClass(options.colorMode === mode)}
                            >
                                <Palette size={16} />
                                <span>{mode === 'bw' ? 'Black & White' : 'Full Color'}</span>
                                {options.colorMode === mode && <Check size={13} className="absolute top-2 right-2" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sides */}
                <div className="glass rounded-2xl p-4 lg:p-5 space-y-3">
                    <label className="text-xs font-black text-text-muted uppercase tracking-[0.16em] block">Sides</label>
                    <div className="grid grid-cols-2 gap-2">
                        {(['single', 'double'] as const).map((side) => (
                            <button
                                key={side}
                                onClick={() => updateOption('sides', side)}
                                className={optionBtnClass(options.sides === side)}
                            >
                                <FileIcon size={16} />
                                <span>{side === 'single' ? 'Single Sided' : 'Double Sided'}</span>
                                {options.sides === side && <Check size={13} className="absolute top-2 right-2" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Binding */}
                <div className="glass rounded-2xl p-4 lg:p-5 space-y-3 lg:col-span-2">
                    <label className="text-xs font-black text-text-muted uppercase tracking-[0.16em] block">Binding</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { id: 'none', label: 'None', icon: X },
                            { id: 'spiral', label: 'Spiral', icon: Layers },
                            { id: 'soft', label: 'Soft', icon: Book },
                            { id: 'hard', label: 'Hard', icon: Book },
                        ].map((bind) => {
                            const bindId = bind.id as PrintOptions['binding'];
                            const isSelected = options.binding === bindId;

                            return (
                                <button
                                    key={bind.id}
                                    onClick={() => updateOption('binding', bindId)}
                                    className={optionBtnClass(isSelected)}
                                >
                                    <bind.icon size={16} />
                                    <span>{bind.label}</span>
                                    {isSelected && <Check size={13} className="absolute top-2 right-2" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Copies Stepper */}
                <div className="glass rounded-2xl p-4 lg:p-5 space-y-3 lg:col-span-2">
                    <label className="text-xs font-black text-text-muted uppercase tracking-[0.16em] block">Number of Copies</label>
                    <div className="flex items-center justify-between p-4 bg-background-card border border-border rounded-xl">
                        <div className="flex items-center gap-2">
                            <Copy size={16} className="text-text-muted" />
                            <span className="text-white font-semibold">Copies per document</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => updateOption('copies', Math.max(1, options.copies - 1))}
                                className="size-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                            >
                                -
                            </button>
                            <span className="text-xl font-bold text-white w-6 text-center">{options.copies}</span>
                            <button
                                onClick={() => updateOption('copies', options.copies + 1)}
                                className="size-9 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Action for Mobile - Above Bottom Nav */}
            <div className="fixed bottom-24 left-0 right-0 p-4 bg-transparent lg:hidden z-[100] pb-0 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-3">
                    <div className="flex-1 bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-white/10 flex justify-between items-center shadow-lg">
                        <p className="text-xs text-text-muted uppercase font-bold">Total</p>
                        <p className="text-xl font-bold text-white">₹{totalPrice.toFixed(0)}</p>
                    </div>
                    <Button
                        onClick={onNext}
                        className="flex-[2] h-14 text-lg font-bold glass-btn glass-btn-primary"
                    >
                        Preview
                    </Button>
                </div>
            </div>
        </div>
    );
};
