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

export const createProduct = async (product: Product): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase
        .from('Product')
        .insert({
            id: product.id,
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            stock: product.stock,
            image: product.image,
            isActive: product.isActive
        });

    if (error) {
        console.error('Error creating product:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const updateProduct = async (product: Product): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase
        .from('Product')
        .update({
            name: product.name,
            description: product.description,
            category: product.category,
            price: product.price,
            stock: product.stock,
            image: product.image,
            isActive: product.isActive
        })
        .eq('id', product.id);

    if (error) {
        console.error('Error updating product:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const deleteProduct = async (productId: string): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase
        .from('Product')
        .delete()
        .eq('id', productId);

    if (error) {
        console.error('Error deleting product:', error);
        return { success: false, error };
    }
    return { success: true };
};

// ===== ORDERS =====
export const createOrder = async (order: Order, userRole?: string): Promise<{ success: boolean; error?: any }> => {
    // 1. Get Default Shop ID - Fix for "Key not present in table Shop"
    let shopId = order.shopId;

    // Attempt to fetch existing shop (limit 1)
    if (!shopId || shopId === 'default') {
        const { data: shop } = await supabase.from('Shop').select('id').limit(1).single();
        if (shop) {
            shopId = shop.id;
        } else {
            // CRITICAL: If no shop exists at all, CREATE one to unblock orders
            const { data: newShop, error: createError } = await supabase.from('Shop').insert({
                shopName: 'Default Shop',
                tagline: 'Auto-created Shop',
            }).select().single();

            if (newShop) {
                shopId = newShop.id;
            } else {
                console.error('Failed to auto-create shop:', createError);
                return { success: false, error: 'Internal Error: Could not initialize shop.' };
            }
        }
    }

    // 2. Resolve User ID
    // OLD LOGIC: Client generated temp IDs like "user_174..." were treated as guest.
    // NEW LOGIC: Clerk IDs also start with "user_", so we MUST preserve them.
    // We assume the frontend passes a valid ID if the user is logged in.
    let finalUserId = order.userId;
    // (Optional) We could add a check here if we wanted to support 'guest' vs 'clerk' specifically,
    // but relying on StudentPortal to pass the correct ID is better.

    // 3. Sync User to Supabase (Critical for FK constraints)
    // Clerk IDs don't exist in our 'User' table by default, causing FK errors.
    // We must upsert the user record to ensure it exists.
    if (finalUserId && order.userEmail) {
        const { error: userError } = await supabase
            .from('User')
            .upsert({
                id: finalUserId,
                email: order.userEmail,
                name: order.userName || order.userEmail.split('@')[0],
                // Sync User Role from Clerk
                role: (userRole === 'ADMIN' || userRole === 'DEVELOPER') ? userRole : 'USER',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { onConflict: 'id' });

        // 3. Create Sync User in Supabase (if needed) - Already done by trigger usually, but ensures role
        // ... (existing logic)


        if (userError) {
            console.error('Error syncing user to Supabase:', userError);
            // We continue, hoping it might just be a permissions issue or existing user, 
            // but if it fails completely, the order insert will likely fail too.
        }
    }

    // 4. Create Order
    const { data: orderData, error: orderError } = await supabase
        .from('Order')
        .insert({
            id: order.id,
            orderToken: order.orderToken || order.id.split('-')[1], // Use passed token or fallback
            userId: finalUserId, // Use sanitized User ID
            totalAmount: order.totalAmount,
            status: (['PENDING', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'].includes(order.status.toUpperCase()) ? order.status.toUpperCase() : 'PENDING'),
            paymentStatus: (['PAID', 'UNPAID', 'REFUNDED'].includes(order.paymentStatus.toUpperCase()) ? order.paymentStatus.toUpperCase() : 'UNPAID'),
            // Legacy fields
            fileName: order.items.find(i => i.type === 'print')?.fileName || order.fileName,
            pageCount: order.items.find(i => i.type === 'print')?.pageCount || order.pageCount,
            copies: order.items.find(i => i.type === 'print')?.options?.copies,
            paperSize: order.items.find(i => i.type === 'print')?.options?.paperSize,
            colorMode: order.items.find(i => i.type === 'print')?.options?.colorMode,
            sides: order.items.find(i => i.type === 'print')?.options?.sides,
            binding: order.items.find(i => i.type === 'print')?.options?.binding,
            shopId: shopId,
            updatedAt: new Date().toISOString()
        })
        .select()
        .single();

    if (orderError) {
        console.error('Error creating order:', orderError);
        return { success: false, error: orderError };
    }

    // 4. Create Order Items
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
        printConfig: item.type === 'print' ? item.options : null, // Storing options JSON (includes paperType, pageRange)
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

export const cancelOrder = async (orderId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Fetch Order to verify ownership and status
    const { data: order, error: fetchError } = await supabase
        .from('Order')
        .select('userId, status')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) {
        return { success: false, error: 'Order not found.' };
    }

    // 2. Verify Ownership
    if (order.userId !== userId) {
        return { success: false, error: 'Unauthorized.' };
    }

    // 3. Verify Status
    if (order.status.toUpperCase() !== 'PENDING') {
        return { success: false, error: 'Cannot cancel order. It may have already been processed.' };
    }

    // 4. Update Status
    const { error: updateError } = await supabase
        .from('Order')
        .update({ status: 'CANCELLED' })
        .eq('id', orderId);

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    return { success: true };
};



export const markOrderCollected = async (orderId: string): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase.rpc('mark_order_collected', { order_id: orderId });
    if (error) {
        console.error('Error marking order collected:', error);
        return { success: false, error };
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

    return mapOrderData(data);
};

export const fetchAdminOrders = async (adminId: string): Promise<Order[]> => {
    const { data, error } = await supabase
        .rpc('get_admin_orders', { requesting_user_id: adminId })
        .select(`
            *,
            user:User(name, email, avatar),
            items:OrderItem(
                *,
                product:Product(name, image)
            )
        `)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching admin orders:', error);
        return [];
    }

    return mapOrderData(data);
};

const mapOrderData = (data: any[]): Order[] => {
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
        // Legacy/Top-level fields for display
        fileName: dbOrder.fileName,
        pageCount: dbOrder.pageCount,
        options: dbOrder.printConfig || dbOrder.options, // Handle different naming if consistent
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
// ===== STORAGE =====
export const uploadFile = async (file: File): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('prints')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading file:', uploadError.message, uploadError);
            alert(`Upload failed: ${uploadError.message}`);
            return null;
        }

        const { data } = supabase.storage
            .from('prints')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error: any) {
        console.error('Unexpected error during file upload:', error);
        alert(`Unexpected upload error: ${error.message || error}`);
        return null;
    }
};
