import { supabase } from './supabase';
export { supabase };
import { Product, Order, CartItem, OrderStatus, PaymentStatus } from '../types';

// ===== PRODUCTS =====
export const fetchProducts = async (): Promise<Product[]> => {
    const { data, error } = await supabase
        .from('Product')
        .select('*')
        .eq('isActive', true)
        .order('name');

    if (error) {
        console.error('Error fetching products:', error);
        return [];
    }
    return data as Product[];
};

// ===== ORDERS =====
export const createOrder = async (order: Order): Promise<{ success: boolean; error?: any }> => {
    // 1. Create Order
    const { data: orderData, error: orderError } = await supabase
        .from('Order')
        .insert({
            id: order.id,
            orderToken: order.id.split('-')[1] || order.id, // simplified token logic
            userId: order.userId,
            totalAmount: order.totalAmount,
            status: (['PENDING', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'].includes(order.status.toUpperCase()) ? order.status.toUpperCase() : 'PENDING'),
            paymentStatus: (['PAID', 'UNPAID', 'REFUNDED'].includes(order.paymentStatus.toUpperCase()) ? order.paymentStatus.toUpperCase() : 'UNPAID'),
            // Legacy fields for backward compatibility if needed, but primarily relying on Items now
            fileName: order.fileName,
            pageCount: order.pageCount,
            copies: order.options?.copies,
            paperSize: order.options?.paperSize,
            colorMode: order.options?.colorMode,
            sides: order.options?.sides,
            binding: order.options?.binding,
            shopId: 'default', // Single shop for now
            updatedAt: new Date().toISOString()
        })
        .select()
        .single();

    if (orderError) {
        console.error('Error creating order:', orderError);
        return { success: false, error: orderError };
    }

    // 2. Create Order Items
    const itemsToInsert = order.items.map(item => ({
        id: crypto.randomUUID(),
        orderId: order.id,
        type: item.type,
        productId: item.type === 'product' ? item.productId : null,
        quantity: item.quantity,
        price: item.price,
        // Print Details
        fileUrl: item.type === 'print' ? item.fileUrl : null,
        fileName: item.type === 'print' ? item.fileName : null,
        printConfig: item.type === 'print' ? item.options : null, // Storing options JSON
        details: item.type === 'print' ? { pageCount: item.pageCount } : null
    }));

    const { error: itemsError } = await supabase
        .from('OrderItem')
        .insert(itemsToInsert);

    if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Ideally rollback order here, but for now just report error
        return { success: false, error: itemsError };
    }

    return { success: true };
};

export const fetchOrders = async (userId?: string): Promise<Order[]> => {
    let query = supabase
        .from('Order')
        .select(`
            *,
            user:User(name, email, avatar),
            items:OrderItem(
                *,
                product:Product(name, image)
            )
        `)
        .order('createdAt', { ascending: false });

    if (userId) {
        query = query.eq('userId', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    // Map DB result to Client Order type
    return data.map((dbOrder: any) => ({
        id: dbOrder.id,
        userId: dbOrder.userId || '',
        userEmail: dbOrder.user?.email || '',
        userName: dbOrder.user?.name || 'Unknown',
        type: 'mixed', // Defaulting to mixed for unified view
        totalAmount: dbOrder.totalAmount,
        orderToken: dbOrder.orderToken,
        status: dbOrder.status.toLowerCase() as OrderStatus,
        paymentStatus: dbOrder.paymentStatus.toLowerCase() as PaymentStatus,
        createdAt: new Date(dbOrder.createdAt),
        updatedAt: new Date(dbOrder.updatedAt),
        // Map Items
        items: dbOrder.items.map((dbItem: any) => {
            if (dbItem.type === 'product') {
                return {
                    id: dbItem.id,
                    type: 'product',
                    productId: dbItem.productId,
                    name: dbItem.product?.name || 'Unknown Product',
                    price: dbItem.price,
                    quantity: dbItem.quantity,
                    image: dbItem.product?.image
                } as CartItem;
            } else {
                return {
                    id: dbItem.id,
                    type: 'print',
                    name: dbItem.fileName || 'Print Job',
                    price: dbItem.price,
                    quantity: dbItem.quantity,
                    fileUrl: dbItem.fileUrl,
                    fileName: dbItem.fileName,
                    options: dbItem.printConfig,
                    pageCount: dbItem.details?.pageCount || 0
                } as CartItem;
            }
        })
    }));
};
