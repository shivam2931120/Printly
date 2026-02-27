import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
 Palette,
 FileText,
 Layers,
 BookOpen,
 X as XIcon,
 Minus,
 Plus,
 RotateCcw,
 ChevronDown,
} from 'lucide-react';
import { PrintOptions, PricingConfig } from '../../types';
import { calculatePriceBreakdown, PriceBreakdownLine } from '../../lib/pricing';
import { OptionButton } from './OptionButton';
import { cn } from '../../lib/utils';

interface SettingsCardProps {
 options: PrintOptions;
 onChange: (opts: PrintOptions) => void;
 pageCount: number;
 pricing: PricingConfig;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
 options,
 onChange,
 pageCount,
 pricing,
}) => {

 const update = <K extends keyof PrintOptions>(key: K, value: PrintOptions[K]) => {
 onChange({ ...options, [key]: value });
 };

 const reset = () => {
 onChange({
 ...options,
 colorMode: 'bw',
 sides: 'single',
 binding: 'none',
 copies: 1,
 paperSize: 'a4',
 pageRangeText: '',
 paperType: 'normal',
 orientation: 'portrait',
 holePunch: false,
 coverPage: 'none',
 });
 };

 const colorDelta = pricing.perPageColor - pricing.perPageBW;

 // Live cost breakdown for the sidebar
 const breakdown = useMemo(
 () => calculatePriceBreakdown(options, pageCount, pricing),
 [options, pageCount, pricing],
 );

 return (
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
 className="flex flex-col h-full"
 >
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <div>
 <h2 className="text-lg font-bold text-white tracking-tight">Print Settings</h2>
 <p className="text-xs text-[#666] mt-0.5">Customize your print options</p>
 </div>
 <button
 onClick={reset}
 className="flex items-center gap-1.5 text-xs font-medium text-[#666] hover:text-white transition-colors"
 >
 <RotateCcw size={12} /> Reset
 </button>
 </div>

 {/* Settings Grid */}
 <div className="space-y-5 flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">

 {/* COLOR */}
 <section>
 <label className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 block">Color</label>
 <div className="flex flex-wrap gap-2">
 <OptionButton
 label="B&W"
 selected={options.colorMode === 'bw'}
 onClick={() => update('colorMode', 'bw')}
 icon={<Palette size={14} />}
 />
 <OptionButton
 label="Color"
 selected={options.colorMode === 'color'}
 onClick={() => update('colorMode', 'color')}
 icon={<Palette size={14} />}
 badge={`+₹${colorDelta}/pg`}
 badgeColor="text-emerald-400"
 />
 </div>
 </section>

 {/* SIDES */}
 <section>
 <label className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 block">Sides</label>
 <div className="flex flex-wrap gap-2">
 <OptionButton
 label="Single"
 selected={options.sides === 'single'}
 onClick={() => update('sides', 'single')}
 icon={<FileText size={14} />}
 />
 <OptionButton
 label="Double"
 selected={options.sides === 'double'}
 onClick={() => update('sides', 'double')}
 icon={<FileText size={14} />}
 badge={`-₹${pricing.doubleSidedDiscount}/pg`}
 badgeColor="text-blue-400"
 />
 </div>
 </section>

 {/* PAPER SIZE */}
 <section>
 <label className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 block">Paper Size</label>
 <div className="relative">
 <select
 value={options.paperSize}
 onChange={(e) => update('paperSize', e.target.value as PrintOptions['paperSize'])}
 className="w-full appearance-none px-4 py-3 bg-[#0A0A0A] border border-[#333]/[0.06] text-white text-sm font-medium focus:outline-none focus:border-[#333] transition-colors cursor-pointer"
 >
 <option value="a4">A4 (210 × 297mm)</option>
 <option value="a3">A3 (297 × 420mm)</option>
 <option value="letter">Letter (8.5 × 11″)</option>
 <option value="legal">Legal (8.5 × 14″)</option>
 </select>
 <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] pointer-events-none" />
 </div>
 </section>

 {/* COPIES */}
 <section>
 <label className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 block">Copies</label>
 <div className="flex items-center gap-4">
 <motion.button
 whileTap={{ scale: 0.85 }}
 onClick={() => update('copies', Math.max(1, options.copies - 1))}
 className="size-10 bg-[#111] border border-[#333]/[0.06] flex items-center justify-center text-white hover:bg-[#111] transition-colors"
 >
 <Minus size={16} />
 </motion.button>
 <span className="text-xl font-bold text-white w-8 text-center tabular-nums">
 {options.copies}
 </span>
 <motion.button
 whileTap={{ scale: 0.85 }}
 onClick={() => update('copies', options.copies + 1)}
 className="size-10 bg-red-600 text-white flex items-center justify-center hover:bg-gray-200 transition-colors"
 >
 <Plus size={16} />
 </motion.button>
 </div>
 </section>

 {/* PAGE RANGE (text note for admin) */}
 <section>
 <label className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 block">Pages to Print</label>
 <input
 type="text"
 value={options.pageRangeText}
 onChange={(e) => update('pageRangeText', e.target.value)}
 placeholder="e.g. All, 1-10, 5,8,12-20"
 className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#333]/[0.06] text-white text-sm focus:outline-none focus:border-[#333] transition-colors placeholder-white/20"
 />
 <p className="text-[10px] text-[#666] mt-1.5">Leave blank to print all pages</p>
 </section>

 {/* BINDING */}
 <section>
 <label className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 block">Binding</label>
 <div className="grid grid-cols-2 gap-2">
 {([
 { id: 'none', label: 'None', icon: <XIcon size={14} />, price: 0 },
 { id: 'spiral', label: 'Spiral', icon: <Layers size={14} />, price: pricing.bindingPrices.spiral },
 { id: 'soft', label: 'Soft Cover', icon: <BookOpen size={14} />, price: pricing.bindingPrices.soft },
 { id: 'hard', label: 'Hard Cover', icon: <BookOpen size={14} />, price: pricing.bindingPrices.hard },
 ] as const).map((b) => (
 <OptionButton
 key={b.id}
 label={b.label}
 selected={options.binding === b.id}
 onClick={() => update('binding', b.id as PrintOptions['binding'])}
 icon={b.icon}
 badge={b.price > 0 ? `+₹${b.price}` : undefined}
 badgeColor="text-amber-400"
 />
 ))}
 </div>
 </section>
 </div>

 {/* Desktop: Inline Cost Breakdown */}
 <div className="hidden lg:block mt-6 pt-6 border-t border-[#333]/[0.06]">
 <h3 className="text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3">Cost Breakdown</h3>
 <div className="space-y-1.5">
 {breakdown.lines.map((line, i) => (
 <div key={i} className="flex justify-between items-baseline text-sm">
 <div className="flex items-baseline gap-1.5 min-w-0">
 <span className={cn('truncate', line.amount < 0 ? 'text-emerald-400' : 'text-[#666]')}>{line.label}</span>
 {line.detail && <span className="text-[10px] text-[#666] shrink-0">{line.detail}</span>}
 </div>
 <span className={cn('font-medium tabular-nums shrink-0', line.amount < 0 ? 'text-emerald-400' : 'text-white')}>
 {line.amount < 0 ? `-₹${Math.abs(line.amount).toFixed(0)}` : `₹${line.amount.toFixed(0)}`}
 </span>
 </div>
 ))}
 </div>
 </div>
 </motion.div>
 );
};
