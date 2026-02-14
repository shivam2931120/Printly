import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '../types';
import { hasAdminAccess, hasDeveloperAccess, normalizeRole } from '../lib/utils';

const CACHE_KEY = 'printly_user_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedUser {
    user: User;
    ts: number;
}

function getCachedUser(): User | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached: CachedUser = JSON.parse(raw);
        if (Date.now() - cached.ts > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cached.user;
    } catch {
        return null;
    }
}

function setCachedUser(user: User | null) {
    try {
        if (user && !user.id.startsWith('temp_')) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ user, ts: Date.now() }));
        } else {
            localStorage.removeItem(CACHE_KEY);
        }
    } catch { /* ignore */ }
}

interface AuthState {
    user: User | null;
    supabaseUser: SupabaseUser | null;
    session: Session | null;
    isLoaded: boolean;
    isSignedIn: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
    user: null,
    supabaseUser: null,
    session: null,
    isLoaded: false,
    isSignedIn: false,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

/** Map a DB row → app User */
function mapDbUser(dbUser: any, authUser: SupabaseUser): User {
    const role = normalizeRole(dbUser?.role || authUser.user_metadata?.role || authUser.app_metadata?.role);
    return {
        id: dbUser.id,
        authId: authUser.id,
        email: dbUser.email || authUser.email || '',
        name: dbUser.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        avatar: dbUser.avatar || authUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.name || 'U')}&background=random`,
        isAdmin: hasAdminAccess(role) || dbUser.isAdmin === true,
        isDeveloper: hasDeveloperAccess(role) || dbUser.isDeveloper === true,
    };
}

/** Fallback user when DB is unreachable */
function getFallbackUser(authUser: SupabaseUser): User {
    const role = normalizeRole(authUser.user_metadata?.role || authUser.app_metadata?.role);
    return {
        id: `temp_${authUser.id}`,
        authId: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        avatar: authUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.email?.split('@')[0] || 'U')}&background=random`,
        isAdmin: hasAdminAccess(role),
        isDeveloper: hasDeveloperAccess(role),
    };
}

/** Supabase query with timeout — never hangs */
async function queryWithTimeout<T>(
    queryFn: () => PromiseLike<{ data: T | null; error: any }>,
    ms = 5000
): Promise<{ data: T | null; error: any }> {
    const timeout = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Query timeout', code: 'TIMEOUT' } }), ms)
    );
    return Promise.race([queryFn(), timeout]);
}

/** Fetch User row from DB: by authId → email → auto-create */
async function fetchUserRecord(authUser: SupabaseUser): Promise<User> {
    try {
        // 1. By authId
        const { data: records, error: e1 } = await queryWithTimeout(() =>
            supabase.from('User').select('*').eq('authId', authUser.id)
        );

        if (e1 && e1.code !== 'TIMEOUT') console.warn('[Auth] authId lookup error:', e1.message);
        if (records && Array.isArray(records) && records.length > 0) {
            return mapDbUser(records[0], authUser);
        }

        // 2. By email — backfill authId
        if (authUser.email) {
            const { data: emailRecords } = await queryWithTimeout(() =>
                supabase.from('User').select('*').eq('email', authUser.email!)
            );

            if (emailRecords && Array.isArray(emailRecords) && emailRecords.length > 0) {
                const legacy = emailRecords[0];
                supabase.from('User').update({ authId: authUser.id }).eq('id', legacy.id).then(() => {}); // fire-and-forget
                return mapDbUser({ ...legacy, authId: authUser.id }, authUser);
            }
        }

        // 3. Auto-create
        const { data: inserted, error: insertErr } = await queryWithTimeout(() =>
            supabase.from('User').insert({
                id: crypto.randomUUID(),
                authId: authUser.id,
                email: authUser.email || '',
                name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                avatar: authUser.user_metadata?.avatar_url || null,
                role: 'USER',
            }).select().single()
        );

        if (inserted && !insertErr) {
            return mapDbUser(inserted, authUser);
        }

        // Retry lookups on conflict
        if (insertErr) {
            const { data: retry } = await queryWithTimeout(() =>
                supabase.from('User').select('*').eq('authId', authUser.id).maybeSingle()
            );
            if (retry) return mapDbUser(retry, authUser);
        }

        return getFallbackUser(authUser);
    } catch (err: any) {
        // AbortError is harmless — StrictMode double-mount or navigation
        if (err?.name === 'AbortError') {
            console.log('[Auth] Request aborted (harmless)');
        } else {
            console.error('[Auth] fetchUserRecord error:', err);
        }
        return getFallbackUser(authUser);
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const cachedUser = getCachedUser();
    const [session, setSession] = useState<Session | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [appUser, setAppUser] = useState<User | null>(cachedUser);
    const [isLoaded, setIsLoaded] = useState(!!cachedUser); // instant if cached
    const resolveRef = useRef(0);

    const resolveAppUser = useCallback(async (authUser: SupabaseUser) => {
        const seq = ++resolveRef.current;
        const user = await fetchUserRecord(authUser);
        if (seq !== resolveRef.current) return; // stale
        setAppUser(prev => {
            if (prev && (prev.isDeveloper || prev.isAdmin) && !user.isDeveloper && !user.isAdmin && user.id.startsWith('temp_')) {
                return prev; // never downgrade privileged user to fallback
            }
            setCachedUser(user);
            return user;
        });
    }, []);

    useEffect(() => {
        let mounted = true;

        // Use ONLY onAuthStateChange — it fires INITIAL_SESSION first,
        // then SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!mounted) return;

            setSession(s);
            setSupabaseUser(s?.user ?? null);

            if (s?.user) {
                await resolveAppUser(s.user);
            } else {
                setAppUser(null);
                setCachedUser(null);
            }

            if (mounted) setIsLoaded(true);
        });

        // Safety: if onAuthStateChange never fires, force isLoaded after 3s
        const safety = setTimeout(() => {
            if (mounted) setIsLoaded(true);
        }, 3000);

        return () => {
            mounted = false;
            clearTimeout(safety);
            subscription.unsubscribe();
        };
    }, [resolveAppUser]);

    const handleSignOut = async () => {
        resolveRef.current++;
        setCachedUser(null);
        await supabase.auth.signOut();
        setAppUser(null);
        setSupabaseUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user: appUser,
                supabaseUser,
                session,
                isLoaded,
                isSignedIn: !!session?.user,
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
