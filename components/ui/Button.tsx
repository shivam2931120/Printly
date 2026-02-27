import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
 "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
 {
 variants: {
 variant: {
 default: "bg-red-600 text-white hover:bg-red-700 border border-red-600 hover:border-red-700",
 destructive:
 "bg-red-900/20 text-white hover:bg-red-600 border border-red-500",
 outline:
 "border border-[#333] bg-transparent text-white hover:bg-[#111] hover:border-[#333]",
 secondary:
 "bg-[#111] text-white border border-[#333] hover:bg-[#1A1A1A] hover:border-[#333]",
 ghost: "text-white hover:bg-[#111]",
 link: "text-red-500 underline-offset-4 hover:underline",
 },
 size: {
 default: "h-11 px-6 py-2",
 sm: "h-9 px-3",
 lg: "h-12 px-8 text-base",
 icon: "h-10 w-10",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 }
)

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, asChild = false, ...props }, ref) => {
 return (
 <button
 className={cn(buttonVariants({ variant, size, className }))}
 ref={ref}
 {...props}
 />
 )
 }
)
Button.displayName = "Button"

export { Button, buttonVariants }
