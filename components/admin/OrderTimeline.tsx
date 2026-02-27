import React from 'react';
import { Icon } from '../ui/Icon';
import { Order } from '../../types';

export interface OrderEvent {
 id: string;
 action: string;
 timestamp: string;
 user: string;
 details?: string;
 statusColor?: string;
}

interface OrderTimelineProps {
 events: OrderEvent[];
}

export const generateOrderEvents = (order: Order): OrderEvent[] => {
 const events: OrderEvent[] = [];

 // 1. Creation Event
 events.push({
 id: 'created',
 action: 'Order Placed',
 timestamp: new Date(order.createdAt).toLocaleString(),
 user: order.userName || 'Customer',
 details: `Order #${order.id.slice(-6)} created with ${order.items?.length || 0} items`,
 statusColor: 'text-red-500 bg-[#111] '
 });

 // 2. Payment Event (if paid)
 if (order.paymentStatus === 'paid') {
 events.push({
 id: 'payment',
 action: 'Payment Received',
 timestamp: new Date(order.createdAt).toLocaleString(), // Assumed same time for now as we don't track payment time separately
 user: 'System',
 details: `Amount: ₹${order.totalAmount}`,
 statusColor: 'text-green-500 bg-green-900/20 bg-green-900/20'
 });
 } else if (order.paymentStatus === 'failed') {
 events.push({
 id: 'payment_failed',
 action: 'Payment Failed',
 timestamp: new Date(order.updatedAt).toLocaleString(),
 user: 'System',
 details: 'Transaction failed',
 statusColor: 'text-red-500 bg-red-900/20 '
 });
 }

 // 3. Status Change (Derived from UpdatedAt)
 // We only show this if it differs significantly from creation or is an active state
 if (order.status !== 'pending') {
 let action = '';
 let details = '';
 let color = '';

 switch (order.status) {
 case 'confirmed':
 action = 'Order Confirmed';
 details = 'Order accepted by store';
 color = 'text-red-500 bg-[#111] ';
 break;
 case 'printing':
 action = 'Printing Started';
 details = 'Files sent to printer';
 color = 'text-orange-500 bg-orange-900/20 ';
 break;
 case 'ready':
 action = 'Ready for Pickup';
 details = 'Order is ready for collection';
 color = 'text-purple-500 bg-purple-900/20 bg-purple-900/20';
 break;
 case 'completed':
 action = 'Order Completed';
 details = 'Handed over to customer';
 color = 'text-green-400 bg-green-900/20 ';
 break;
 }

 if (action) {
 events.push({
 id: 'status_update',
 action: action,
 timestamp: new Date(order.updatedAt).toLocaleString(),
 user: 'Admin', // Usually admin actions
 details: details,
 statusColor: color
 });
 }
 }

 // Sort by time descending (newest first)
 return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events }) => {
 return (
 <div className="relative pl-2">
 {events.map((event, index) => (
 <div key={event.id} className="flex gap-4 pb-8 last:pb-0 relative">
 {/* Timeline line */}
 {index < events.length - 1 && (
 <div className="absolute left-[1.2rem] top-8 w-0.5 h-[calc(100%-1rem)] bg-[#111] " />
 )}

 {/* Icon */}
 <div className={`relative z-10 size-10 flex items-center justify-center flex-shrink-0 border-2 border-[#333] shadow-sm ${event.statusColor || 'text-[#666] bg-[#0A0A0A]'}`}>
 <Icon name="history" className="text-lg" />
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0 pt-1">
 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
 <div>
 <p className="font-bold text-white text-sm">{event.action}</p>
 {event.details && (
 <p className="text-xs text-[#666] mt-0.5">{event.details}</p>
 )}
 </div>
 <span className="text-[10px] sm:text-xs text-[#666] font-mono bg-[#0A0A0A] px-2 py-1 w-fit">
 {event.timestamp}
 </span>
 </div>
 <p className="text-[10px] text-[#666] mt-2 flex items-center gap-1">
 <span className="size-1.5 bg-[#333] " />
 by {event.user}
 </p>
 </div>
 </div>
 ))}
 </div>
 );
};
