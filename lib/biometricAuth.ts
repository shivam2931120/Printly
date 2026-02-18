/**
 * Biometric Authentication Utilities for PWA
 * Uses Web Authentication API (WebAuthn) for fingerprint, face recognition, etc.
 * Includes: Auto-lock, admin verification, multi-device credential sync.
 */

import { supabase } from '../services/supabase';

export interface BiometricCredential {
    id: string;
    publicKey: string;
    counter: number;
    userId: string;
    deviceName: string;
    createdAt: string;
}

export interface DeviceCredential {
    id: string;
    deviceName: string;
    createdAt: string;
    lastUsed: string;
    isCurrent: boolean;
}

// ─── Auto-Lock ───────────────────────────────────────────────

const AUTO_LOCK_KEY = 'printly_auto_lock';
const LAST_ACTIVITY_KEY = 'printly_last_activity';
const LOCK_TIMEOUT_KEY = 'printly_lock_timeout';
const DEFAULT_LOCK_TIMEOUT = 60_000; // 1 minute

let _activityListeners: (() => void)[] = [];
let _lockCheckInterval: ReturnType<typeof setInterval> | null = null;
let _lockCallback: (() => void) | null = null;

/**
 * Get configured lock timeout in ms
 */
export function getLockTimeout(): number {
    const stored = localStorage.getItem(LOCK_TIMEOUT_KEY);
    return stored ? parseInt(stored, 10) : DEFAULT_LOCK_TIMEOUT;
}

/**
 * Set lock timeout in ms
 */
export function setLockTimeout(ms: number): void {
    localStorage.setItem(LOCK_TIMEOUT_KEY, String(ms));
}

/**
 * Check if app is currently locked
 */
export function isAppLocked(): boolean {
    return localStorage.getItem(AUTO_LOCK_KEY) === 'locked';
}

/**
 * Lock the app manually
 */
export function lockApp(): void {
    localStorage.setItem(AUTO_LOCK_KEY, 'locked');
    _lockCallback?.();
}

/**
 * Unlock the app
 */
export function unlockApp(): void {
    localStorage.removeItem(AUTO_LOCK_KEY);
    recordActivity();
}

/**
 * Record user activity timestamp
 */
export function recordActivity(): void {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

/**
 * Start the auto-lock monitor. Call once at app root.
 * @param onLock - callback when app should be locked
 * @returns cleanup function
 */
export function startAutoLockMonitor(onLock: () => void): () => void {
    // Only run in standalone PWA mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone;
    
    if (!isStandalone) return () => {};

    if (!isBiometricEnabled()) return () => {};
    
    _lockCallback = onLock;
    recordActivity();

    // Track user activity
    const activityHandler = () => recordActivity();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach(e => {
        window.addEventListener(e, activityHandler, { passive: true });
    });
    _activityListeners = events.map(() => activityHandler);

    // Handle visibility change (tab/app switch)
    const visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
            const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
            const timeout = getLockTimeout();
            if (Date.now() - lastActivity > timeout) {
                lockApp();
                onLock();
            }
        }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Periodic check every 10 seconds
    _lockCheckInterval = setInterval(() => {
        const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
        const timeout = getLockTimeout();
        if (Date.now() - lastActivity > timeout && !isAppLocked()) {
            lockApp();
            onLock();
        }
    }, 10_000);

    return () => {
        events.forEach(e => window.removeEventListener(e, activityHandler));
        document.removeEventListener('visibilitychange', visibilityHandler);
        if (_lockCheckInterval) clearInterval(_lockCheckInterval);
        _lockCallback = null;
    };
}

// ─── Admin Action Verification ───────────────────────────────

export type ProtectedAction = 
    | 'delete_order'
    | 'bulk_delete'
    | 'delete_product'
    | 'update_pricing'
    | 'export_data'
    | 'purge_storage';

const ADMIN_VERIFY_CACHE_KEY = 'printly_admin_verified';
const ADMIN_VERIFY_TTL = 5 * 60_000; // Cache verification for 5 minutes

/**
 * Verify admin identity before sensitive actions.
 * Uses biometric if available in PWA, or falls back to confirm dialog.
 * Caches verification for 5 minutes to reduce friction.
 */
export async function verifyAdminAction(action: ProtectedAction): Promise<boolean> {
    // Check cache — already verified recently?
    const cached = localStorage.getItem(ADMIN_VERIFY_CACHE_KEY);
    if (cached) {
        const ts = parseInt(cached, 10);
        if (Date.now() - ts < ADMIN_VERIFY_TTL) return true;
    }

    const biometricAvail = await isBiometricAvailable();
    const biometricOn = isBiometricEnabled();

    if (biometricAvail && biometricOn) {
        // Biometric challenge
        const result = await authenticateWithBiometric();
        if (result.success) {
            localStorage.setItem(ADMIN_VERIFY_CACHE_KEY, String(Date.now()));
            return true;
        }
        // Biometric failed — fall through to confirm
    }

    // Fallback: ask for confirmation
    const actionLabels: Record<ProtectedAction, string> = {
        delete_order: 'delete this order',
        bulk_delete: 'delete selected orders',
        delete_product: 'delete this product',
        update_pricing: 'update pricing settings',
        export_data: 'export customer data',
        purge_storage: 'purge storage data',
    };

    const confirmed = window.confirm(
        `🔒 Admin Verification Required\n\nYou are about to ${actionLabels[action]}.\n\nConfirm to proceed.`
    );
    if (confirmed) {
        localStorage.setItem(ADMIN_VERIFY_CACHE_KEY, String(Date.now()));
    }
    return confirmed;
}

/**
 * Clear admin verification cache (e.g. on sign out)
 */
export function clearAdminVerification(): void {
    localStorage.removeItem(ADMIN_VERIFY_CACHE_KEY);
}

// ─── Multi-Device Biometric Sync ─────────────────────────────

/**
 * Get a friendly device name  
 */
function getDeviceName(): string {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) return 'iOS Device';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Mac/.test(ua)) return 'macOS Device';
    if (/Linux/.test(ua)) return 'Linux Device';
    return 'Unknown Device';
}

/**
 * Generate a unique device fingerprint
 */
function getDeviceFingerprint(): string {
    let fp = localStorage.getItem('printly_device_fp');
    if (!fp) {
        fp = crypto.randomUUID();
        localStorage.setItem('printly_device_fp', fp);
    }
    return fp;
}

/**
 * Sync biometric credential to Supabase for multi-device management
 */
export async function syncCredentialToCloud(userId: string, credential: BiometricCredential): Promise<boolean> {
    try {
        const deviceFp = getDeviceFingerprint();
        const deviceName = getDeviceName();

        const { error } = await supabase
            .from('BiometricDevice')
            .upsert({
                id: deviceFp,
                userId,
                deviceName,
                credentialId: credential.id,
                publicKey: credential.publicKey,
                lastUsed: new Date().toISOString(),
                createdAt: credential.createdAt,
            }, { onConflict: 'id' });

        if (error) {
            console.error('Failed to sync biometric credential:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Sync credential error:', err);
        return false;
    }
}

/**
 * Fetch all registered biometric devices for a user
 */
export async function fetchUserDevices(userId: string): Promise<DeviceCredential[]> {
    try {
        const { data, error } = await supabase
            .from('BiometricDevice')
            .select('id, deviceName, createdAt, lastUsed')
            .eq('userId', userId)
            .order('lastUsed', { ascending: false });

        if (error || !data) return [];

        const currentFp = getDeviceFingerprint();
        return data.map((d: any) => ({
            id: d.id,
            deviceName: d.deviceName,
            createdAt: d.createdAt,
            lastUsed: d.lastUsed,
            isCurrent: d.id === currentFp,
        }));
    } catch {
        return [];
    }
}

/**
 * Revoke a device's biometric credential
 */
export async function revokeDevice(deviceId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('BiometricDevice')
            .delete()
            .eq('id', deviceId);

        if (error) {
            console.error('Failed to revoke device:', error);
            return false;
        }

        // If revoking current device, disable local biometric
        if (deviceId === getDeviceFingerprint()) {
            disableBiometric();
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Update last-used timestamp for current device
 */
export async function touchCurrentDevice(userId: string): Promise<void> {
    try {
        const deviceFp = getDeviceFingerprint();
        await supabase
            .from('BiometricDevice')
            .update({ lastUsed: new Date().toISOString() })
            .eq('id', deviceFp)
            .eq('userId', userId);
    } catch {
        // fire-and-forget
    }
}

/**
 * Check if biometric authentication is available on this device
 */
export async function isBiometricAvailable(): Promise<boolean> {
    // Check if running as installed PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');

    // Check WebAuthn support
    const hasWebAuthn = !!window.PublicKeyCredential;

    // Check platform authenticator (biometric)
    if (hasWebAuthn && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const hasPlatformAuth = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return isStandalone && hasPlatformAuth;
    }

    return false;
}

/**
 * Register biometric credentials for a user
 */
export async function registerBiometric(userId: string, email: string): Promise<BiometricCredential | null> {
    try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
            challenge,
            rp: {
                name: 'Printly',
                id: window.location.hostname,
            },
            user: {
                id: new TextEncoder().encode(userId),
                name: email,
                displayName: email.split('@')[0],
            },
            pubKeyCredParams: [
                { alg: -7, type: 'public-key' }, // ES256
                { alg: -257, type: 'public-key' }, // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform', // Built-in biometric
                userVerification: 'required',
                requireResidentKey: false,
            },
            timeout: 60000,
            attestation: 'none',
        };

        const credential = await navigator.credentials.create({
            publicKey: publicKeyCredentialCreationOptions,
        }) as PublicKeyCredential;

        if (!credential) return null;

        const credData: BiometricCredential = {
            id: credential.id,
            publicKey: arrayBufferToBase64(credential.rawId),
            counter: 0,
            userId,
            deviceName: getDeviceName(),
            createdAt: new Date().toISOString(),
        };

        localStorage.setItem('biometric_cred', JSON.stringify(credData));
        localStorage.setItem('biometric_enabled', 'true');

        // Sync to cloud for multi-device management (fire-and-forget)
        syncCredentialToCloud(userId, credData).catch(() => {});

        return credData;
    } catch (error) {
        console.error('Biometric registration failed:', error);
        return null;
    }
}

/**
 * Authenticate using biometric credentials
 */
export async function authenticateWithBiometric(): Promise<{ success: boolean; userId?: string }> {
    try {
        const storedCred = localStorage.getItem('biometric_cred');
        if (!storedCred) return { success: false };

        const credData: BiometricCredential = JSON.parse(storedCred);

        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
            challenge,
            allowCredentials: [
                {
                    id: base64ToArrayBuffer(credData.publicKey),
                    type: 'public-key',
                    transports: ['internal'],
                },
            ],
            timeout: 60000,
            userVerification: 'required',
        };

        const assertion = await navigator.credentials.get({
            publicKey: publicKeyCredentialRequestOptions,
        }) as PublicKeyCredential;

        if (!assertion) return { success: false };

        // In production, verify signature on backend
        return { success: true, userId: credData.userId };
    } catch (error) {
        console.error('Biometric authentication failed:', error);
        return { success: false };
    }
}

/**
 * Check if biometric is enabled for current device
 */
export function isBiometricEnabled(): boolean {
    return localStorage.getItem('biometric_enabled') === 'true';
}

/**
 * Disable biometric authentication
 */
export function disableBiometric(): void {
    localStorage.removeItem('biometric_cred');
    localStorage.removeItem('biometric_enabled');
}

// Utility functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
