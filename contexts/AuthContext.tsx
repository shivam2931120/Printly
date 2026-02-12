import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '../types';
import { hasAdminAccess, hasDeveloperAccess, normalizeRole } from '../lib/utils';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [appUser, setAppUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    /**
     * Map database user record to application User type
     */
    const mapDbUser = (dbUser: any, authUser: SupabaseUser): User => {
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
    };

    /**
     * Create a fallback "Minimal User" if DB fetch fails
     */
    const getFallbackUser = (authUser: SupabaseUser): User => {
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
    };

    const fetchUserRecord = async (authUser: SupabaseUser): Promise<User> => {
        try {
            const { data: records } = await supabase
                .from('User')
                .select('*')
                .eq('authId', authUser.id);

            if (records && records.length > 0) {
                return mapDbUser(records[0], authUser);
            }

            if (authUser.email) {
                const { data: emailRecords } = await supabase
                    .from('User')
                    .select('*')
                    .eq('email', authUser.email);

                if (emailRecords && emailRecords.length > 0) {
                    const legacyUser = emailRecords[0];

                    await supabase
                        .from('User')
                        .update({ authId: authUser.id })
                        .eq('id', legacyUser.id);

                    return mapDbUser({ ...legacyUser, authId: authUser.id }, authUser);
                }
            }

            return getFallbackUser(authUser);
        } catch (err) {
            return getFallbackUser(authUser);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            try {
                const { data: { session: s } } = await supabase.auth.getSession();
                if (!mounted) return;

                setSession(s);
                setSupabaseUser(s?.user ?? null);

                if (s?.user) {
                    // Set fallback immediately so app is usable
                    const fallback = getFallbackUser(s.user);
                    setAppUser(fallback);
                    // Fetch real profile in background
                    fetchUserRecord(s.user).then(u => {
                        if (mounted) setAppUser(u);
                    });
                }

                setIsLoaded(true);
            } catch (err) {
                console.error('[Auth] Init Error:', err);
                if (mounted) setIsLoaded(true);
            }
        };

        initialize();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (!mounted) return;

            setSession(s);
            setSupabaseUser(s?.user ?? null);

            if (s?.user) {
                const fallback = getFallbackUser(s.user);
                setAppUser(fallback);
                fetchUserRecord(s.user).then(u => {
                    if (mounted) setAppUser(u);
                });
            } else {
                setAppUser(null);
            }
            setIsLoaded(true);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleSignOut = async () => {
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
                isSignedIn: !!session?.user, // Always true if Auth session exists
                signOut: handleSignOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
