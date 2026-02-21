import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, ShoppingCart } from 'lucide-react';
import { PrintOptions, PricingConfig } from '../../types';
import { calculatePriceBreakdown } from '../../lib/pricing';
import { cn } from '../../lib/utils';

interface SummaryCardProps {
    options: PrintOptions;
    pageCount: number;
    totalPrice: number;
    fileCount: number;
    hasFiles: boolean;
    onAddToCart: () => void;
    disabled?: boolean;
    pricing: PricingConfig;
}

/* Animated counter that smoothly rolls between values */
const AnimatedPrice: React.FC<{ value: number }> = ({ value }) => {
    const [display, setDisplay] = useState(value);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const start = display;
        const diff = value - start;
        if (diff === 0) return;
        const duration = 300;
        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(start + diff * eased));
            if (progress < 1) frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [value]);

    return <span>₹{display}</span>;
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
    options,
    pageCount,
    totalPrice,
    fileCount,
    hasFiles,
    onAddToCart,
    disabled,
    pricing,
}) => {
    const breakdown = calculatePriceBreakdown(options, pageCount, pricing);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col h-full"
        >
            {/* Header */}
            <div className="mb-5">
                <h2 className="text-xl font-bold text-white tracking-tight">Order Summary</h2>
                <p className="text-sm text-gray-500 mt-0.5">Review your order before checkout</p>
            </div>

            {/* Selected Options */}
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Documents</span>
                    <span className="text-white font-medium">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Pages</span>
                    <span className="text-white font-medium">{pageCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Color</span>
                    <span className="text-white font-medium">{options.colorMode === 'color' ? 'Color' : 'B&W'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Sides</span>
                    <span className="text-white font-medium">{options.sides === 'double' ? 'Double-sided' : 'Single-sided'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Paper</span>
                    <span className="text-white font-medium">{options.paperSize.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Copies</span>
                    <span className="text-white font-medium">{options.copies}</span>
                </div>
                {options.binding !== 'none' && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Binding</span>
                        <span className="text-white font-medium capitalize">{options.binding}</span>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] my-1" />

            {/* Breakdown */}
            <div className="space-y-2 my-4">
                {breakdown.lines.map((line, i) => (
                    <div key={i} className="flex justify-between items-baseline text-sm">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <span className={cn('truncate', line.amount < 0 ? 'text-emerald-400' : 'text-gray-500')}>
                                {line.label}
                            </span>
                            {line.detail && (
                                <span className="text-[10px] text-gray-600 shrink-0">{line.detail}</span>
                            )}
                        </div>
                        <span className={cn('font-medium tabular-nums shrink-0', line.amount < 0 ? 'text-emerald-400' : 'text-white')}>
                            {line.amount < 0 ? `-₹${Math.abs(line.amount).toFixed(0)}` : `₹${line.amount.toFixed(0)}`}
                        </span>
                    </div>
                ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] my-1" />

            {/* Hero Price */}
            <div className="text-center my-6">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Estimated Total</p>
                <div className="text-5xl font-black text-white tabular-nums font-display">
                    <AnimatedPrice value={Math.round(totalPrice)} />
                </div>
            </div>

            {/* Desktop CTA */}
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={onAddToCart}
                disabled={disabled || !hasFiles}
                className={cn(
                    'mt-auto w-full py-4 rounded-2xl text-base font-bold items-center justify-center gap-3 transition-all duration-200 hidden lg:flex',
                    hasFiles && !disabled
                        ? 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.12)] cursor-pointer'
                        : 'bg-white/[0.06] text-gray-600 cursor-not-allowed',
                )}
            >
                <ShoppingCart size={18} />
                {hasFiles ? `Add to Cart • ₹${Math.round(totalPrice)}` : 'Upload files to continue'}
            </motion.button>
        </motion.div>
    );
};
