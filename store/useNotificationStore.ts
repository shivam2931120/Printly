import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set, get) => ({
            notifications: [],
            unreadCount: 0,

            addNotification: (notif) => {
                const newNotif: Notification = {
                    ...notif,
                    id: Math.random().toString(36).substr(2, 9),
                    timestamp: new Date().toISOString(),
                    isRead: false,
                };

                set((state) => ({
                    notifications: [newNotif, ...state.notifications],
                    unreadCount: state.unreadCount + 1,
                }));
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
        }),
        {
            name: 'notification-storage',
        }
    )
);
