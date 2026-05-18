import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
 CheckCircle2,
 Info,
 FileText,
 Receipt,
 Clock,
 ArrowRight,
 Download,
 Copy,
 Check
} from 'lucide-react';
import { Order, PrintOptions } from '../../types';
import { Button } from '../ui/Button';
import { downloadOrderReceipt } from '../../lib/receipt';

interface OrderConfirmationProps {
 order: {
 id: string;
 tokenNumber?: string;
 fileName?: string;
 pageCount?: number;
 options?: PrintOptions;
 totalAmount: number;
 status: string;
 createdAt: string;
 estimatedReady?: string;
 // Compatibility with new Order structure if needed
 items?: any[];
 };
 fullOrder?: Order;
 onClose: () => void;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
 order,
 fullOrder,
 onClose,
}) => {
 const navigate = useNavigate();
 const [copied, setCopied] = useState(false);

 const handleCopyToken = () => {
 navigator.clipboard.writeText(token).then(() => {
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 });
 };

 const handleViewOrders = () => {
 onClose();
 navigate('/my-orders');
 };

 const handleDownloadReceipt = () => {
 if (fullOrder) {
 downloadOrderReceipt(fullOrder);
 }
 };

 const handleClose = () => {
 onClose();
 };

 const formatDateTime = (dateStr: string) => {
 const date = new Date(dateStr);
 return date.toLocaleString('en-IN', {
 dateStyle: 'medium',
 timeStyle: 'short',
 });
 };

 const getBindingLabel = (binding: string) => {
 const labels: Record<string, string> = {
 none: 'No Binding',
 spiral: 'Spiral Binding',
 soft: 'Soft Cover',
 hard: 'Hard Cover',
 };
 return labels[binding] || binding;
 };

 // Helper to get token (fallback)
 const token = order.tokenNumber || order.id.slice(-6).toUpperCase();
 const isPaymentVerified = fullOrder?.paymentStatus !== 'unpaid';
 const HeaderIcon = isPaymentVerified ? CheckCircle2 : Clock;

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 {/* Backdrop */}
 <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={handleClose} />

 {/* Modal */}
 <div className="relative w-full max-w-lg bg-surface-dark border rounded-2xl shadow-xl border-border overflow-hidden animate-zoom-in">
 {/* Success Header */}
 <div className={`${isPaymentVerified ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'} p-8 text-center text-foreground relative overflow-hidden`}>
 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
 <div className="relative z-10">
 <div className="inline-flex items-center justify-center size-20 bg-background-subtle mb-4 ">
 <HeaderIcon className="w-10 h-10 text-foreground" />
 </div>
 <h2 className="text-3xl font-black mb-1 tracking-tight">
 {isPaymentVerified ? 'Order Confirmed!' : 'Verification Pending'}
 </h2>
 <p className="text-foreground/90 font-medium">
 {isPaymentVerified ? 'Your print job has been queued' : 'Your saved order is waiting for payment verification'}
 </p>
 </div>
 </div>

 {/* Token Display */}
 <div className="p-6 border-b border-border-dark bg-background-dark/50">
 <p className="text-xs font-bold text-foreground-muted text-center uppercase tracking-widest mb-3">Order Token</p>
 <div className="flex items-center justify-center gap-2">
 {token.split('').map((char, idx) => (
 <div
 key={idx}
 className="w-12 h-14 bg-surface-dark border rounded-2xl shadow-xl border-border-dark flex items-center justify-center text-3xl font-black text-primary "
 >
 {char}
 </div>
 ))}
 </div>
 <div className="flex items-center justify-center mt-4 gap-3">
 <p className="text-xs text-foreground-muted flex items-center gap-1.5">
 <Info size={14} />
 Show this token at the counter
 </p>
 <button
 onClick={handleCopyToken}
 className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold transition-all ${copied ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-background-subtle text-foreground-muted border border-border hover:bg-background-subtle hover:text-foreground'}`}
 >
 {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
 </button>
 </div>
 </div>

 {/* Order Details */}
 <div className="p-6 space-y-5">
 {/* Item Preview (First item or summary) */}
 <div className="flex items-center gap-4 p-4 bg-background-card/5 border border-border">
 <div className="size-12 bg-red-900/20 flex items-center justify-center text-primary shrink-0">
 <FileText size={24} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-bold text-foreground truncate text-lg">
 {order.fileName || 'Print Order'}
 </p>
 <p className="text-sm text-foreground-muted">
 {order.pageCount ? `${order.pageCount} pages • ` : ''}
 {order.options?.copies || 1} copies
 </p>
 </div>
 </div>

 {order.options && (
 <div className="grid grid-cols-2 gap-3 text-sm">
 <div className="p-3 bg-background-dark border border-border-dark">
 <p className="text-xs text-foreground-muted mb-1">Print Color</p>
 <p className="font-bold text-foreground-muted capitalize">
 {order.options.colorMode === 'color' ? 'Color' : 'Black & White'}
 </p>
 </div>
 <div className="p-3 bg-background-dark border border-border-dark">
 <p className="text-xs text-foreground-muted mb-1">Paper Size</p>
 <p className="font-bold text-foreground-muted uppercase">{order.options.paperSize}</p>
 </div>
 </div>
 )}

 {/* Total & Time */}
 <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
 <div>
 <p className="text-xs text-foreground-muted font-bold uppercase">{isPaymentVerified ? 'Amount Paid' : 'Order Amount'}</p>
 <p className="text-2xl font-black text-primary">₹{order.totalAmount.toFixed(2)}</p>
 </div>
 <div className="text-right">
 <p className="text-xs text-foreground-muted font-bold uppercase">Date</p>
 <p className="text-sm font-medium text-foreground">{formatDateTime(order.createdAt)}</p>
 </div>
 </div>
 </div>

 {/* Actions */}
 <div className="p-6 pt-0 flex gap-3">
 <Button
 variant="ghost"
 onClick={handleClose}
 className="flex-1 text-foreground-muted hover:text-foreground"
 >
 Close
 </Button>
 {fullOrder?.paymentStatus === 'paid' && (
 <Button
 variant="outline"
 onClick={handleDownloadReceipt}
 className="flex-1 gap-2"
 >
 <Download size={16} />
 Receipt
 </Button>
 )}
 <Button
 onClick={handleViewOrders}
 className="flex-1"
 >
 Track Order
 <ArrowRight size={18} className="ml-2" />
 </Button>
 </div>
 </div>
 </div>
 );
};
