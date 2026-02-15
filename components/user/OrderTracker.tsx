import React from 'react';
import { Check, Clock, Loader2, Package } from 'lucide-react';
import { cn } from '../../lib/utils';
import { OrderStatus } from '../../types';

interface OrderTrackerProps {
    status: OrderStatus;
    className?: string;
    onStepClick?: (status: OrderStatus) => void;
}

const steps = [
    { id: 'pending', label: 'Placed', icon: Clock },
    { id: 'confirmed', label: 'Confirmed', icon: Check },
    { id: 'printing', label: 'Printing', icon: Loader2 },
    { id: 'ready', label: 'Ready', icon: Package },
    { id: 'completed', label: 'Collected', icon: Check },
];

export const OrderTracker: React.FC<OrderTrackerProps> = ({ status, className, onStepClick }) => {
    const currentStepIndex = steps.findIndex(s => s.id === status.toLowerCase()) ?? 0;

    return (
        <div className={cn("w-full py-2", className)}>
            <div className="relative flex items-center justify-between">
                {/* Progress Bar Background */}
                <div className="absolute left-0 top-3 -translate-y-1/2 w-full h-0.5 bg-slate-100 dark:bg-zinc-800 rounded-full -z-10" />

                {/* Active Progress Bar */}
                <div
                    className="absolute left-0 top-3 -translate-y-1/2 h-0.5 bg-black dark:bg-white rounded-full -z-10 transition-all duration-500"
                    style={{
                        width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
                    }}
                />

                {steps.map((step, index) => {
                    const isActive = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const Icon = step.icon;
                    const isClickable = !!onStepClick;

                    return (
                        <div
                            key={step.id}
                            onClick={() => isClickable && onStepClick(step.id as OrderStatus)}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all duration-200",
                                isClickable && "cursor-pointer hover:opacity-80 active:scale-95"
                            )}
                        >
                            <div
                                className={cn(
                                    "size-6 rounded-full flex items-center justify-center border-[1.5px] transition-all duration-300 bg-white dark:bg-black",
                                    isActive
                                        ? "border-black dark:border-white text-black dark:text-white"
                                        : "border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700",
                                    isCurrent && step.id === 'printing' && "animate-spin"
                                )}
                            >
                                <Icon size={10} />
                            </div>
                            <span
                                className={cn(
                                    "text-[8px] font-bold uppercase tracking-wider transition-colors duration-300 select-none hidden sm:block",
                                    isActive ? "text-black dark:text-white" : "text-slate-300 dark:text-slate-700"
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
