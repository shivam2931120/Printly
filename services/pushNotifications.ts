/**
 * Browser Push Notification Service
 * Uses the native Notification API to show OS-level notifications
 * when the app is in the background or the tab is not focused.
 */

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/** Check if browser supports Notification API */
export const isNotificationSupported = (): boolean =>
    typeof window !== 'undefined' && 'Notification' in window;

/** Get current notification permission */
export const getPermission = (): PermissionState => {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission as PermissionState;
};

/** Request notification permission from the user */
export const requestPermission = async (): Promise<PermissionState> => {
    if (!isNotificationSupported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';

    try {
        const result = await Notification.requestPermission();
        return result as PermissionState;
    } catch {
        return 'default';
    }
};

/** 
 * Map order status to a user-friendly notification config
 */
const STATUS_MESSAGES: Record<string, { title: string; body: (token?: string) => string; icon: string }> = {
    confirmed: {
        title: '✅ Order Confirmed',
        body: (token) => `Your order${token ? ` #${token}` : ''} has been confirmed and is queued for printing.`,
        icon: '/Printly.png',
    },
    printing: {
        title: '🖨️ Now Printing',
        body: (token) => `Your order${token ? ` #${token}` : ''} is being printed right now!`,
        icon: '/Printly.png',
    },
    ready: {
        title: '📦 Ready for Pickup!',
        body: (token) => `Your order${token ? ` #${token}` : ''} is ready. Show your OTP to collect it.`,
        icon: '/Printly.png',
    },
    completed: {
        title: '🎉 Order Completed',
        body: (token) => `Your order${token ? ` #${token}` : ''} has been collected. Thank you!`,
        icon: '/Printly.png',
    },
};

const ADMIN_STATUS_MESSAGES: Record<string, { title: string; body: (token?: string) => string }> = {
    new_order: {
        title: '🔔 New Order Received',
        body: (token) => `A new order${token ? ` #${token}` : ''} has been placed and is waiting for confirmation.`,
    },
};

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    tag?: string;
    onClick?: () => void;
}

/** Send a browser notification (only if permission granted & page not focused) */
export const sendBrowserNotification = (payload: PushNotificationPayload): void => {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;

    // Only show browser notification when tab is not focused
    if (document.hasFocus()) return;

    try {
        const notification = new Notification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/Printly.png',
            tag: payload.tag || 'printly-notification',
            badge: '/Printly.png',
            silent: false,
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
            payload.onClick?.();
        };

        // Auto-close after 8 seconds
        setTimeout(() => notification.close(), 8000);
    } catch (e) {
        console.warn('Failed to send browser notification:', e);
    }
};

/** Send a push notification for an order status change (student-facing) */
export const notifyOrderStatusChange = (status: string, orderToken?: string): void => {
    const config = STATUS_MESSAGES[status.toLowerCase()];
    if (!config) return;

    sendBrowserNotification({
        title: config.title,
        body: config.body(orderToken),
        icon: config.icon,
        tag: `order-${orderToken || 'unknown'}-${status}`,
        onClick: () => {
            window.location.href = '/my-orders';
        },
    });
};

/** Send a push notification for a new order (admin-facing) */
export const notifyNewOrder = (orderToken?: string): void => {
    const config = ADMIN_STATUS_MESSAGES.new_order;
    sendBrowserNotification({
        title: config.title,
        body: config.body(orderToken),
        icon: '/Printly.png',
        tag: `admin-new-order-${orderToken || Date.now()}`,
        onClick: () => {
            window.location.href = '/admin';
        },
    });
};

/**
 * Play a short notification sound.
 * Uses a base64-encoded beep so we don't need an external file.
 */
export const playNotificationSound = (): void => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        // AudioContext not available — silently ignore
    }
};
