import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for insecure contexts where crypto.randomUUID is not available
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export type AppRole = 'USER' | 'ADMIN' | 'DEVELOPER' | 'SUPERADMIN';

export function normalizeRole(role?: string | null): AppRole {
    const normalized = (role || '').trim().toUpperCase();

    if (normalized === 'ADMIN') return 'ADMIN';
    if (normalized === 'DEVELOPER') return 'DEVELOPER';
    if (normalized === 'SUPERADMIN') return 'SUPERADMIN';

    return 'USER';
}

export function hasAdminAccess(role?: string | null): boolean {
    const normalizedRole = normalizeRole(role);
    return normalizedRole === 'ADMIN' || normalizedRole === 'DEVELOPER' || normalizedRole === 'SUPERADMIN';
}

export function hasDeveloperAccess(role?: string | null): boolean {
    const normalizedRole = normalizeRole(role);
    return normalizedRole === 'DEVELOPER' || normalizedRole === 'SUPERADMIN';
}
