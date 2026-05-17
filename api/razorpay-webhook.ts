/**
 * Vercel Edge Function: /api/razorpay-webhook
 *
 * Verifies Razorpay webhook signatures and marks the matching Order in Supabase.
 * Uses Edge runtime to avoid Node serverless resource provisioning issues.
 */

import { createClient } from '@supabase/supabase-js';

type StatusUpdate = { paymentStatus: 'PAID' | 'UNPAID'; status: 'CONFIRMED' | 'PENDING' };

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

async function verifyRazorpaySignature(body: string, signature: string | null, secret: string): Promise<boolean> {
    if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const expected = await hmacSha256Hex(body, secret);
    return constantTimeEqual(expected, signature.toLowerCase());
}

function resolveStatus(event: string): StatusUpdate | null {
    switch (event) {
        case 'payment.captured':
            return { paymentStatus: 'PAID', status: 'CONFIRMED' };
        case 'payment.failed':
            return { paymentStatus: 'UNPAID', status: 'PENDING' };
        default:
            return null;
    }
}

const isMissingPaymentIdColumn = (error: any) => {
    const message = `${error?.message || ''} ${error?.details || ''}`;
    return error?.code === 'PGRST204' || message.includes('paymentId') || message.includes('schema cache');
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('[webhook] RAZORPAY_WEBHOOK_SECRET not set');
        return json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!(await verifyRazorpaySignature(rawBody, signature, webhookSecret))) {
        console.warn('[webhook] Invalid Razorpay signature - request rejected');
        return json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const event: string = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;

    if (!event || !paymentEntity) {
        return json({ error: 'Missing event or payment entity' }, { status: 400 });
    }

    console.log(`[webhook] Received event: ${event}, payment_id: ${paymentEntity.id}`);

    const statusUpdate = resolveStatus(event);
    if (!statusUpdate) {
        return json({ received: true, processed: false });
    }

    const supabase = getSupabaseAdmin();
    const paymentId: string = paymentEntity.id;
    const appOrderId: string | undefined =
        paymentEntity.notes?.app_order_id ||
        paymentEntity.notes?.order_id;
    const now = new Date().toISOString();

    const { data: orderByAppId } = appOrderId ? await supabase
        .from('Order')
        .select('id, paymentStatus, status')
        .eq('id', appOrderId)
        .maybeSingle() : { data: null };

    let order = orderByAppId;

    if (!order) {
        const { data: orderByPaymentId } = await supabase
            .from('Order')
            .select('id, paymentStatus, status')
            .eq('paymentId', paymentId)
            .maybeSingle();
        order = orderByPaymentId;
    }

    if (!order) {
        const { data: legacyOrderById } = await supabase
            .from('Order')
            .select('id, paymentStatus, status')
            .eq('id', paymentId)
            .maybeSingle();
        order = legacyOrderById;
    }

    const targetId = order?.id ?? null;

    if (!targetId) {
        console.warn(`[webhook] No order found for payment_id: ${paymentId}, app_order_id: ${appOrderId || 'none'}`);
        return json({ received: true, processed: false, reason: 'order_not_found' });
    }

    if (
        order.paymentStatus === statusUpdate.paymentStatus &&
        order.status === statusUpdate.status
    ) {
        return json({ received: true, processed: false, reason: 'already_updated' });
    }

    const { error: updateError } = await supabase
        .from('Order')
        .update({
            paymentStatus: statusUpdate.paymentStatus,
            status: statusUpdate.status,
            paymentId,
            updatedAt: now,
        })
        .eq('id', targetId);

    if (updateError) {
        if (isMissingPaymentIdColumn(updateError)) {
            const { error: fallbackError } = await supabase
                .from('Order')
                .update({
                    paymentStatus: statusUpdate.paymentStatus,
                    status: statusUpdate.status,
                    updatedAt: now,
                })
                .eq('id', targetId);

            if (!fallbackError) {
                console.log(`[webhook] Order ${targetId} updated without paymentId column`);
                return json({ received: true, processed: true, orderId: targetId });
            }

            console.error('[webhook] Failed to update order:', fallbackError.message);
            return json({ error: 'Failed to update order' }, { status: 500 });
        }

        console.error('[webhook] Failed to update order:', updateError.message);
        return json({ error: 'Failed to update order' }, { status: 500 });
    }

    console.log(`[webhook] Order ${targetId} - paymentStatus=${statusUpdate.paymentStatus}, status=${statusUpdate.status}`);
    return json({ received: true, processed: true, orderId: targetId });
}

export const config = {
    runtime: 'edge',
};
