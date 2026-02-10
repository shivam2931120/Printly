import React from 'react';
import {
    Check,
    Layers,
    Smartphone,
    Book,
    File as FileIcon,
    Palette
} from 'lucide-react';
import { PrintOptions, PricingConfig } from '../../types';
import { cn } from '../../lib/utils';
import { calculatePrintPrice } from '../../lib/pricing';
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

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white font-display">Print Settings</h2>
                <p className="text-text-muted">Customize how your documents should look.</p>
            </div>

            <div className="space-y-6">
                {/* Color Mode */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Color Mode</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['bw', 'color'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => updateOption('colorMode', mode)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200",
                                    options.colorMode === mode
                                        ? "bg-white text-black border-white"
                                        : "bg-background-card border-border text-text-muted hover:border-white/20 hover:text-white"
                                )}
                            >
                                <Palette size={18} className="mb-1" />
                                <span className="text-xs font-bold capitalize">{mode === 'bw' ? 'Black & White' : 'Full Color'}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sides */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Sides</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['single', 'double'] as const).map((side) => (
                            <button
                                key={side}
                                onClick={() => updateOption('sides', side)}
                                className={cn(
                                    "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200",
                                    options.sides === side
                                        ? "bg-white text-black border-white"
                                        : "bg-background-card border-border text-text-muted hover:border-white/20 hover:text-white"
                                )}
                            >
                                <FileIcon size={18} className="mb-1" />
                                <span className="text-xs font-bold capitalize">{side === 'single' ? 'Single Sided' : 'Double Sided'}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Binding */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Binding</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'none', label: 'None', icon: XIcon },
                            { id: 'spiral', label: 'Spiral', icon: Layers },
                            { id: 'soft', label: 'Soft', icon: Book },
                            { id: 'hard', label: 'Hard', icon: Book },
                        ].map((bind) => {
                            // Correct type casting for mapping
                            const bindId = bind.id as any;
                            const isSelected = options.binding === bindId;

                            return (
                                <button
                                    key={bind.id}
                                    onClick={() => updateOption('binding', bindId)}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-200 relative overflow-hidden",
                                        isSelected
                                            ? "bg-white text-black border-white"
                                            : "bg-background-card border-border text-text-muted hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    <div className="z-10 flex flex-col items-center">
                                        <bind.icon size={18} className="mb-1" />
                                        <span className="text-[10px] font-bold">{bind.label}</span>
                                    </div>
                                    {isSelected && <div className="absolute top-1 right-1 text-black"><Check size={10} /></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Copies Stepper */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider block">Number of Copies</label>
                    <div className="flex items-center justify-between p-4 bg-background-card border border-border rounded-xl">
                        <span className="text-white font-medium">Copies per document</span>
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => updateOption('copies', Math.max(1, options.copies - 1))}
                                className="size-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                            >
                                -
                            </button>
                            <span className="text-xl font-bold text-white w-6 text-center">{options.copies}</span>
                            <button
                                onClick={() => updateOption('copies', options.copies + 1)}
                                className="size-8 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90"
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
                        className="flex-[2] h-14 text-lg font-bold bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-2xl"
                    >
                        Preview
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Helper Icon
const XIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
