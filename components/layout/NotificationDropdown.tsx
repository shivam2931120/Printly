import React, { useRef, useState, useEffect } from 'react';
import { Bell, Check, X, Volume2, VolumeX, BellRing } from 'lucide-react';
import { useNotificationStore, Notification } from '../../store/useNotificationStore';
import { cn } from '../../lib/utils';
import { isNotificationSupported } from '../../services/pushNotifications';

export const NotificationDropdown = () => {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        removeNotification,
        pushPermission,
        soundEnabled,
        requestPushPermission,
        refreshPermission,
        toggleSound,
    } = useNotificationStore();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAllRead = () => {
        markAllAsRead();
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-background-card border border-border rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-border bg-background-card/95 backdrop-blur space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {/* Sound toggle */}
                                <button
                                    onClick={toggleSound}
                                    className="p-1 rounded text-text-muted hover:text-white transition-colors"
                                    title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                                >
                                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                </button>

                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-[10px] font-bold text-primary hover:text-primary-hover transition-colors flex items-center gap-1"
                                    >
                                        <Check size={12} />
                                        Mark all read
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors ml-2"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Push permission prompt */}
                        {isNotificationSupported() && pushPermission !== 'granted' && pushPermission !== 'denied' && (
                            <button
                                onClick={requestPushPermission}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary hover:bg-primary/20 transition-colors"
                            >
                                <BellRing size={14} />
                                <span className="font-bold">Enable push notifications</span>
                                <span className="text-text-muted ml-auto">Get alerts even when tab is hidden</span>
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-text-muted flex flex-col items-center">
                                <Bell size={32} className="opacity-20 mb-3" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={cn(
                                            "p-4 hover:bg-white/5 transition-colors relative group",
                                            !notif.isRead ? "bg-primary/5" : ""
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon Indicator */}
                                            <div className={cn(
                                                "size-2 mt-1.5 rounded-full shrink-0",
                                                notif.type === 'info' && "bg-blue-500",
                                                notif.type === 'success' && "bg-green-500",
                                                notif.type === 'warning' && "bg-yellow-500",
                                                notif.type === 'error' && "bg-red-500",
                                            )} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h4 className={cn(
                                                        "text-sm font-bold truncate pr-6",
                                                        !notif.isRead ? "text-white" : "text-text-muted"
                                                    )}>
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-[10px] text-text-muted whitespace-nowrap ml-2">
                                                        {formatTime(notif.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                                                    {notif.message}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                                                    className="p-1 hover:bg-white/10 rounded text-text-muted hover:text-red-500 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        {!notif.isRead && (
                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className="absolute inset-0 z-0 bg-transparent cursor-default"
                                                aria-label="Mark as read"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
