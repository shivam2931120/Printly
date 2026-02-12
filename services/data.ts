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
export const createOrder = async (order: Order, _userRole?: string): Promise<{ success: boolean; error?: any }> => {
    // 1. Resolve Shop ID (read-only lookup)
    let shopId = order.shopId;
    if (!shopId || shopId === 'default') {
        const { data: shop } = await supabase
            .from('Shop')
            .select('id')
            .eq('isActive', true)
            .limit(1)
            .maybeSingle();
        shopId = shop?.id || undefined;
    }

    // 2. Resolve User ID via active auth session
    let finalUserId = order.userId;
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;

    if (!finalUserId || finalUserId.startsWith('temp_')) {
        if (authUser?.id) {
            const { data: dbUser } = await supabase
                .from('User')
                .select('id')
                .eq('authId', authUser.id)
                .maybeSingle();
            if (dbUser?.id) finalUserId = dbUser.id;
        }
    }

    // Fallback: find by email and backfill authId
    if ((!finalUserId || finalUserId.startsWith('temp_')) && authUser?.email) {
        const { data: dbUser } = await supabase
            .from('User')
            .select('id, authId')
            .eq('email', authUser.email.trim().toLowerCase())
            .maybeSingle();
        if (dbUser?.id) {
            finalUserId = dbUser.id;
            if (!dbUser.authId) {
                await supabase.from('User').update({ authId: authUser.id }).eq('id', dbUser.id);
            }
        }
    }

    if (finalUserId?.startsWith('temp_')) finalUserId = undefined;

    const resolvedEmail = authUser?.email || order.userEmail || 'guest@example.com';
    const resolvedName = order.userName || authUser?.user_metadata?.name || resolvedEmail.split('@')[0] || 'Guest';

    // 3. Serialize cart items to JSONB (inline in Order — no separate table)
    const itemsJson = order.items.map(item => {
        if (item.type === 'product') {
            return {
                id: crypto.randomUUID(),
                type: 'product',
                productId: (item as any).productId,
                name: item.name,
                image: (item as any).image || '',
                quantity: item.quantity,
                price: item.price,
            };
        } else {
            return {
                id: crypto.randomUUID(),
                type: 'print',
                name: item.name,
                fileUrl: (item as any).fileUrl || '',
                fileName: (item as any).fileName || '',
                printConfig: (item as any).options || null,
                pageCount: (item as any).pageCount || 0,
                quantity: item.quantity,
                price: item.price,
            };
        }
    });

    // 4. Single INSERT into Order (items embedded as JSONB)
    const { error: orderError } = await supabase
        .from('Order')
        .insert({
            id: order.id,
            orderToken: order.orderToken || order.id.split('-')[1],
            userId: finalUserId || null,
            userEmail: resolvedEmail,
            userName: resolvedName,
            totalAmount: order.totalAmount,
            status: (['PENDING', 'PRINTING', 'READY', 'COMPLETED', 'CANCELLED'].includes(order.status.toUpperCase()) ? order.status.toUpperCase() : 'PENDING'),
            paymentStatus: (['PAID', 'UNPAID', 'REFUNDED'].includes(order.paymentStatus.toUpperCase()) ? order.paymentStatus.toUpperCase() : 'UNPAID'),
            shopId: shopId || null,
            items: itemsJson,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

    if (orderError) {
        console.error('Error creating order:', orderError);
        return { success: false, error: orderError };
    }

    return { success: true };
};

export const cancelOrder = async (orderId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    const { data: order, error: fetchError } = await supabase
        .from('Order')
        .select('userId, status')
        .eq('id', orderId)
        .single();

    if (fetchError || !order) return { success: false, error: 'Order not found.' };
    if (order.userId !== userId) return { success: false, error: 'Unauthorized.' };
    if (order.status.toUpperCase() !== 'PENDING') return { success: false, error: 'Cannot cancel order. It may have already been processed.' };

    const { error: updateError } = await supabase
        .from('Order')
        .update({ status: 'CANCELLED', updatedAt: new Date().toISOString() })
        .eq('id', orderId);

    if (updateError) return { success: false, error: updateError.message };
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
        .select('*, user:User(name, email, avatar)')
        .eq('isDeleted', false)
        .order('createdAt', { ascending: false });

    if (userId) query = query.eq('userId', userId);

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
        .select('*, user:User(name, email, avatar)')
        .eq('isDeleted', false)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching admin orders:', error);
        return [];
    }

    return mapOrderData(data);
};

export const fetchAllOrdersForAnalytics = async (): Promise<Order[]> => {
    const { data, error } = await supabase
        .from('Order')
        .select('*, user:User(name, email, avatar)')
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('Error fetching analytics orders:', error);
        return [];
    }

    return mapOrderData(data);
};

// Map DB rows to frontend Order type — items come from JSONB column now
const mapOrderData = (data: any[]): Order[] => {
    return (data || []).map((row) => {
        // Parse items from JSONB
        const rawItems: any[] = Array.isArray(row.items) ? row.items : [];

        const items: CartItem[] = rawItems.map((item: any) => {
            if (item.type === 'product') {
                return {
                    id: item.id,
                    type: 'product' as const,
                    productId: item.productId || '',
                    name: item.name || item.productName || 'Unknown Product',
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image || item.productImage || '',
                };
            } else {
                return {
                    id: item.id,
                    type: 'print' as const,
                    name: item.fileName || item.name || 'Print Job',
                    price: item.price,
                    quantity: item.quantity,
                    fileUrl: item.fileUrl || '',
                    fileName: item.fileName || item.name || '',
                    options: item.printConfig || {},
                    pageCount: item.pageCount || item.details?.pageCount || 0,
                };
            }
        });

        return {
            id: row.id,
            userId: row.userId || '',
            userEmail: row.user?.email || row.userEmail || '',
            userName: row.user?.name || row.userName || 'Unknown',
            type: 'mixed',
            totalAmount: row.totalAmount,
            orderToken: row.orderToken,
            status: (row.status || 'pending').toLowerCase() as OrderStatus,
            paymentStatus: (row.paymentStatus || 'unpaid').toLowerCase() as PaymentStatus,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            items,
        };
    });
};
import { toast } from 'sonner';

// ===== INVENTORY =====

export interface InventoryRow {
    id: string;
    name: string;
    stock: number;
    unit: string;
    threshold: number;
    shopId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StockLogRow {
    id: string;
    inventoryId: string;
    amount: number;
    note: string;
    createdBy: string;
    createdAt: string;
}

export const fetchInventory = async (): Promise<InventoryRow[]> => {
    const { data, error } = await supabase
        .from('Inventory')
        .select('*')
        .order('name');

    if (error) {
        // Silently return empty if table doesn't exist yet (migration not run)
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) return [];
        console.error('Error fetching inventory:', error);
        return [];
    }
    return data as InventoryRow[];
};

export const addInventoryItem = async (item: {
    name: string;
    stock: number;
    unit: string;
    threshold: number;
}): Promise<{ success: boolean; data?: InventoryRow; error?: any }> => {
    const { data, error } = await supabase
        .from('Inventory')
        .insert({
            name: item.name,
            stock: item.stock,
            unit: item.unit,
            threshold: item.threshold,
            updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        if (error.code !== 'PGRST205') console.error('Error adding inventory item:', error);
        return { success: false, error };
    }
    return { success: true, data: data as InventoryRow };
};

export const updateInventoryStock = async (
    inventoryId: string,
    amount: number,
    note: string = '',
    createdBy: string = ''
): Promise<{ success: boolean; error?: any }> => {
    // 1. Get current stock
    const { data: item, error: fetchErr } = await supabase
        .from('Inventory')
        .select('stock')
        .eq('id', inventoryId)
        .single();

    if (fetchErr || !item) {
        return { success: false, error: fetchErr || 'Item not found' };
    }

    const newStock = Math.max(0, item.stock + amount);

    // 2. Update stock
    const { error: updateErr } = await supabase
        .from('Inventory')
        .update({ stock: newStock, updatedAt: new Date().toISOString() })
        .eq('id', inventoryId);

    if (updateErr) {
        if (updateErr.code !== 'PGRST205') console.error('Error updating inventory stock:', updateErr);
        return { success: false, error: updateErr };
    }

    // 3. Log the change
    const { error: logErr } = await supabase
        .from('StockLog')
        .insert({
            inventoryId,
            amount,
            note: note || (amount > 0 ? 'Stock added' : 'Stock removed'),
            createdBy,
        });

    if (logErr) {
        if (logErr.code !== 'PGRST205') console.error('Error logging stock change:', logErr);
        // Don't fail — stock was updated, just log failed
    }

    return { success: true };
};

export const deleteInventoryItem = async (inventoryId: string): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase
        .from('Inventory')
        .delete()
        .eq('id', inventoryId);

    if (error) {
        if (error.code !== 'PGRST205') console.error('Error deleting inventory item:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const fetchStockHistory = async (inventoryId: string): Promise<StockLogRow[]> => {
    const { data, error } = await supabase
        .from('StockLog')
        .select('*')
        .eq('inventoryId', inventoryId)
        .order('createdAt', { ascending: false })
        .limit(50);

    if (error) {
        if (error.code !== 'PGRST205') console.error('Error fetching stock history:', error);
        return [];
    }
    return data as StockLogRow[];
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
            toast.error(`Upload failed: ${uploadError.message}`);
            return null;
        }

        const { data } = supabase.storage
            .from('prints')
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error: any) {
        console.error('Unexpected error during file upload:', error);
        toast.error(`Unexpected upload error: ${error.message || error}`);
        return null;
    }
};
