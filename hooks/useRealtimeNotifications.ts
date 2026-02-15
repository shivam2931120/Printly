import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useNotificationStore } from '../store/useNotificationStore';
import { notifyOrderStatusChange, notifyNewOrder } from '../services/pushNotifications';

type Role = 'student' | 'admin' | 'developer';

interface UseRealtimeNotificationsOptions {
    /** User ID for student-scoped subscriptions */
    userId?: string;
    /** Role determines which events to listen for */
    role: Role;
    /** Whether the hook is enabled */
    enabled?: boolean;
}

/**
 * Subscribe to Supabase realtime order changes and fire push + in-app notifications.
 *
 * - **Student**: listens for updates on their own orders (status changes)
 * - **Admin**: listens for new orders + all status changes
 * - **Developer**: listens for new orders across all shops
 */
export function useRealtimeNotifications({
    userId,
    role,
    enabled = true,
}: UseRealtimeNotificationsOptions) {
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const channelName = `notif-${role}-${userId || 'global'}-${Date.now()}`;
        const addNotification = useNotificationStore.getState().addNotification;

        if (role === 'student' && userId) {
            // Student: listen for updates on their own orders
            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'Order',
                        filter: `userId=eq.${userId}`,
                    },
                    (payload) => {
                        const newStatus = (payload.new as any)?.status?.toLowerCase?.() || '';
                        const orderToken = (payload.new as any)?.orderToken || '';

                        if (!newStatus) return;

                        // Map to user-friendly labels
                        const statusLabels: Record<string, string> = {
                            confirmed: 'Confirmed',
                            printing: 'Printing',
                            ready: 'Ready for Pickup',
                            completed: 'Completed',
                        };

                        const label = statusLabels[newStatus];
                        if (!label) return;

                        const typeMap: Record<string, 'info' | 'success' | 'warning'> = {
                            confirmed: 'info',
                            printing: 'info',
                            ready: 'success',
                            completed: 'success',
                        };

                        // In-app notification
                        addNotification({
                            title: `Order ${label}`,
                            message: `Your order${orderToken ? ` #${orderToken}` : ''} is now ${label.toLowerCase()}.`,
                            type: typeMap[newStatus] || 'info',
                            link: '/my-orders',
                        });

                        // Browser push notification
                        notifyOrderStatusChange(newStatus, orderToken);
                    }
                )
                .subscribe();

            channelRef.current = channel;
        } else if (role === 'admin') {
            // Admin: listen for new orders + status updates
            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'Order',
                    },
                    (payload) => {
                        const orderToken = (payload.new as any)?.orderToken || '';

                        addNotification({
                            title: '🔔 New Order Received',
                            message: `Order${orderToken ? ` #${orderToken}` : ''} has been placed.`,
                            type: 'success',
                            link: '/admin',
                        });

                        notifyNewOrder(orderToken);
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'Order',
                    },
                    (payload) => {
                        const newStatus = (payload.new as any)?.status?.toLowerCase?.() || '';
                        const oldStatus = (payload.old as any)?.status?.toLowerCase?.() || '';
                        const orderToken = (payload.new as any)?.orderToken || '';

                        // Only notify on actual status changes
                        if (newStatus === oldStatus || !newStatus) return;

                        addNotification({
                            title: `Order Status → ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
                            message: `Order${orderToken ? ` #${orderToken}` : ''} changed from ${oldStatus} to ${newStatus}.`,
                            type: 'info',
                            link: '/admin',
                            silent: true, // Admin already sees in real-time, don't blast push for own actions
                        });
                    }
                )
                .subscribe();

            channelRef.current = channel;
        } else if (role === 'developer') {
            // Developer: listen for new orders across all shops
            const channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'Order',
                    },
                    (payload) => {
                        const orderToken = (payload.new as any)?.orderToken || '';

                        addNotification({
                            title: '🔔 New Order',
                            message: `New order${orderToken ? ` #${orderToken}` : ''} placed on the platform.`,
                            type: 'info',
                        });

                        notifyNewOrder(orderToken);
                    }
                )
                .subscribe();

            channelRef.current = channel;
        }

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [userId, role, enabled]);
}
