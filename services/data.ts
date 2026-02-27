import { supabase, supabaseAdmin } from './supabase';
export { supabase };
import { Product, Order, CartItem, OrderStatus, PaymentStatus, PricingConfig, DEFAULT_PRICING, ShopConfig, DEFAULT_SHOP_CONFIG, Service, DEFAULT_SERVICES } from '../types';

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

    // 2. Resolve User ID — ensure user record exists in DB before FK insert
    let finalUserId = order.userId;
    const resolvedEmail = order.userEmail || 'guest@example.com';
    const resolvedName = order.userName || resolvedEmail.split('@')[0] || 'Guest';

    // Strip temp_ prefix (fallback users from AuthContext)
    if (finalUserId?.startsWith('temp_')) finalUserId = undefined;

    // If we have a userId, verify it exists in the User table (prevent FK violation)
    if (finalUserId) {
        const { data: existingUser } = await supabase
            .from('User')
            .select('id')
            .eq('id', finalUserId)
            .maybeSingle();

        if (!existingUser) {
            // userId from app state doesn't exist in DB — look up by email instead
            finalUserId = undefined;
        }
    }

    // Fallback: look up user by email if no valid userId
    if (!finalUserId && resolvedEmail !== 'guest@example.com') {
        const { data: emailUser } = await supabase
            .from('User')
            .select('id')
            .eq('email', resolvedEmail.trim().toLowerCase())
            .maybeSingle();

        if (emailUser?.id) {
            finalUserId = emailUser.id;
        } else {
            // Auto-create user record so the order is properly linked
            const newUserId = crypto.randomUUID();
            const now = new Date().toISOString();
            const { data: created } = await supabase
                .from('User')
                .insert({
                    id: newUserId,
                    email: resolvedEmail.trim().toLowerCase(),
                    name: resolvedName,
                    role: 'USER',
                    createdAt: now,
                    updatedAt: now,
                })
                .select('id')
                .maybeSingle();

            if (created?.id) {
                finalUserId = created.id;
            }
            // If insert fails (e.g. email conflict), finalUserId stays undefined → order is still created with null userId
        }
    }

    // Backfill authId (Clerk ID) on existing user record if not yet set
    const clerkId = (order as any).clerkId as string | undefined;
    if (clerkId && finalUserId) {
        supabase
            .from('User')
            .update({ authId: clerkId, updatedAt: new Date().toISOString() })
            .eq('id', finalUserId)
            .is('authId', null)
            .then(() => { }); // fire-and-forget
    }

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
            orderToken: order.orderToken || Math.floor(1000 + Math.random() * 9000).toString(),
            userId: finalUserId || null,
            clerkId: (order as any).clerkId || null,   // Clerk user ID for cross-referencing
            userEmail: resolvedEmail,
            userName: resolvedName,
            totalAmount: order.totalAmount,
            status: (['PENDING', 'PRINTING', 'READY', 'COMPLETED'].includes(order.status.toUpperCase()) ? order.status.toUpperCase() : 'PENDING'),
            paymentStatus: (['PAID', 'UNPAID'].includes(order.paymentStatus.toUpperCase()) ? order.paymentStatus.toUpperCase() : 'UNPAID'),
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

// cancelOrder has been removed — orders cannot be cancelled after placement.

export const markOrderCollected = async (orderId: string): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase.rpc('mark_order_collected', { order_id: orderId });
    if (error) {
        console.error('Error marking order collected:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const fetchOrders = async (userId?: string, userEmail?: string): Promise<Order[]> => {
    if (!userId && !userEmail) return [];

    let query = supabase
        .from('Order')
        .select('*, user:User(name, email, avatar)')
        .eq('isDeleted', false)
        .order('createdAt', { ascending: false });

    if (userId && userEmail) {
        // Match by userId OR userEmail so orders are never lost
        query = query.or(`userId.eq.${userId},userEmail.eq.${userEmail}`);
    } else if (userId) {
        query = query.eq('userId', userId);
    } else {
        query = query.eq('userEmail', userEmail!);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    return mapOrderData(data);
};

export const fetchAdminOrders = async (_adminId?: string): Promise<Order[]> => {
    const { data, error } = await supabaseAdmin
        .from('Order')
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
    const { data, error } = await supabaseAdmin
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

/** Silently ignore errors when table/RLS is missing (migration not yet run) */
const isTableAccessError = (err: { code?: string; message?: string; status?: number } | null) =>
    !err ? false :
        ['PGRST205', '42P01', '42501'].includes(err.code || '') ||
        (err as any).status === 403 ||
        err.message?.includes('schema cache') ||
        err.message?.includes('permission denied') ||
        err.message?.includes('does not exist');

export const fetchInventory = async (): Promise<InventoryRow[]> => {
    const { data, error } = await supabase
        .from('Inventory')
        .select('*')
        .order('name');

    if (error) {
        if (isTableAccessError(error)) return [];
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
        if (!isTableAccessError(error)) console.error('Error adding inventory item:', error);
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
        if (!isTableAccessError(updateErr)) console.error('Error updating inventory stock:', updateErr);
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
        if (!isTableAccessError(logErr)) console.error('Error logging stock change:', logErr);
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
        if (!isTableAccessError(error)) console.error('Error deleting inventory item:', error);
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
        if (!isTableAccessError(error)) console.error('Error fetching stock history:', error);
        return [];
    }
    return data as StockLogRow[];
};



// ===== PRICING (persisted in Shop.pricingConfig) =====

/** Load pricing from the active Shop row, fall back to localStorage then DEFAULT_PRICING */
export const fetchPricing = async (): Promise<PricingConfig> => {
    try {
        // Use admin client to bypass RLS on Shop table
        const { data, error } = await supabaseAdmin
            .from('Shop')
            .select('pricingConfig')
            .eq('isActive', true)
            .limit(1)
            .maybeSingle();

        if (!error && data?.pricingConfig) {
            return data.pricingConfig as PricingConfig;
        }
    } catch { /* ignore */ }

    // fallback: localStorage cache (same device)
    try {
        const cached = localStorage.getItem('printwise_pricing');
        if (cached) return { ...DEFAULT_PRICING, ...JSON.parse(cached) };
    } catch { /* ignore */ }

    return DEFAULT_PRICING;
};

/** Persist pricing to the active Shop row and also cache in localStorage */
export const savePricing = async (pricing: PricingConfig): Promise<{ success: boolean; error?: any }> => {
    // Always cache locally so same-device is instant
    localStorage.setItem('printwise_pricing', JSON.stringify(pricing));

    // Persist to Supabase so all users see the change
    const { error } = await supabaseAdmin
        .from('Shop')
        .update({ pricingConfig: pricing, updatedAt: new Date().toISOString() })
        .eq('isActive', true);

    if (error) {
        console.error('Failed to save pricing to Supabase:', error);
        return { success: false, error };
    }
    return { success: true };
};

// ===== SHOP CONFIG (persisted in Shop.shopConfig) =====

/** Load shop config from the active Shop row, fall back to localStorage then DEFAULT_SHOP_CONFIG */
export const fetchShopConfig = async (): Promise<ShopConfig> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('Shop')
            .select('shopConfig')
            .eq('isActive', true)
            .limit(1)
            .maybeSingle();

        if (!error && data?.shopConfig) {
            return { ...DEFAULT_SHOP_CONFIG, ...(data.shopConfig as ShopConfig) };
        }
    } catch { /* ignore */ }

    // fallback: localStorage cache
    try {
        const cached = localStorage.getItem('printwise_shop_config');
        if (cached) return { ...DEFAULT_SHOP_CONFIG, ...JSON.parse(cached) };
    } catch { /* ignore */ }

    return DEFAULT_SHOP_CONFIG;
};

/** Persist shop config to the active Shop row and also cache in localStorage */
export const saveShopConfig = async (config: ShopConfig): Promise<{ success: boolean; error?: any }> => {
    localStorage.setItem('printwise_shop_config', JSON.stringify(config));

    const { error } = await supabaseAdmin
        .from('Shop')
        .update({ shopConfig: config, updatedAt: new Date().toISOString() })
        .eq('isActive', true);

    if (error) {
        console.error('Failed to save shop config to Supabase:', error);
        return { success: false, error };
    }
    return { success: true };
};

// ===== CUSTOMERS (aggregated from orders) =====

export interface CustomerSummary {
    email: string;
    name: string;
    avatar?: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderAt: string;
}

/** Aggregate all non-deleted orders by customer email */
export const fetchCustomers = async (): Promise<CustomerSummary[]> => {
    const { data, error } = await supabaseAdmin
        .from('Order')
        .select('userEmail, userName, totalAmount, createdAt, user:User(name, email, avatar)')
        .eq('isDeleted', false)
        .order('createdAt', { ascending: false });

    if (error || !data) {
        console.error('Error fetching customers:', error);
        return [];
    }

    const map = new Map<string, CustomerSummary>();
    for (const row of data) {
        const email: string = (row.user as any)?.email || row.userEmail || 'unknown';
        const name: string = (row.user as any)?.name || row.userName || 'Unknown';
        const avatar: string | undefined = (row.user as any)?.avatar;
        if (map.has(email)) {
            const c = map.get(email)!;
            c.totalOrders += 1;
            c.totalSpent += Number(row.totalAmount) || 0;
        } else {
            map.set(email, { email, name, avatar, totalOrders: 1, totalSpent: Number(row.totalAmount) || 0, lastOrderAt: row.createdAt });
        }
    }
    return Array.from(map.values());
};

// ===== SERVICES (persisted in Shop.servicesConfig) =====

/** Load services from the active Shop row, fall back to localStorage then DEFAULT_SERVICES */
export const fetchServices = async (): Promise<Service[]> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('Shop')
            .select('servicesConfig')
            .eq('isActive', true)
            .limit(1)
            .maybeSingle();

        if (!error && data?.servicesConfig) {
            return data.servicesConfig as Service[];
        }
    } catch { /* ignore */ }

    try {
        const cached = localStorage.getItem('printwise_services');
        if (cached) return JSON.parse(cached) as Service[];
    } catch { /* ignore */ }

    return DEFAULT_SERVICES;
};

/** Persist services to the active Shop row and cache in localStorage */
export const saveServices = async (services: Service[]): Promise<{ success: boolean; error?: any }> => {
    localStorage.setItem('printwise_services', JSON.stringify(services));

    const { error } = await supabaseAdmin
        .from('Shop')
        .update({ servicesConfig: services, updatedAt: new Date().toISOString() })
        .eq('isActive', true);

    if (error) {
        console.error('Failed to save services to Supabase:', error);
        return { success: false, error };
    }
    return { success: true };
};

// ===== DB USAGE & AUTO-CLEANUP =====

export interface DbUsage {
    used_mb: number;
    limit_mb: number;
    percent_used: number;
}

export const getDbUsage = async (): Promise<DbUsage | null> => {
    try {
        const { data, error } = await supabase.rpc('get_db_usage');
        if (error) {
            if (isTableAccessError(error) || error.code === '42883') return null;
            console.error('Error checking DB usage:', error);
            return null;
        }
        return data as DbUsage;
    } catch {
        return null;
    }
};



// ===== STORAGE =====

/** Allowed MIME types for print uploads */
const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword', // DOC
];
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validate a file before upload:
 *  1. Extension + MIME type allowlist
 *  2. Size limit (50 MB)
 *  3. Magic bytes check (PDF, JPEG, PNG, GIF, BMP, TIFF, WEBP, DOCX)
 */
async function validateFile(file: File): Promise<{ valid: boolean; reason?: string }> {
    // 1. Type check
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, reason: `File type "${file.type}" not allowed. Accepted: PDF, JPEG, PNG, GIF, BMP, TIFF, WEBP, DOCX, DOC.` };
    }

    // 2. Size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return { valid: false, reason: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max allowed: ${MAX_FILE_SIZE_MB} MB.` };
    }

    // 3. Magic bytes — read first 12 bytes (WEBP needs 12 bytes)
    try {
        const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

        // Check magic bytes for each format
        const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46; // %PDF
        const isJpeg = header[0] === 0xFF && header[1] === 0xD8;
        const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
        const isGif = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38; // GIF8
        const isBmp = header[0] === 0x42 && header[1] === 0x4D; // BM
        const isTiffLE = header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2A && header[3] === 0x00; // Little-endian TIFF
        const isTiffBE = header[0] === 0x4D && header[1] === 0x4D && header[2] === 0x00 && header[3] === 0x2A; // Big-endian TIFF
        const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 && // RIFF
            header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50; // WEBP
        const isZip = header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04; // ZIP (DOCX)

        if (file.type === 'application/pdf' && !isPdf) {
            return { valid: false, reason: 'File does not appear to be a valid PDF.' };
        }
        if ((file.type === 'image/jpeg' || file.type === 'image/jpg') && !isJpeg) {
            return { valid: false, reason: 'File does not appear to be a valid JPEG.' };
        }
        if (file.type === 'image/png' && !isPng) {
            return { valid: false, reason: 'File does not appear to be a valid PNG.' };
        }
        if (file.type === 'image/gif' && !isGif) {
            return { valid: false, reason: 'File does not appear to be a valid GIF.' };
        }
        if (file.type === 'image/bmp' && !isBmp) {
            return { valid: false, reason: 'File does not appear to be a valid BMP.' };
        }
        if (file.type === 'image/tiff' && !(isTiffLE || isTiffBE)) {
            return { valid: false, reason: 'File does not appear to be a valid TIFF.' };
        }
        if (file.type === 'image/webp' && !isWebp) {
            return { valid: false, reason: 'File does not appear to be a valid WEBP.' };
        }
        if ((file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.type === 'application/msword') && !isZip) {
            return { valid: false, reason: 'File does not appear to be a valid Word document.' };
        }
    } catch {
        // Ignore — magic byte check is best-effort
    }

    return { valid: true };
}

export const uploadFile = async (file: File): Promise<string | null> => {
    // Validate before uploading
    const validation = await validateFile(file);
    if (!validation.valid) {
        toast.error(validation.reason || 'Invalid file.');
        return null;
    }

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

// ===== AUDIT LOG =====
export interface AuditLogEntry {
    id: string;
    tableName: string;
    recordId: string;
    action: string;
    oldData: Record<string, any> | null;
    newData: Record<string, any> | null;
    changedBy: string | null;
    createdAt: string;
}

export const fetchAuditLog = async (limit = 100): Promise<AuditLogEntry[]> => {
    const { data, error } = await supabase
        .from('AuditLog')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching audit log:', error);
        return [];
    }
    return (data || []) as AuditLogEntry[];
};

// ===== EXPORT HELPERS =====
export const exportToCSV = (rows: Record<string, any>[], filename: string) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Escape CSV values containing commas, quotes, or newlines
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ===== BULK ORDER OPERATIONS =====
export const bulkUpdateOrderStatus = async (
    orderIds: string[],
    newStatus: OrderStatus
): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase
        .from('Order')
        .update({ status: newStatus.toUpperCase(), updatedAt: new Date().toISOString() })
        .in('id', orderIds);

    if (error) {
        console.error('Bulk status update failed:', error);
        return { success: false, error };
    }
    return { success: true };
};

export const bulkDeleteOrders = async (
    orderIds: string[]
): Promise<{ success: boolean; error?: any }> => {
    const { error } = await supabase
        .from('Order')
        .update({ isDeleted: true, deletedAt: new Date().toISOString() })
        .in('id', orderIds);

    if (error) {
        console.error('Bulk delete failed:', error);
        return { success: false, error };
    }
    return { success: true };
};

