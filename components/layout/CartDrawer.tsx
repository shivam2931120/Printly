import React, { useCallback } from 'react';
import {
    X,
    ShoppingBag,
    Trash2,
    ArrowRight,
    FileText,
    Package,
    Minus,
    Plus,
    CreditCard,
    AlertTriangle,
    RefreshCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useClerkSupabase } from '../../services/clerkSupabase';
import { useCartStore } from '../../store/useCartStore';
import { compressPdf } from '../../lib/compressPdf';
import { useOrderStore } from '../../store/useOrderStore';
import { useShopStore } from '../../store/useShopStore';
import { abandonUnpaidOrder, createOrder, uploadFile } from '../../services/data';
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

const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(true), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

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

type CartIssue = {
    id: string;
    severity: 'error' | 'warning';
    message: string;
};

const buildCartIssues = (cart: CartItem[], paymentRetryMessage: string | null): CartIssue[] => {
    const issues: CartIssue[] = [];

    cart.forEach((item) => {
        if (item.type === 'print') {
            if (!item.file && !item.fileUrl) {
                issues.push({
                    id: `missing-file-${item.id}`,
                    severity: 'error',
                    message: `${item.name} is missing its file. Remove it and upload the PDF again.`,
                });
            }

            if (!item.pageCount || item.pageCount <= 0) {
                issues.push({
                    id: `page-count-${item.id}`,
                    severity: 'warning',
                    message: `${item.name} is still being checked for page count. Wait for analysis to finish before checkout.`,
                });
            }
        }

        if (item.type === 'product') {
            if (item.isActive === false) {
                issues.push({
                    id: `inactive-product-${item.id}`,
                    severity: 'error',
                    message: `${item.name} is no longer available. Remove it from the cart.`,
                });
            }

            if (typeof item.stock === 'number') {
                if (item.stock <= 0) {
                    issues.push({
                        id: `sold-out-${item.id}`,
                        severity: 'error',
                        message: `${item.name} is out of stock. Remove it from the cart.`,
                    });
                } else if (item.quantity > item.stock) {
                    issues.push({
                        id: `low-stock-${item.id}`,
                        severity: 'error',
                        message: `Only ${item.stock} ${item.name} available. Reduce the quantity to continue.`,
                    });
                }
            }
        }
    });

    if (paymentRetryMessage) {
        issues.unshift({
            id: 'payment-retry',
            severity: 'warning',
            message: paymentRetryMessage,
        });
    }

    return issues;
};

const createRazorpayOrder = async (appOrderId: string, amountPaise: number) => {
    const response = await fetch('/api/razorpay-order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appOrderId, amountPaise }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.order?.id) {
        throw new Error(body?.error || 'Could not create Razorpay order.');
    }
    return body as { keyId?: string; order: { id: string; amount: number; currency: string; receipt?: string } };
};

const verifyRazorpayPayment = async (
    appOrderId: string,
    response: {
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
    }
) => {
    const verifyResponse = await fetch('/api/verify-razorpay-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appOrderId, ...response }),
    });
    const body = await verifyResponse.json().catch(() => null);
    if (!verifyResponse.ok || body?.success !== true) {
        throw new Error(body?.error || 'Payment verification failed.');
    }
    return body as { success: true; orderId: string; alreadyPaid?: boolean };
};

export const CartDrawer: React.FC = () => {
    const { user } = useAuth();
    const { getAuthenticatedClient } = useClerkSupabase();
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
    const selectedShopId = useShopStore((state) => state.selectedShopId);

    const cartTotal = getCartTotal();

    // State for upload progress
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [confirmedOrder, setConfirmedOrder] = React.useState<Order | null>(null);
    const [paymentRetryMessage, setPaymentRetryMessage] = React.useState<string | null>(null);
    const cartIssues = React.useMemo(() => buildCartIssues(cart, paymentRetryMessage), [cart, paymentRetryMessage]);
    const blockingIssues = React.useMemo(() => cartIssues.filter((issue) => issue.severity === 'error'), [cartIssues]);

    const handlePayment = useCallback(async () => {
        if (cart.length === 0 || cartTotal <= 0) {
            toast.error('Your cart is empty.');
            return;
        }

        if (blockingIssues.length > 0) {
            toast.error(blockingIssues[0].message);
            return;
        }

        if (!user) {
            toast.error('Please sign in before checkout.');
            toggleCart(false);
            navigate('/sign-in');
            return;
        }

        try {
            await RateLimits.payment(async () => { });
        } catch (err: any) {
            toast.error(err.message || 'Too many payment attempts.');
            return;
        }

        setIsProcessing(true);
        setUploadProgress(0);
        setPaymentRetryMessage(null);

        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (razorpayKey && !/^rzp_(test|live)_/i.test(razorpayKey)) {
            toast.error('Payment gateway key is invalid. Please configure VITE_RAZORPAY_KEY_ID.');
            setIsProcessing(false);
            return;
        }

        const res = await loadRazorpayScript();

        if (!res) {
            toast.error('Razorpay SDK failed to load. Are you online?');
            setIsProcessing(false);
            return;
        }

        const dbClient = await getAuthenticatedClient();
        let uploadError = false;
        const totalFiles = cart.filter(i => i.type === 'print' && !(i as any).fileUrl).length;
        let filesUploaded = 0;

        const processedCart = await Promise.all(cart.map(async (item) => {
            if (item.type !== 'print') return item;

            if ((item as any).fileUrl) {
                const { file: _file, ...rest } = item as any;
                return rest as CartItem;
            }

            if (!((item as any).file instanceof File) || !(item as any).file.name) {
                uploadError = true;
                return item;
            }

            try {
                const compressedFile = await compressPdf((item as any).file);
                const publicUrl = await uploadFile(compressedFile, dbClient);
                if (!publicUrl) {
                    uploadError = true;
                    return item;
                }

                filesUploaded++;
                if (totalFiles > 0) {
                    setUploadProgress(Math.round((filesUploaded / totalFiles) * 100));
                }

                const { file: _file, ...rest } = item as any;
                return { ...rest, fileUrl: publicUrl } as CartItem;
            } catch (err) {
                console.error('Upload failed for item', item.name, err);
                uploadError = true;
                return item;
            }
        }));

        if (uploadError || processedCart.some(item => item.type === 'print' && !(item as any).fileUrl)) {
            toast.error('File upload failed. Please remove and re-add any missing print files, then try again.');
            setIsProcessing(false);
            return;
        }

        const totalAmount = parseFloat((cartTotal * 1.05).toFixed(2));
        const now = new Date();
        const pendingOrder: Order = {
            id: generateId(),
            userId: user.id,
            clerkId: user.authId,
            userEmail: user.email,
            userName: user.name,
            items: processedCart,
            type: 'mixed',
            totalAmount,
            status: 'pending',
            paymentStatus: 'unpaid',
            shopId: selectedShopId,
            createdAt: now,
            updatedAt: now
        };

        const userRole = user.isAdmin ? 'ADMIN' : (user.isDeveloper ? 'DEVELOPER' : 'USER');
        const createResult = await createOrder(pendingOrder, userRole, dbClient);

        if (!createResult.success) {
            console.error('Failed to save order before payment:', createResult.error?.message || createResult.error);
            toast.error('Could not save your order before payment. No payment was taken.');
            setIsProcessing(false);
            return;
        }

        const savedOrder: Order = {
            ...pendingOrder,
            orderToken: createResult.data?.orderToken || pendingOrder.orderToken,
        };

        let razorpayOrder: Awaited<ReturnType<typeof createRazorpayOrder>>;
        try {
            razorpayOrder = await createRazorpayOrder(savedOrder.id, Math.round(totalAmount * 100));
        } catch (error: any) {
            console.error('Failed to create Razorpay order:', error?.message || error);
            abandonUnpaidOrder(savedOrder.id, dbClient);
            setPaymentRetryMessage('Payment could not start. Please retry after checking your connection.');
            toast.error(error?.message || 'Could not start payment. Please try again.');
            setIsProcessing(false);
            return;
        }

        savedOrder.razorpayOrderId = razorpayOrder.order.id;
        let paymentHandled = false;

        const options = {
            key: razorpayOrder.keyId || razorpayKey,
            amount: String(razorpayOrder.order.amount),
            currency: razorpayOrder.order.currency || "INR",
            order_id: razorpayOrder.order.id,
            name: "Printly",
            description: "Print Order Payment",
            handler: async (response: any) => {
                paymentHandled = true;
                const paymentId = response.razorpay_payment_id;
                let verificationSucceeded = false;
                try {
                    await verifyRazorpayPayment(savedOrder.id, response);
                    verificationSucceeded = true;
                } catch (error: any) {
                    console.error('Payment captured but verification failed:', error?.message || error);
                    setPaymentRetryMessage('Payment was captured but verification is pending. Refresh orders or retry only if it still shows unpaid.');
                    toast.warning('Payment was captured. Verification may take a moment.');
                }

                const paidOrder: Order = {
                    ...savedOrder,
                    status: verificationSucceeded ? 'confirmed' : 'pending',
                    paymentStatus: verificationSucceeded ? 'paid' : 'unpaid',
                    paymentId,
                    razorpayOrderId: response.razorpay_order_id || savedOrder.razorpayOrderId,
                    updatedAt: new Date()
                };

                addOrder(paidOrder); // Update local store too

                // Add Notification
                const { addNotification } = useNotificationStore.getState();
                addNotification({
                    title: verificationSucceeded ? 'Order Placed Successfully' : 'Payment Verification Pending',
                    message: verificationSucceeded
                        ? `Your order #${paidOrder.orderToken || paidOrder.id.slice(-6)} has been placed.`
                        : `Your order #${paidOrder.orderToken || paidOrder.id.slice(-6)} was saved and is waiting for verification.`,
                    type: verificationSucceeded ? 'success' : 'warning'
                });

                clearCart();
                setConfirmedOrder(paidOrder); // Show confirmation modal instead of direct navigation
                if (verificationSucceeded) {
                    toast.success(`Payment successful. Your collection OTP is ${paidOrder.orderToken || paidOrder.id.slice(-6)}`, { duration: 5000 });
                }
                setIsProcessing(false);
            },
            prefill: {
                name: user.name || "User Name",
                email: user.email || "user@example.com",
                contact: "9999999999",
            },
            notes: {
                app_order_id: savedOrder.id,
                order_token: savedOrder.orderToken || '',
            },
            theme: {
                color: "#E53E3E", // Red accent
            },
            modal: {
                ondismiss: () => {
                    if (!paymentHandled) {
                        abandonUnpaidOrder(savedOrder.id, dbClient);
                        setPaymentRetryMessage('Payment was not completed. You can retry checkout when ready.');
                    }
                    setIsProcessing(false);
                },
            },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response: any) {
            paymentHandled = true;
            abandonUnpaidOrder(savedOrder.id, dbClient);
            setPaymentRetryMessage(response?.error?.description || 'Payment failed. Please retry checkout.');
            toast.error(response?.error?.description || 'Payment failed. Please try again.');
            setIsProcessing(false);
        });
        paymentObject.open();
    }, [cartTotal, clearCart, toggleCart, addOrder, cart, user, navigate, getAuthenticatedClient, selectedShopId, blockingIssues]);

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

                    {cartIssues.length > 0 && (
                        <div className="space-y-2">
                            {cartIssues.map((issue) => {
                                const Icon = issue.id === 'payment-retry' ? RefreshCcw : AlertTriangle;
                                return (
                                    <div
                                        key={issue.id}
                                        className={cn(
                                            "flex gap-2 rounded-xl border p-3 text-xs leading-relaxed",
                                            issue.severity === 'error'
                                                ? "border-red-500/30 bg-red-500/10 text-red-200"
                                                : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                                        )}
                                    >
                                        <Icon size={15} className="mt-0.5 shrink-0" />
                                        <span>{issue.message}</span>
                                    </div>
                                );
                            })}
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
                                                <span>
                                                    {typeof item.stock === 'number'
                                                        ? `${Math.max(0, item.stock)} available`
                                                        : 'Product'}
                                                </span>
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
                                                disabled={isProcessing || (item.type === 'product' && typeof item.stock === 'number' && item.quantity >= item.stock)}
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
                            disabled={isProcessing || blockingIssues.length > 0}
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
                    fullOrder={confirmedOrder}
                    onClose={() => {
                        setConfirmedOrder(null);
                        toggleCart(false);
                    }}
                />
            )}
        </div>
    );
};
