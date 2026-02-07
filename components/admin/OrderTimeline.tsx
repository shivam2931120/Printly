import React from 'react';
import { Icon } from '../ui/Icon';

interface OrderEvent {
    id: string;
    action: string;
    timestamp: string;
    user: string;
    details?: string;
}

interface OrderTimelineProps {
    events: OrderEvent[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events }) => {
    const getEventIcon = (action: string): string => {
        switch (action.toLowerCase()) {
            case 'created': return 'add_circle';
            case 'payment received': return 'payments';
            case 'printing started': return 'print';
            case 'printing completed': return 'check_circle';
            case 'shipped': return 'local_shipping';
            case 'delivered': return 'inventory';
            case 'on hold': return 'pause_circle';
            case 'cancelled': return 'cancel';
            default: return 'info';
        }
    };

    const getEventColor = (action: string): string => {
        switch (action.toLowerCase()) {
            case 'created': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
            case 'payment received': return 'text-green-500 bg-green-50 dark:bg-green-900/20';
            case 'printing started': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
            case 'printing completed': return 'text-primary bg-primary/10';
            case 'shipped': return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
            case 'delivered': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            case 'on hold': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
            case 'cancelled': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
            default: return 'text-slate-500 bg-slate-50 dark:bg-slate-800';
        }
    };

    return (
        <div className="relative">
            {events.map((event, index) => (
                <div key={event.id} className="flex gap-4 pb-6 last:pb-0">
                    {/* Timeline line */}
                    {index < events.length - 1 && (
                        <div className="absolute left-5 top-10 w-0.5 h-[calc(100%-2.5rem)] bg-slate-200 dark:bg-slate-700" />
                    )}

                    {/* Icon */}
                    <div className={`relative z-10 size-10 rounded-full flex items-center justify-center flex-shrink-0 ${getEventColor(event.action)}`}>
                        <Icon name={getEventIcon(event.action)} className="text-lg" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{event.action}</p>
                                {event.details && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{event.details}</p>
                                )}
                            </div>
                            <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{event.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">by {event.user}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Mock timeline data
export const mockOrderEvents: OrderEvent[] = [
    { id: '1', action: 'Created', timestamp: 'Today, 2:30 PM', user: 'System', details: 'Order submitted by customer' },
    { id: '2', action: 'Payment Received', timestamp: 'Today, 2:31 PM', user: 'Stripe', details: '₹316.00 via UPI' },
    { id: '3', action: 'Printing Started', timestamp: 'Today, 2:45 PM', user: 'Admin', details: 'Assigned to Printer #2' },
    { id: '4', action: 'Printing Completed', timestamp: 'Today, 3:15 PM', user: 'Admin', details: '45 pages printed' },
    { id: '5', action: 'Shipped', timestamp: 'Today, 4:00 PM', user: 'Admin', details: 'Handed to student' },
];
