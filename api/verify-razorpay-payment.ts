/**
 * Vercel Edge Function: /api/verify-razorpay-payment
 *
 * Verifies the Razorpay Checkout signature against the Razorpay order id stored
 * on the server, then marks the matching Printly order as paid.
 */

import { createClient } from '@supabase/supabase-js';

type SavedOrderRow = {
    id: string;
    status: 'PENDING' | 'CONFIRMED' | 'PRINTING' | 'READY' | 'COMPLETED';
    paymentStatus: 'PAID' | 'UNPAID';
    razorpayOrderId?: string | null;
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

function getRazorpaySecret() {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        throw new Error('Missing RAZORPAY_KEY_SECRET env var');
    }
    return keySecret;
}

async function hmacSha256Hex(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    return Array.from(new Uint8Array(signature))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let index = 0; index < a.length; index++) {
        result |= a.charCodeAt(index) ^ b.charCodeAt(index);
    }
    return result === 0;
}

const isRazorpayId = (value: unknown, prefix: string) =>
    typeof value === 'string' && value.startsWith(prefix) && value.length <= 64;

const isMissingOptionalOrderColumn = (error: any) => {
    const message = `${error?.message || ''} ${error?.details || ''}`;
    return error?.code === 'PGRST204' || message.includes('paymentId') || message.includes('schema cache');
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    let body: {
        appOrderId?: string;
        razorpay_order_id?: string;
        razorpay_payment_id?: string;
        razorpay_signature?: string;
    };
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!body.appOrderId) {
        return json({ error: 'Missing appOrderId' }, { status: 400 });
    }
    if (
        !isRazorpayId(body.razorpay_order_id, 'order_') ||
        !isRazorpayId(body.razorpay_payment_id, 'pay_') ||
        typeof body.razorpay_signature !== 'string' ||
        !/^[a-f0-9]{64}$/i.test(body.razorpay_signature)
    ) {
        return json({ error: 'Invalid Razorpay payment response' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: savedOrder, error: orderError } = await supabase
        .from('Order')
        .select('id, status, paymentStatus, razorpayOrderId')
        .eq('id', body.appOrderId)
        .eq('isDeleted', false)
        .maybeSingle();

    if (orderError) {
        console.error('[verify-razorpay-payment] Failed to load order:', orderError.message);
        return json({ error: 'Failed to load order' }, { status: 500 });
    }

    if (!savedOrder) {
        return json({ error: 'Order not found' }, { status: 404 });
    }

    const order = savedOrder as SavedOrderRow;
    if (order.paymentStatus === 'PAID') {
        return json({ success: true, alreadyPaid: true, orderId: order.id });
    }

    if (!order.razorpayOrderId) {
        return json({ error: 'Order is missing server-created Razorpay order id' }, { status: 409 });
    }

    if (order.razorpayOrderId !== body.razorpay_order_id) {
        return json({ error: 'Razorpay order id mismatch' }, { status: 409 });
    }

    const expectedSignature = await hmacSha256Hex(
        `${order.razorpayOrderId}|${body.razorpay_payment_id}`,
        getRazorpaySecret()
    );

    if (!constantTimeEqual(expectedSignature, body.razorpay_signature.toLowerCase())) {
        return json({ error: 'Invalid Razorpay signature' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
        .from('Order')
        .update({
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
            paymentId: body.razorpay_payment_id,
            updatedAt: now,
        })
        .eq('id', order.id);

    if (updateError) {
        if (isMissingOptionalOrderColumn(updateError)) {
            const { error: fallbackError } = await supabase
                .from('Order')
                .update({
                    paymentStatus: 'PAID',
                    status: 'CONFIRMED',
                    updatedAt: now,
                })
                .eq('id', order.id);

            if (!fallbackError) {
                return json({ success: true, orderId: order.id });
            }

            console.error('[verify-razorpay-payment] Failed fallback update:', fallbackError.message);
            return json({ error: 'Failed to confirm order payment' }, { status: 500 });
        }

        console.error('[verify-razorpay-payment] Failed to update order:', updateError.message);
        return json({ error: 'Failed to confirm order payment' }, { status: 500 });
    }

    return json({ success: true, orderId: order.id });
}

export const config = {
    runtime: 'edge',
};
