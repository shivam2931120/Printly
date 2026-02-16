import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { supabase } from '../services/supabase';
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

/** Clerk user info shape used internally */
interface ClerkUserInfo {
    id: string;
    email: string;
    name: string;
    avatar: string;
}

interface AuthState {
    user: User | null;
    isLoaded: boolean;
    isSignedIn: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
    user: null,
    isLoaded: false,
    isSignedIn: false,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

/** Map a DB row → app User */
function mapDbUser(dbUser: any, clerkUser: ClerkUserInfo): User {
    const role = normalizeRole(dbUser?.role);
    return {
        id: dbUser.id,
        authId: clerkUser.id,
        email: dbUser.email || clerkUser.email,
        name: dbUser.name || clerkUser.name || clerkUser.email.split('@')[0] || 'User',
        avatar: dbUser.avatar || clerkUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbUser.name || 'U')}&background=random`,
        isAdmin: hasAdminAccess(role) || dbUser.isAdmin === true,
        isDeveloper: hasDeveloperAccess(role) || dbUser.isDeveloper === true,
    };
}

/** Fallback user when DB is unreachable */
function getFallbackUser(clerkUser: ClerkUserInfo): User {
    return {
        id: `temp_${clerkUser.id}`,
        authId: clerkUser.id,
        email: clerkUser.email,
        name: clerkUser.name || clerkUser.email.split('@')[0] || 'User',
        avatar: clerkUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(clerkUser.email.split('@')[0] || 'U')}&background=random`,
        isAdmin: false,
        isDeveloper: false,
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
async function fetchUserRecord(clerkUser: ClerkUserInfo): Promise<User> {
    try {
        // 1. By authId (Clerk user ID)
        const { data: records, error: e1 } = await queryWithTimeout(() =>
            supabase.from('User').select('*').eq('authId', clerkUser.id)
        );

        if (e1 && e1.code !== 'TIMEOUT') console.warn('[Auth] authId lookup error:', e1.message);
        if (records && Array.isArray(records) && records.length > 0) {
            return mapDbUser(records[0], clerkUser);
        }

        // 2. By email — backfill authId
        if (clerkUser.email) {
            const { data: emailRecords } = await queryWithTimeout(() =>
                supabase.from('User').select('*').eq('email', clerkUser.email)
            );

            if (emailRecords && Array.isArray(emailRecords) && emailRecords.length > 0) {
                const legacy = emailRecords[0];
                supabase.from('User').update({ authId: clerkUser.id }).eq('id', legacy.id).then(() => {}); // fire-and-forget
                return mapDbUser({ ...legacy, authId: clerkUser.id }, clerkUser);
            }
        }

        // 3. Auto-create
        const now = new Date().toISOString();
        const { data: inserted, error: insertErr } = await queryWithTimeout(() =>
            supabase.from('User').insert({
                id: crypto.randomUUID(),
                authId: clerkUser.id,
                email: clerkUser.email || '',
                name: clerkUser.name || clerkUser.email?.split('@')[0] || 'User',
                avatar: clerkUser.avatar || null,
                role: 'USER',
                createdAt: now,
                updatedAt: now,
            }).select().single()
        );

        if (inserted && !insertErr) {
            return mapDbUser(inserted, clerkUser);
        }

        // Retry lookups on conflict
        if (insertErr) {
            const { data: retry } = await queryWithTimeout(() =>
                supabase.from('User').select('*').eq('authId', clerkUser.id).maybeSingle()
            );
            if (retry) return mapDbUser(retry, clerkUser);
        }

        return getFallbackUser(clerkUser);
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            console.log('[Auth] Request aborted (harmless)');
        } else {
            console.error('[Auth] fetchUserRecord error:', err);
        }
        return getFallbackUser(clerkUser);
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser();
    const { signOut: clerkSignOut } = useClerkAuth();

    const cachedUser = getCachedUser();
    const [appUser, setAppUser] = useState<User | null>(cachedUser);
    const [isLoaded, setIsLoaded] = useState(!!cachedUser);
    const resolveRef = useRef(0);

    const resolveAppUser = useCallback(async (clerk: ClerkUserInfo) => {
        const seq = ++resolveRef.current;
        const user = await fetchUserRecord(clerk);
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
        if (!clerkLoaded) return;

        if (clerkSignedIn && clerkUser) {
            setIsLoaded(true);
            const clerkInfo: ClerkUserInfo = {
                id: clerkUser.id,
                email: clerkUser.primaryEmailAddress?.emailAddress || '',
                name: clerkUser.fullName || clerkUser.firstName || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0] || 'User',
                avatar: clerkUser.imageUrl || '',
            };
            resolveAppUser(clerkInfo);
        } else {
            setAppUser(null);
            setCachedUser(null);
            setIsLoaded(true);
        }
    }, [clerkLoaded, clerkSignedIn, clerkUser?.id, resolveAppUser]);

    const handleSignOut = async () => {
        resolveRef.current++;
        setCachedUser(null);
        setAppUser(null);
        await clerkSignOut();
    };

    return (
        <AuthContext.Provider
            value={{
                user: appUser,
                isLoaded,
                isSignedIn: !!clerkSignedIn,
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
