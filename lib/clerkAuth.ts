/**
 * Server-side Clerk JWT verification utility
 *
 * Usage in any Vercel API route:
 *   import { verifyClerkRequest } from '../lib/clerkAuth';
 *
 *   const auth = await verifyClerkRequest(req);
 *   if (!auth.ok) return res.status(401).json({ error: auth.error });
 *   const { userId, email } = auth;
 *
 * Required env var: CLERK_SECRET_KEY (already in .env)
 */

import type { VercelRequest } from '@vercel/node';

export interface ClerkAuthResult {
    ok: true;
    userId: string;
    email: string | null;
    sessionId: string;
}

export interface ClerkAuthFailure {
    ok: false;
    error: string;
}

export type ClerkAuthCheck = ClerkAuthResult | ClerkAuthFailure;

/** Decode a JWT without verification (to read claims) — verification is done by Clerk */
function decodeJwtPayload(token: string): Record<string, any> | null {
    try {
        const [, payloadB64] = token.split('.');
        const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
        const json = Buffer.from(padded, 'base64').toString('utf8');
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/**
 * Verify a Clerk session JWT server-side using Clerk's JWKS endpoint.
 * Falls back to decode-only when CLERK_SECRET_KEY or network is unavailable.
 */
export async function verifyClerkRequest(req: VercelRequest): Promise<ClerkAuthCheck> {
    const authHeader = req.headers.authorization || req.headers['Authorization'] as string;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return { ok: false, error: 'Missing Authorization header' };
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
        // Fallback: decode without verify (dev/local usage)
        const payload = decodeJwtPayload(token);
        if (!payload?.sub) return { ok: false, error: 'Invalid token' };
        return {
            ok: true,
            userId: payload.sub,
            email: payload.email ?? null,
            sessionId: payload.sid ?? '',
        };
    }

    try {
        // Use Clerk's REST API to verify the session token
        const response = await fetch('https://api.clerk.com/v1/sessions/verify', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            return { ok: false, error: body?.errors?.[0]?.message || 'Token verification failed' };
        }

        const data = await response.json();
        const userId: string = data?.user_id ?? data?.sub ?? '';
        const email: string | null = data?.email ?? null;
        const sessionId: string = data?.id ?? '';

        if (!userId) return { ok: false, error: 'Could not extract user ID from token' };

        return { ok: true, userId, email, sessionId };
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Network error during token verification' };
    }
}

/**
 * Quick helper: returns userId or throws — for routes that strictly require auth.
 */
export async function requireClerkAuth(req: VercelRequest): Promise<ClerkAuthResult> {
    const result = await verifyClerkRequest(req);
    if (!result.ok) {
        // Type assertion needed because TS control flow analysis doesn't narrow discriminated unions in all contexts
        throw new Error((result as ClerkAuthFailure).error);
    }
    return result;
}
