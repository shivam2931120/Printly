import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OptionButtonProps {
 label: string;
 selected: boolean;
 onClick: () => void;
 icon?: React.ReactNode;
 badge?: string;
 badgeColor?: string;
 disabled?: boolean;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
 label,
 selected,
 onClick,
 icon,
 badge,
 badgeColor = 'text-emerald-400',
 disabled = false,
}) => {
 return (
 <motion.button
 whileHover={{ scale: 1.02 }}
 whileTap={{ scale: 0.97 }}
 onClick={onClick}
 disabled={disabled}
 className={cn(
 'relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer select-none border min-w-0',
 selected
 ? 'bg-background-subtle text-foreground border-border -[0_0_20px_rgba(255,255,255,0.06)]'
 : 'bg-background-card text-gray-400 border-border/[0.06] hover:bg-background-subtle hover:text-foreground hover:border-border',
 disabled && 'opacity-40 cursor-not-allowed',
 )}
 >
 {icon && <span className="shrink-0">{icon}</span>}
 <span>{label}</span>

 {badge && !selected && (
 <span className={cn('text-[10px] font-bold ml-0.5', badgeColor)}>{badge}</span>
 )}

 {selected && (
 <motion.span
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 className="ml-auto"
 >
 <Check size={14} strokeWidth={3} />
 </motion.span>
 )}
 </motion.button>
 );
};
