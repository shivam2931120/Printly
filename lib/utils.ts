import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
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
