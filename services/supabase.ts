import { createClient } from '@supabase/supabase-js';

// Vite exposes only VITE_ prefixed env vars to the client.
// Fallback to NEXT_PUBLIC_ for backward compat with .env.local
const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. ' +
        'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
}

/**
 * Public client — respects RLS, used for most queries.
 * This is safe to use in the frontend.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// NOTE: The SERVICE_ROLE_KEY should NEVER be used in the frontend.
// User synchronization is now handled via Supabase Database Triggers.
// SMTP configuration is handled in the Supabase Dashboard.
