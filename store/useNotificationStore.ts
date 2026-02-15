import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    type PermissionState,
    getPermission,
    requestPermission as requestBrowserPermission,
    sendBrowserNotification,
    playNotificationSound,
} from '../services/pushNotifications';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    timestamp: string;
    isRead: boolean;
    link?: string;
}

interface NotificationStore {
    notifications: Notification[];
    unreadCount: number;
    pushPermission: PermissionState;
    soundEnabled: boolean;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'> & { silent?: boolean }) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    requestPushPermission: () => Promise<PermissionState>;
    refreshPermission: () => void;
    toggleSound: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,
            pushPermission: getPermission(),
            soundEnabled: true,

            addNotification: (notif) => {
                const { silent, ...rest } = notif;
                const newNotif: Notification = {
                    ...rest,
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    isRead: false,
                };

                set((state) => ({
                    notifications: [newNotif, ...state.notifications].slice(0, 50), // cap at 50
                    unreadCount: state.unreadCount + 1,
                }));

                // Browser push notification (only when tab not focused)
                if (!silent) {
                    sendBrowserNotification({
                        title: newNotif.title,
                        body: newNotif.message,
                        tag: `printly-${newNotif.id}`,
                        onClick: newNotif.link ? () => { window.location.href = newNotif.link!; } : undefined,
                    });
                }

                // Sound
                if (!silent && get().soundEnabled) {
                    playNotificationSound();
                }
            },

            markAsRead: (id) => {
                set((state) => {
                    const newNotifications = state.notifications.map((n) =>
                        n.id === id ? { ...n, isRead: true } : n
                    );
                    return {
                        notifications: newNotifications,
                        unreadCount: newNotifications.filter((n) => !n.isRead).length,
                    };
                });
            },

            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                    unreadCount: 0,
                }));
            },

            removeNotification: (id) => {
                set((state) => {
                    const newNotifications = state.notifications.filter((n) => n.id !== id);
                    return {
                        notifications: newNotifications,
                        unreadCount: newNotifications.filter((n) => !n.isRead).length,
                    };
                });
            },

            clearAll: () => {
                set({ notifications: [], unreadCount: 0 });
            },

            requestPushPermission: async () => {
                const result = await requestBrowserPermission();
                set({ pushPermission: result });
                return result;
            },

            refreshPermission: () => {
                set({ pushPermission: getPermission() });
            },

            toggleSound: () => {
                set((state) => ({ soundEnabled: !state.soundEnabled }));
            },
        }),
        {
            name: 'notification-storage',
            partialize: (state) => ({
                notifications: state.notifications,
                unreadCount: state.unreadCount,
                soundEnabled: state.soundEnabled,
            }),
        }
    )
);
