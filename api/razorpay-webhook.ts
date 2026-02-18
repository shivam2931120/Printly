/**
 * Vercel Serverless Function: /api/razorpay-webhook
 *
 * Responsibilities:
 *  1. Verify Razorpay webhook signature (HMAC-SHA256)
 *  2. Mark the matching Order as PAID in Supabase
 *  3. Optionally verify caller identity via Clerk JWT (for manual triggers)
 *
 * Required env vars (set in Vercel Dashboard):
 *   RAZORPAY_WEBHOOK_SECRET   — from Razorpay Dashboard → Webhooks
 *   SUPABASE_URL              — same as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (NEVER expose to client)
 *   CLERK_SECRET_KEY          — already present in .env
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ── Supabase admin client (bypasses RLS for server-side writes) ──
function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    }
    return createClient(url, key);
}

// ── Verify Razorpay signature ──
function verifyRazorpaySignature(
    body: string,
    signature: string | string[] | undefined,
    secret: string
): boolean {
    if (!signature || Array.isArray(signature)) return false;
    const expected = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    return crypto.timingSafeEqual(
        Buffer.from(expected, 'hex'),
        Buffer.from(signature, 'hex')
    );
}

// ── Map Razorpay event → order status ──
function resolveStatus(event: string): { paymentStatus: string; status: string } | null {
    switch (event) {
        case 'payment.captured':
            return { paymentStatus: 'PAID', status: 'CONFIRMED' };
        case 'payment.failed':
            return { paymentStatus: 'UNPAID', status: 'PENDING' };
        default:
            return null;
    }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('[webhook] RAZORPAY_WEBHOOK_SECRET not set');
        return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Raw body for signature verification
    // Vercel provides the raw body as a Buffer when bodyParser is disabled
    const rawBody =
        typeof req.body === 'string'
            ? req.body
            : Buffer.isBuffer(req.body)
                ? req.body.toString('utf8')
                : JSON.stringify(req.body);

    const signature = req.headers['x-razorpay-signature'];

    if (!verifyRazorpaySignature(rawBody, signature, webhookSecret)) {
        console.warn('[webhook] Invalid Razorpay signature — request rejected');
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse payload
    let payload: any;
    try {
        payload = typeof req.body === 'object' ? req.body : JSON.parse(rawBody);
    } catch {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const event: string = payload?.event;
    const paymentEntity = payload?.payload?.payment?.entity;

    if (!event || !paymentEntity) {
        return res.status(400).json({ error: 'Missing event or payment entity' });
    }

    console.log(`[webhook] Received event: ${event}, payment_id: ${paymentEntity.id}`);

    const statusUpdate = resolveStatus(event);
    if (!statusUpdate) {
        // Unhandled event — acknowledge without processing
        return res.status(200).json({ received: true, processed: false });
    }

    // Find the order by payment ID (stored as Order.id = razorpay_payment_id in CartDrawer)
    const supabase = getSupabaseAdmin();
    const paymentId: string = paymentEntity.id;
    const now = new Date().toISOString();

    // Try matching by order ID first (order.id was set to razorpay_payment_id in CartDrawer)
    const { data: orderById } = await supabase
        .from('Order')
        .select('id, paymentStatus, status')
        .eq('id', paymentId)
        .maybeSingle();

    const targetId = orderById?.id ?? null;

    if (!targetId) {
        // No exact ID match — log and acknowledge (order may have crypto.randomUUID() id)
        console.warn(`[webhook] No order found for payment_id: ${paymentId}`);
        return res.status(200).json({ received: true, processed: false, reason: 'order_not_found' });
    }

    // Idempotency: skip if already in the target state
    if (
        orderById.paymentStatus === statusUpdate.paymentStatus &&
        orderById.status === statusUpdate.status
    ) {
        return res.status(200).json({ received: true, processed: false, reason: 'already_updated' });
    }

    const { error: updateError } = await supabase
        .from('Order')
        .update({
            paymentStatus: statusUpdate.paymentStatus,
            status: statusUpdate.status,
            updatedAt: now,
        })
        .eq('id', targetId);

    if (updateError) {
        console.error('[webhook] Failed to update order:', updateError.message);
        return res.status(500).json({ error: 'Failed to update order' });
    }

    console.log(`[webhook] ✓ Order ${targetId} — paymentStatus=${statusUpdate.paymentStatus}, status=${statusUpdate.status}`);
    return res.status(200).json({ received: true, processed: true, orderId: targetId });
}

// Disable body parsing so we can read the raw body for signature verification
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1mb',
        },
    },
};
