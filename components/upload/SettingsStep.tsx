import React, { useMemo } from 'react';
import {
 Check,
 Layers,
 Book,
 File as FileIcon,
 Palette,
 X,
 Minus,
 Plus,
 ChevronRight,
 RotateCcw
} from 'lucide-react';
import { PrintOptions, PricingConfig } from '../../types';
import { calculatePriceBreakdown } from '../../lib/pricing';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface SettingsStepProps {
 options: PrintOptions;
 onChange: (opts: PrintOptions) => void;
 totalPrice: number;
 pageCount?: number;
 onNext: () => void;
 pricing: PricingConfig;
}

export const SettingsStep: React.FC<SettingsStepProps> = ({
 options,
 onChange,
 totalPrice,
 pageCount = 1,
 onNext,
 pricing,
}) => {

 const updateOption = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
 onChange({ ...options, [key]: value });
 };

 const resetDefaults = () => {
 onChange({
 ...options,
 colorMode: 'bw', sides: 'single', binding: 'none',
 copies: 1, holePunch: false, coverPage: 'none',
 paperSize: 'a4', paperType: 'normal', orientation: 'portrait',
 });
 };

 // Live cost breakdown
 const breakdown = useMemo(
 () => calculatePriceBreakdown(options, pageCount, pricing),
 [options, pageCount, pricing]
 );

 // Price delta helpers
 const colorDelta = pricing.perPageColor - pricing.perPageBW;
 const bindingDeltas: Record<string, number> = {
 none: 0,
 spiral: pricing.bindingPrices.spiral,
 soft: pricing.bindingPrices.soft,
 hard: pricing.bindingPrices.hard,
 };
 const deltaLabel = (amount: number) => {
 if (amount === 0) return null;
 return amount > 0 ? `+₹${amount}` : `-₹${Math.abs(amount)}`;
 };

 const pill = (selected: boolean) => cn(
 "flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
 selected
 ? "bg-red-600 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]"
 : "bg-[#111] text-[#666] border border-[#333] hover:bg-[#111] hover:text-white"
 );

 // Options card content (shared between mobile and desktop)
 const optionsContent = (
 <>
 {/* Color Mode */}
 <div className="flex items-center justify-between" role="group" aria-label="Color mode">
 <span className="text-[10px] font-black text-[#666] uppercase tracking-widest">Color</span>
 <div className="flex gap-1.5">
 {(['bw', 'color'] as const).map((mode) => (
 <button
 key={mode}
 onClick={() => updateOption('colorMode', mode)}
 className={pill(options.colorMode === mode)}
 aria-pressed={options.colorMode === mode}
 aria-label={mode === 'bw' ? 'Black and White' : 'Color'}
 >
 <Palette size={12} />
 <span>{mode === 'bw' ? 'B&W' : 'Color'}</span>
 {mode === 'color' && options.colorMode !== 'color' && (
 <span className="text-[9px] text-emerald-400 font-bold">+₹{colorDelta}/pg</span>
 )}
 {options.colorMode === mode && <Check size={10} />}
 </button>
 ))}
 </div>
 </div>

 <div className="border-t border-[#333]/[0.06]" />

 {/* Sides */}
 <div className="flex items-center justify-between" role="group" aria-label="Sides">
 <span className="text-[10px] font-black text-[#666] uppercase tracking-widest">Sides</span>
 <div className="flex gap-1.5">
 {(['single', 'double'] as const).map((side) => (
 <button
 key={side}
 onClick={() => updateOption('sides', side)}
 className={pill(options.sides === side)}
 aria-pressed={options.sides === side}
 >
 <FileIcon size={12} />
 <span>{side === 'single' ? 'Single' : 'Double'}</span>
 {side === 'double' && options.sides !== 'double' && pricing.doubleSidedDiscount > 0 && (
 <span className="text-[9px] text-blue-400 font-bold">-₹{pricing.doubleSidedDiscount}/pg</span>
 )}
 {options.sides === side && <Check size={10} />}
 </button>
 ))}
 </div>
 </div>

 <div className="border-t border-[#333]/[0.06]" />

 {/* Binding */}
 <div className="flex items-center justify-between" role="group" aria-label="Binding type">
 <span className="text-[10px] font-black text-[#666] uppercase tracking-widest">Binding</span>
 <div className="flex gap-1.5 flex-wrap justify-end">
 {[
 { id: 'none', label: 'None', icon: X },
 { id: 'spiral', label: 'Spiral', icon: Layers },
 { id: 'soft', label: 'Soft', icon: Book },
 { id: 'hard', label: 'Hard', icon: Book },
 ].map((bind) => {
 const bindId = bind.id as PrintOptions['binding'];
 const delta = bindingDeltas[bind.id];
 return (
 <button
 key={bind.id}
 onClick={() => updateOption('binding', bindId)}
 className={pill(options.binding === bindId)}
 aria-pressed={options.binding === bindId}
 >
 <bind.icon size={12} />
 <span>{bind.label}</span>
 {delta > 0 && options.binding !== bindId && (
 <span className="text-[9px] text-amber-400 font-bold">+₹{delta}</span>
 )}
 {options.binding === bindId && <Check size={10} />}
 </button>
 );
 })}
 </div>
 </div>

 <div className="border-t border-[#333]/[0.06]" />

 {/* Copies */}
 <div className="flex items-center justify-between" role="group" aria-label="Number of copies">
 <span className="text-[10px] font-black text-[#666] uppercase tracking-widest">Copies</span>
 <div className="flex items-center gap-3">
 <button
 onClick={() => updateOption('copies', Math.max(1, options.copies - 1))}
 className="size-7 bg-[#111] flex items-center justify-center text-white hover:bg-[#1A1A1A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
 aria-label="Decrease copies"
 >
 <Minus size={12} />
 </button>
 <span className="text-base font-bold text-white w-5 text-center tabular-nums" aria-live="polite">{options.copies}</span>
 <button
 onClick={() => updateOption('copies', options.copies + 1)}
 className="size-7 bg-[#0A0A0A] flex items-center justify-center text-white hover:bg-[#0A0A0A]/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
 aria-label="Increase copies"
 >
 <Plus size={12} />
 </button>
 </div>
 </div>
 </>
 );

 return (
 <div className="space-y-4 animate-fade-in pb-24 lg:pb-4" role="form" aria-label="Print settings">
 <div>
 <h2 className="text-xl lg:text-2xl font-black text-white font-display">Print Settings</h2>
 <p className="text-[#666] text-xs mt-0.5">Customize your print options</p>
 </div>

 {/* Desktop: 2-column layout */}
 <div className="hidden lg:grid lg:grid-cols-[1fr_280px] lg:gap-6">
 {/* Left: Options */}
 <div className="space-y-4">
 {/* Options Card */}
 <div className=" p-5 space-y-5">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-black text-[#666] uppercase tracking-widest">Options</span>
 <button
 onClick={resetDefaults}
 className="text-[10px] text-[#666] hover:text-white transition-colors flex items-center gap-1"
 aria-label="Reset to default settings"
 >
 <RotateCcw size={10} /> Reset
 </button>
 </div>
 {optionsContent}
 </div>
 </div>

 {/* Right: Cost Breakdown + Action */}
 <div className="space-y-4 sticky top-4 self-start">
 {/* Live Cost Breakdown */}
 <div className=" p-5 space-y-3" aria-live="polite">
 <h3 className="text-xs font-black text-[#666] uppercase tracking-widest">Cost Breakdown</h3>
 <div className="space-y-1.5 text-sm">
 {breakdown.lines.map((line, i) => (
 <div key={i} className="flex justify-between items-baseline gap-2">
 <div className="flex items-baseline gap-1.5 min-w-0">
 <span className={cn("truncate", line.amount < 0 ? "text-green-400" : "text-[#666]")}>{line.label}</span>
 {line.detail && (
 <span className="text-[10px] text-[#666]/60 shrink-0">{line.detail}</span>
 )}
 </div>
 <span className={cn("font-medium tabular-nums shrink-0", line.amount < 0 ? "text-green-400" : "text-white")}>
 {line.amount < 0 ? `-₹${Math.abs(line.amount).toFixed(0)}` : `₹${line.amount.toFixed(0)}`}
 </span>
 </div>
 ))}
 </div>
 <div className="border-t border-[#333]/[0.06] pt-3">
 <div className="flex justify-between items-baseline">
 <span className="text-xs text-[#666] uppercase font-bold">Total</span>
 <span className="text-2xl font-black text-white tabular-nums">₹{totalPrice.toFixed(0)}</span>
 </div>
 </div>
 </div>

 <Button
 onClick={onNext}
 className="w-full h-12 text-base font-bold flex items-center justify-center gap-2"
 aria-label="Preview print job"
 >
 Preview <ChevronRight size={18} />
 </Button>
 </div>
 </div>

 {/* Mobile: Single column */}
 <div className="lg:hidden space-y-3">
 <div className=" p-4 space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-black text-[#666] uppercase tracking-widest">Options</span>
 <button
 onClick={resetDefaults}
 className="text-[10px] text-[#666] hover:text-white transition-colors flex items-center gap-1"
 aria-label="Reset to default settings"
 >
 <RotateCcw size={10} /> Reset
 </button>
 </div>
 {optionsContent}
 </div>
 </div>

 {/* Sticky Action for Mobile - Above Bottom Nav */}
 <div className="fixed bottom-24 left-0 right-0 p-4 bg-transparent lg:hidden z-[100] pb-0 pointer-events-none">
 <div className="pointer-events-auto flex items-center gap-3">
 <div className="flex-1 bg-black/80 p-3 border border-[#333] flex justify-between items-center shadow-lg">
 <p className="text-xs text-[#666] uppercase font-bold">Total</p>
 <p className="text-xl font-bold text-white tabular-nums" aria-live="polite">₹{totalPrice.toFixed(0)}</p>
 </div>
 <Button
 onClick={onNext}
 className="flex-[2] h-14 text-lg font-bold"
 >
 Preview
 </Button>
 </div>
 </div>
 </div>
 );
};
