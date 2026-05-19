/**
 * Vercel Edge Function: /api/razorpay-order
 *
 * Creates a Razorpay Order on the server after validating the saved Printly order
 * amount in Supabase. The returned Razorpay order id must be passed to Checkout.
 */

import { createClient } from '@supabase/supabase-js';

type SavedOrderRow = {
    id: string;
    totalAmount: number;
    paymentStatus: 'PAID' | 'UNPAID';
    orderToken?: string | null;
};

function json(body: Record<string, unknown>, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
        ...init,
        headers: {
            'content-type': 'application/json',
            ...(init?.headers || {}),
        },
    });
}

function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
}

function getRazorpayKeys() {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET env vars');
    }
    return { keyId, keySecret };
}

function cleanReceipt(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    let body: { appOrderId?: string; amountPaise?: number };
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body.appOrderId) {
        return json({ error: 'Missing appOrderId' }, { status: 400 });
    }

    let supabase: ReturnType<typeof getSupabaseAdmin>;
    let keyId: string;
    let keySecret: string;
    try {
        supabase = getSupabaseAdmin();
        ({ keyId, keySecret } = getRazorpayKeys());
    } catch (error: any) {
        console.error('[razorpay-order] Configuration error:', error?.message || error);
        return json({ error: 'Payment service is not configured' }, { status: 500 });
    }

    const { data: savedOrder, error: orderError } = await supabase
        .from('Order')
        .select('id, totalAmount, paymentStatus, orderToken')
        .eq('id', body.appOrderId)
        .eq('isDeleted', false)
        .maybeSingle();

    if (orderError) {
        console.error('[razorpay-order] Failed to load order:', orderError.message);
        return json({ error: 'Failed to load order' }, { status: 500 });
    }

    if (!savedOrder) {
        return json({ error: 'Order not found' }, { status: 404 });
    }

    const order = savedOrder as SavedOrderRow;
    if (order.paymentStatus === 'PAID') {
        return json({ error: 'Order is already paid' }, { status: 409 });
    }

    const expectedAmountPaise = Math.round(Number(order.totalAmount) * 100);
    if (!Number.isInteger(expectedAmountPaise) || expectedAmountPaise <= 0) {
        return json({ error: 'Invalid saved order amount' }, { status: 400 });
    }

    if (
        Number.isInteger(body.amountPaise) &&
        body.amountPaise !== expectedAmountPaise
    ) {
        return json({ error: 'Checkout amount does not match saved order amount' }, { status: 409 });
    }

    const receipt = cleanReceipt(`printly_${order.orderToken || order.id.slice(0, 16)}`);
    const createResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
            authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            amount: expectedAmountPaise,
            currency: 'INR',
            receipt,
            notes: {
                app_order_id: order.id,
                order_token: order.orderToken || '',
            },
        }),
    });

    const razorpayOrder = await createResponse.json().catch(() => null);
    if (!createResponse.ok || !razorpayOrder?.id) {
        console.error('[razorpay-order] Razorpay create order failed:', razorpayOrder);
        return json({ error: 'Failed to create Razorpay order' }, { status: 502 });
    }

    const { error: updateError } = await supabase
        .from('Order')
        .update({
            razorpayOrderId: razorpayOrder.id,
            updatedAt: new Date().toISOString(),
        })
        .eq('id', order.id);

    if (updateError) {
        console.error('[razorpay-order] Failed to store Razorpay order id:', updateError.message);
        return json({ error: 'Failed to store Razorpay order id' }, { status: 500 });
    }

    return json({
        keyId,
        order: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            receipt: razorpayOrder.receipt,
        },
    });
}

export const config = {
    runtime: 'edge',
};
