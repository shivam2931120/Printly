import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
 className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
 return (
 <div
 role="status"
 aria-label="Loading"
 className={cn(
 "animate-pulse bg-[#1A1A1A]",
 className
 )}
 {...props}
 />
 );
};
