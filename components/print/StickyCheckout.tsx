import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StickyCheckoutProps {
 totalPrice: number;
 hasFiles: boolean;
 pageCount: number;
 onAddToCart: () => void;
 disabled?: boolean;
}

/** Mobile-only sticky bottom CTA bar */
export const StickyCheckout: React.FC<StickyCheckoutProps> = ({
 totalPrice,
 hasFiles,
 pageCount,
 onAddToCart,
 disabled,
}) => {
 return (
 <div className="fixed bottom-16 left-0 right-0 z-[40] lg:hidden pointer-events-none">
 <div className="pointer-events-auto p-4 pb-3">
 <AnimatePresence mode="wait">
 <motion.button
 key={hasFiles ? 'active' : 'inactive'}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 10 }}
 whileHover={hasFiles ? { scale: 1.01 } : undefined}
 whileTap={hasFiles ? { scale: 0.98 } : undefined}
 onClick={onAddToCart}
 disabled={disabled || !hasFiles}
 className={cn(
 'w-full py-4 text-base font-bold flex items-center justify-center gap-3 transition-all duration-200',
 hasFiles && !disabled
 ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(255,255,255,0.1)]'
 : 'bg-[#111] text-[#666] cursor-not-allowed',
 )}
 >
 <ShoppingCart size={18} />
 {hasFiles ? (
 <>
 Add to Cart • ₹{Math.round(totalPrice)}
 <ArrowRight size={16} className="ml-1" />
 </>
 ) : (
 'Upload files to continue'
 )}
 </motion.button>
 </AnimatePresence>
 </div>
 </div>
 );
};
