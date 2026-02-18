import React, { useState } from 'react';
import { Fingerprint, Lock, Loader2, KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { authenticateWithBiometric, isBiometricEnabled, unlockApp } from '../../lib/biometricAuth';

interface LockScreenProps {
    onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleBiometricUnlock = async () => {
        setIsLoading(true);
        setError('');

        try {
            const result = await authenticateWithBiometric();
            if (result.success) {
                unlockApp();
                onUnlock();
            } else {
                setError('Authentication failed. Try again.');
            }
        } catch {
            setError('Biometric not available. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const hasBiometric = isBiometricEnabled();

    return (
        <div className="fixed inset-0 z-[9999] bg-[#050505] flex items-center justify-center px-4">
            {/* Background effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-sm relative z-10 text-center">
                {/* Lock Icon */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center size-24 rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-xl mb-6 animate-pulse">
                        <Lock className="w-12 h-12 text-white/60" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">
                        App Locked
                    </h1>
                    <p className="text-text-muted text-sm">
                        Locked due to inactivity. Verify to continue.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-4">
                    {hasBiometric && (
                        <Button
                            onClick={handleBiometricUnlock}
                            disabled={isLoading}
                            className="w-full h-16 bg-white text-black hover:opacity-90 font-black text-sm rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                            ) : (
                                <span className="flex items-center justify-center gap-3">
                                    <Fingerprint className="w-6 h-6" />
                                    Unlock with Biometric
                                </span>
                            )}
                        </Button>
                    )}

                    {!hasBiometric && (
                        <Button
                            onClick={() => {
                                unlockApp();
                                onUnlock();
                            }}
                            className="w-full h-16 bg-white text-black hover:opacity-90 font-black text-sm rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                        >
                            <span className="flex items-center justify-center gap-3">
                                <KeyRound className="w-6 h-6" />
                                Continue to App
                            </span>
                        </Button>
                    )}
                </div>

                {/* Timer info */}
                <p className="text-text-muted/50 text-[10px] font-bold uppercase tracking-widest mt-8">
                    Auto-locked for your security
                </p>
            </div>
        </div>
    );
};
