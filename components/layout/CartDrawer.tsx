import React, { useRef, useCallback } from 'react';
import {
    X,
    ShoppingBag,
    Trash2,
    ArrowRight,
    FileText,
    Package,
    Minus,
    Plus,
    CreditCard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { compressPdf } from '../../lib/compressPdf';
import { useOrderStore } from '../../store/useOrderStore';
import { createOrder, uploadFile } from '../../services/data';
import { useNotificationStore } from '../../store/useNotificationStore';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { CartItem, Order } from '../../types';
import { RateLimits } from '../../lib/rateLimiter';
import { generateId } from '../../lib/utils';

import { OrderConfirmation } from '../user/OrderConfirmation';

// Add global declaration for Razorpay
declare global {
    interface Window {
        Razorpay: any;
    }
}

const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

export const CartDrawer: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const {
        cart,
        isCartOpen,
        toggleCart,
        removeFromCart,
        updateQuantity,
        getCartTotal,
        clearCart
    } = useCartStore();
    const { addOrder } = useOrderStore();

    const cartTotal = getCartTotal();

    // State for upload progress
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [confirmedOrder, setConfirmedOrder] = React.useState<Order | null>(null);

    const handlePayment = useCallback(async () => {
        try {
            await RateLimits.payment(async () => { });
        } catch (err: any) {
            toast.error(err.message || 'Too many payment attempts.');
            return;
        }

        setIsProcessing(true);
        setUploadProgress(0);

        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey || !/^rzp_(test|live)_/i.test(razorpayKey)) {
            toast.error('Payment gateway key is missing or invalid. Please configure VITE_RAZORPAY_KEY_ID.');
            setIsProcessing(false);
            return;
        }

        const res = await loadRazorpayScript();

        if (!res) {
            toast.error('Razorpay SDK failed to load. Are you online?');
            setIsProcessing(false);
            return;
        }

        const totalAmount = (cartTotal * 1.05).toFixed(2);

        const options = {
            key: razorpayKey,
            amount: Math.round(parseFloat(totalAmount) * 100).toString(),
            currency: "INR",
            name: "Printly",
            description: "Print Order Payment",
            handler: async (response: any) => {
                // Generate a clean 6-char pickup code
                const pickupCode = Math.floor(1000 + Math.random() * 9000).toString();

                let uploadError = false;
                const totalFiles = cart.filter(i => i.type === 'print').length;
                let filesUploaded = 0;

                const processedCart = await Promise.all(cart.map(async (item) => {
                    if (item.type === 'print') {
                        // Check for valid file object (persistence issue check)
                        if (!(item as any).file || !(item as any).file.name) {
                            console.error('Missing file object for item:', item.name);
                            uploadError = true;
                            return item;
                        }

                        try {
                            // Compress PDF before upload for smaller storage
                            const compressedFile = await compressPdf((item as any).file);
                            const publicUrl = await uploadFile(compressedFile);
                            if (publicUrl) {
                                filesUploaded++;
                                setUploadProgress(Math.round((filesUploaded / totalFiles) * 100));
                                return { ...item, fileUrl: publicUrl };
                            }
                        } catch (err) {
                            console.error('Upload failed for item', item.name, err);
                        }
                    }
                    return item;
                }));

                if (uploadError) {
                    toast.error("Some files are missing (likely due to page refresh). Please remove and re-add your print items.");
                    setIsProcessing(false);
                    return;
                }

                const newOrder: Order = {
                    id: response.razorpay_payment_id || generateId(),
                    orderToken: pickupCode,
                    userId: user?.id,
                    clerkId: user?.authId, // Clerk user ID for tracing
                    userEmail: user?.email || 'guest@example.com',
                    userName: user?.name || 'Guest',
                    items: processedCart,
                    type: 'mixed',
                    totalAmount: parseFloat(totalAmount),
                    status: 'pending',
                    paymentStatus: 'paid',
                    paymentId: response.razorpay_payment_id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                // Saving Order to DB
                const userRole = user?.isAdmin ? 'ADMIN' : (user?.isDeveloper ? 'DEVELOPER' : 'USER');
                const { success, error } = await createOrder(newOrder, userRole);

                if (!success) {
                    console.error('Failed to save order to DB:', error?.message || error);
                    toast.error('Payment successful but failed to save order. Please contact support.');
                    setIsProcessing(false);
                    return;
                }

                addOrder(newOrder); // Update local store too

                // Add Notification
                const { addNotification } = useNotificationStore.getState();
                addNotification({
                    title: 'Order Placed Successfully',
                    message: `Your order #${newOrder.orderToken} has been placed.`,
                    type: 'success'
                });

                clearCart();
                setConfirmedOrder(newOrder); // Show confirmation modal instead of direct navigation
                toast.success(`Payment Successful! Your collection OTP is ${pickupCode}`, { duration: 5000 });
                setIsProcessing(false);
            },
            prefill: {
                name: user?.name || "User Name",
                email: user?.email || "user@example.com",
                contact: "9999999999",
            },
            notes: {
                address: "Razorpay Corporate Office",
            },
            theme: {
                color: "#E53E3E", // Red accent
            },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response: any) {
            toast.error(response?.error?.description || 'Payment failed. Please try again.');
            setIsProcessing(false);
        });
        paymentObject.open();
    }, [cartTotal, clearCart, toggleCart, addOrder, cart, user, navigate]);

    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 animate-fade-in"
                onClick={() => !isProcessing && toggleCart(false)}
            />

            {/* Drawer */}
            <div
                className="relative w-full max-w-[400px] bg-background-card h-full flex flex-col border-l border-border animate-slide-in-right rounded-l-2xl shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-background-card z-10 rounded-tl-2xl">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-3 font-display">
                        YOUR CART
                        <span className="bg-primary text-primary-foreground rounded-full text-xs font-bold px-2.5 py-0.5">
                            {cart.length}
                        </span>
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleCart(false)}
                        disabled={isProcessing}
                        className="hover:bg-background-subtle text-foreground-muted hover:text-foreground transition-colors duration-300 rounded-full"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Progress Bar Overlay */}
                    {isProcessing && uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-8 text-center animate-fade-in rounded-2xl">
                            <div className="w-full max-w-[200px] bg-background-light h-2 mb-4 overflow-hidden rounded-full">
                                <div
                                    className="bg-primary h-full transition-all duration-300 ease-out rounded-full"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <h3 className="text-foreground font-bold mb-2">Uploading Files ({uploadProgress}%)</h3>
                            <p className="text-xs text-foreground-muted">Please do not close this window...</p>
                        </div>
                    )}

                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-foreground-muted">
                            <div className="size-24 bg-background-subtle rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                <ShoppingBag size={48} className="opacity-40 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-2 font-display">Your cart is empty</h3>
                            <p className="text-sm max-w-[200px]">Looks like you haven't added anything yet.</p>
                            <Button
                                variant="outline"
                                className="mt-8 border-border rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-sm"
                                onClick={() => toggleCart(false)}
                            >
                                Continue Shopping
                            </Button>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "group relative flex gap-4 transition-opacity duration-300",
                                    isProcessing ? "opacity-50 pointer-events-none" : "opacity-100"
                                )}
                            >
                                {/* Thumbnail */}
                                <div className="size-20 bg-background-subtle rounded-2xl flex items-center justify-center shrink-0 border border-border text-foreground-muted relative overflow-hidden shadow-sm">
                                    {item.type === 'print' ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <FileText size={20} className="text-foreground" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-primary">PDF</span>
                                        </div>
                                    ) : (
                                        item.image && (item.image.startsWith('http') || item.image.startsWith('/'))
                                            ? <img src={item.image} alt={item.name} className="size-full object-cover" />
                                            : <Package size={24} className="text-foreground" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-foreground line-clamp-1 text-sm font-display leading-tight" title={item.name}>
                                                {item.name}
                                            </h4>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-foreground-muted hover:text-error transition-all duration-300 p-1 -mt-1 -mr-1 rounded-full hover:bg-error/10"
                                                disabled={isProcessing}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                                            {item.type === 'print' ? (
                                                <span className="flex flex-wrap items-center gap-x-2">
                                                    <span>{(item as any).pageCount} pgs</span>
                                                    <span className="text-border">|</span>
                                                    <span className="capitalize">{(item as any).options?.colorMode}</span>
                                                    <span className="text-border">|</span>
                                                    <span>{(item as any).options?.copies} copies</span>
                                                </span>
                                            ) : (
                                                <span>Product</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex items-end justify-between mt-3">
                                        {/* Quantity Stepper */}
                                        <div className="flex items-center gap-3 bg-background-subtle border border-border rounded-full shadow-sm p-1 h-8">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="size-6 flex items-center justify-center rounded-full hover:bg-border transition-colors text-foreground disabled:opacity-50"
                                                disabled={item.quantity <= 1 || isProcessing}
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-xs font-bold text-foreground w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="size-6 flex items-center justify-center rounded-full hover:bg-border transition-colors text-foreground"
                                                disabled={isProcessing}
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        <span className="font-bold text-foreground text-base">
                                            ₹{(item.price * item.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="p-6 border-t border-border bg-background-card z-20 rounded-bl-2xl">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm text-foreground-muted">
                                <span>Subtotal</span>
                                <span>₹{cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-foreground-muted">
                                <span>Tax (5%)</span>
                                <span>₹{(cartTotal * 0.05).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-4 border-t border-border">
                                <span className="text-foreground font-bold text-lg">Total</span>
                                <span className="text-2xl font-bold text-primary">₹{(cartTotal * 1.05).toFixed(2)}</span>
                            </div>
                        </div>

                        <Button
                            className="w-full py-6 text-base font-bold bg-primary text-primary-foreground hover:bg-primary-hover border-primary hover:border-primary-hover rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 relative overflow-hidden"
                            onClick={handlePayment}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <span className="flex items-center gap-2">
                                    <div className="size-4 border-2 border-border/30 border-t-foreground animate-spin rounded-full" />
                                    Processing...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Checkout
                                    <ArrowRight size={18} />
                                </span>
                            )}
                        </Button>
                        <p className="text-center text-[10px] text-foreground-muted mt-4 flex items-center justify-center gap-2 opacity-60">
                            <CreditCard size={12} />
                            Processed securely via Razorpay
                        </p>
                    </div>
                )}
            </div>
            {confirmedOrder && (
                <OrderConfirmation
                    order={{
                        id: confirmedOrder.id,
                        tokenNumber: confirmedOrder.orderToken,
                        totalAmount: confirmedOrder.totalAmount,
                        status: confirmedOrder.status,
                        createdAt: confirmedOrder.createdAt.toISOString(),
                        fileName: confirmedOrder.items?.[0]?.name || 'Print Order'
                    }}
                    onClose={() => {
                        setConfirmedOrder(null);
                        toggleCart(false);
                    }}
                />
            )}
        </div>
    );
};
