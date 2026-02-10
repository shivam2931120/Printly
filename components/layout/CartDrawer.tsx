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
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { useOrderStore } from '../../store/useOrderStore';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { CartItem, Order } from '../../types';

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
    const { user } = useUser();
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

    const handlePayment = useCallback(async () => {
        const res = await loadRazorpayScript();

        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            return;
        }

        const totalAmount = (cartTotal * 1.05).toFixed(2);

        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_PLACEHOLDER',
            amount: Math.round(parseFloat(totalAmount) * 100).toString(),
            currency: "INR",
            name: "Printly",
            description: "Print Order Payment",
            image: "https://via.placeholder.com/150",
            handler: (response: any) => {
                console.log(response);

                const otp = Math.floor(100000 + Math.random() * 900000).toString();

                // Create Order Object
                const newOrder: Order = {
                    id: response.razorpay_payment_id || Math.random().toString(36).substr(2, 9),
                    userId: user?.id,
                    userEmail: user?.primaryEmailAddress?.emailAddress || 'guest@example.com',
                    userName: user?.fullName || 'Guest',
                    items: [...cart],
                    type: 'mixed',
                    totalAmount: parseFloat(totalAmount),
                    status: 'pending',
                    paymentStatus: 'paid',
                    paymentId: response.razorpay_payment_id,
                    otp: otp,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                addOrder(newOrder);
                clearCart();
                toggleCart(false);
                navigate('/profile');
                // In a real app, you'd show a success modal here. For now, let's rely on Profile page showing it "right after".
                alert(`Payment Successful! Your collection OTP is ${otp}`);
            },
            prefill: {
                name: user?.fullName || "User Name",
                email: user?.primaryEmailAddress?.emailAddress || "user@example.com",
                contact: "9999999999",
            },
            notes: {
                address: "Razorpay Corporate Office",
            },
            theme: {
                color: "#000000",
            },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response: any) {
            alert(response.error.description);
        });
        paymentObject.open();
    }, [cartTotal, clearCart, toggleCart, addOrder, cart, user, navigate]);

    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
                onClick={() => toggleCart(false)}
            />

            {/* Drawer */}
            <div
                className="relative w-full max-w-[400px] bg-background-card h-full shadow-2xl flex flex-col border-l border-border animate-slide-in-right"
            >
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-background-card/95 backdrop-blur z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3 font-display">
                        Your Cart
                        <span className="bg-white text-black text-xs font-bold px-2 py-0.5 rounded-full">
                            {cart.length}
                        </span>
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleCart(false)}
                        className="hover:bg-white/5 text-text-muted hover:text-white rounded-full"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-text-muted">
                            <div className="size-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                <ShoppingBag size={48} className="opacity-20" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 font-display">Your cart is empty</h3>
                            <p className="text-sm max-w-[200px]">Looks like you haven't added anything yet.</p>
                            <Button
                                variant="outline"
                                className="mt-8 border-white/10 hover:bg-white hover:text-black"
                                onClick={() => toggleCart(false)}
                            >
                                Continue Shopping
                            </Button>
                        </div>
                    ) : (
                        cart.map((item) => (
                            <div
                                key={item.id}
                                className="group relative flex gap-4"
                            >
                                {/* Thumbnail */}
                                <div className="size-20 rounded-xl bg-background flex items-center justify-center shrink-0 border border-border text-text-muted relative overflow-hidden">
                                    {item.type === 'print' ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <FileText size={20} className="text-white" />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">PDF</span>
                                        </div>
                                    ) : (
                                        item.image && (item.image.startsWith('http') || item.image.startsWith('/'))
                                            ? <img src={item.image} alt={item.name} className="size-full object-cover" />
                                            : <Package size={24} className="text-white" />
                                    )}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-white line-clamp-1 text-sm font-display leading-tight" title={item.name}>
                                                {item.name}
                                            </h4>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-text-muted hover:text-red-500 transition-colors p-1 -mt-1 -mr-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                            {item.type === 'print' ? (
                                                <span className="flex flex-wrap items-center gap-x-2">
                                                    <span>{(item as any).pageCount} pgs</span>
                                                    <span className="size-0.5 bg-text-muted rounded-full" />
                                                    <span className="capitalize">{(item as any).options?.colorMode}</span>
                                                    <span className="size-0.5 bg-text-muted rounded-full" />
                                                    <span>{(item as any).options?.copies} copies</span>
                                                </span>
                                            ) : (
                                                <span>Product</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex items-end justify-between mt-3">
                                        {/* Quantity Stepper */}
                                        <div className="flex items-center gap-3 bg-background border border-border rounded-lg p-1 h-8">
                                            <button
                                                onClick={() => updateQuantity(item.id, -1)}
                                                className="size-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors text-white disabled:opacity-50"
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, 1)}
                                                className="size-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors text-white"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        <span className="font-bold text-white text-base">
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
                    <div className="p-6 border-t border-border bg-background-card z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-sm text-text-muted">
                                <span>Subtotal</span>
                                <span>₹{cartTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-text-muted">
                                <span>Tax (5%)</span>
                                <span>₹{(cartTotal * 0.05).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-4 border-t border-border">
                                <span className="text-white font-bold text-lg">Total</span>
                                <span className="text-2xl font-bold text-white">₹{(cartTotal * 1.05).toFixed(2)}</span>
                            </div>
                        </div>

                        <Button
                            className="w-full py-6 text-base font-bold bg-white text-black hover:bg-white/90 shadow-none hover:scale-[1.01] active:scale-[0.99] transition-all rounded-xl"
                            onClick={handlePayment}
                        >
                            <span className="flex items-center gap-2">
                                Checkout
                                <ArrowRight size={18} />
                            </span>
                        </Button>
                        <p className="text-center text-[10px] text-text-muted mt-4 flex items-center justify-center gap-2 opacity-60">
                            <CreditCard size={12} />
                            Processed securely via Razorpay
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
