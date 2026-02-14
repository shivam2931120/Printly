import React from 'react';
import {
    Check,
    Layers,
    Book,
    File as FileIcon,
    Palette,
    X,
    Copy,
    Minus,
    Plus
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

    const pill = (selected: boolean) => cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer select-none",
        selected
            ? "bg-white text-black shadow-[0_0_12px_rgba(255,255,255,0.15)]"
            : "bg-white/[0.04] text-text-muted border border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
    );

    return (
        <div className="space-y-4 animate-fade-in pb-24">
            <div>
                <h2 className="text-xl font-black text-white font-display">Print Settings</h2>
                <p className="text-text-muted text-xs mt-0.5">Customize your print options</p>
            </div>

            {/* All options in a compact card */}
            <div className="glass rounded-2xl p-4 space-y-4">
                {/* Color Mode */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Color</span>
                    <div className="flex gap-1.5">
                        {(['bw', 'color'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => updateOption('colorMode', mode)}
                                className={pill(options.colorMode === mode)}
                            >
                                <Palette size={12} />
                                {mode === 'bw' ? 'B&W' : 'Color'}
                                {options.colorMode === mode && <Check size={10} />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Sides */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Sides</span>
                    <div className="flex gap-1.5">
                        {(['single', 'double'] as const).map((side) => (
                            <button
                                key={side}
                                onClick={() => updateOption('sides', side)}
                                className={pill(options.sides === side)}
                            >
                                <FileIcon size={12} />
                                {side === 'single' ? 'Single' : 'Double'}
                                {options.sides === side && <Check size={10} />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Binding */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Binding</span>
                    <div className="flex gap-1.5">
                        {[
                            { id: 'none', label: 'None', icon: X },
                            { id: 'spiral', label: 'Spiral', icon: Layers },
                            { id: 'soft', label: 'Soft', icon: Book },
                            { id: 'hard', label: 'Hard', icon: Book },
                        ].map((bind) => {
                            const bindId = bind.id as PrintOptions['binding'];
                            return (
                                <button
                                    key={bind.id}
                                    onClick={() => updateOption('binding', bindId)}
                                    className={pill(options.binding === bindId)}
                                >
                                    <bind.icon size={12} />
                                    {bind.label}
                                    {options.binding === bindId && <Check size={10} />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-white/[0.06]" />

                {/* Copies */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Copies</span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => updateOption('copies', Math.max(1, options.copies - 1))}
                            className="size-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                        >
                            <Minus size={12} />
                        </button>
                        <span className="text-base font-bold text-white w-5 text-center tabular-nums">{options.copies}</span>
                        <button
                            onClick={() => updateOption('copies', options.copies + 1)}
                            className="size-7 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-colors"
                        >
                            <Plus size={12} />
                        </button>
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
