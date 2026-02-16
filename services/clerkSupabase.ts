import { useSession } from '@clerk/clerk-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useMemo, useCallback } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Hook that returns a function to get a Supabase client authenticated
 * with the current Clerk session's JWT.
 *
 * Usage:
 *   const { getToken } = useClerkSupabase();
 *   const token = await getToken();
 *   // The global supabase client already works for anon queries;
 *   // for authenticated queries, set the Authorization header.
 */
export function useClerkSupabase() {
    const { session } = useSession();

    const getToken = useCallback(async (): Promise<string | null> => {
        if (!session) return null;
        try {
            const token = await session.getToken({ template: 'supabase' });
            return token;
        } catch (err) {
            console.warn('[ClerkSupabase] Failed to get token:', err);
            return null;
        }
    }, [session]);

    /**
     * Returns a Supabase client with the Clerk JWT set as Authorization header.
     * This client respects RLS via auth.uid() mapped from the JWT `sub` claim.
     */
    const getAuthenticatedClient = useCallback(async (): Promise<SupabaseClient> => {
        const token = await getToken();
        if (!token) {
            // Return anon client if no token available
            return createClient(supabaseUrl, supabaseAnonKey);
        }
        return createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        });
    }, [getToken]);

    return { getToken, getAuthenticatedClient };
}
