// Razorpay Payment Service
// This handles payment integration with Razorpay

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface RazorpayOptions {
    key: string;
    amount: number; // in paise (100 paise = 1 INR)
    currency: string;
    name: string;
    description: string;
    image?: string;
    order_id?: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes?: Record<string, string>;
    theme?: {
        color?: string;
    };
    handler: (response: RazorpayResponse) => void;
    modal?: {
        ondismiss?: () => void;
    };
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
}

export interface PaymentDetails {
    amount: number; // in INR
    orderId: string;
    description: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
}

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

// Initiate payment
export const initiatePayment = async (
    details: PaymentDetails,
    onSuccess: (response: RazorpayResponse) => void,
    onError: (error: string) => void
): Promise<void> => {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
        onError('Failed to load payment gateway. Please try again.');
        return;
    }

    const key = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!key) {
        onError('Payment gateway not configured. Please contact support.');
        return;
    }

    const options: RazorpayOptions = {
        key: key,
        amount: Math.round(details.amount * 100), // Convert to paise
        currency: 'INR',
        name: 'PrintWise',
        description: details.description,
        prefill: {
            name: details.customerName,
            email: details.customerEmail,
            contact: details.customerPhone,
        },
        notes: {
            order_id: details.orderId,
        },
        theme: {
            color: '#3B82F6', // Primary blue
        },
        handler: (response) => {
            onSuccess(response);
        },
        modal: {
            ondismiss: () => {
                onError('Payment cancelled');
            },
        },
    };

    try {
        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (err) {
        onError('Failed to open payment window. Please try again.');
    }
};

// Format amount for display
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
    }).format(amount);
};
