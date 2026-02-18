import React, { useState, useEffect } from 'react';
import { Fingerprint, Shield, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { isBiometricAvailable, registerBiometric, isBiometricEnabled, disableBiometric } from '../../lib/biometricAuth';
import { toast } from 'sonner';

interface BiometricSetupProps {
    userId: string;
    email: string;
    onClose?: () => void;
}

export const BiometricSetup: React.FC<BiometricSetupProps> = ({ userId, email, onClose }) => {
    const [isAvailable, setIsAvailable] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        checkBiometricSupport();
    }, []);

    const checkBiometricSupport = async () => {
        setChecking(true);
        const available = await isBiometricAvailable();
        const enabled = isBiometricEnabled();
        setIsAvailable(available);
        setIsEnabled(enabled);
        setChecking(false);
    };

    const handleEnableBiometric = async () => {
        setIsLoading(true);
        try {
            const credential = await registerBiometric(userId, email);
            if (credential) {
                setIsEnabled(true);
                toast.success('Biometric authentication enabled! 🎉');
            } else {
                toast.error('Failed to enable biometric authentication');
            }
        } catch (error) {
            console.error('Biometric setup error:', error);
            toast.error('Biometric setup failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableBiometric = () => {
        disableBiometric();
        setIsEnabled(false);
        toast.info('Biometric authentication disabled');
    };

    if (checking) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-white/50" />
            </div>
        );
    }

    if (!isAvailable) {
        return (
            <div className="relative bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-xl">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-white/5 mb-4">
                        <Fingerprint className="w-7 h-7 text-text-muted" />
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">Biometric Unavailable</h3>
                    <p className="text-text-muted text-xs leading-relaxed">
                        Biometric authentication is only available when the app is installed and your device supports it.
                        Install Printly as an app to unlock this feature.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-xl">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            )}

            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 mb-4 animate-pulse">
                    {isEnabled ? (
                        <CheckCircle2 className="w-8 h-8 text-green-400" />
                    ) : (
                        <Fingerprint className="w-8 h-8 text-white" />
                    )}
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                    {isEnabled ? 'Biometric Enabled' : 'Enable Biometric Login'}
                </h3>
                <p className="text-text-muted text-xs leading-relaxed">
                    {isEnabled
                        ? 'Quick and secure access with your fingerprint or face.'
                        : 'Sign in instantly using your fingerprint, face, or other biometric authentication.'}
                </p>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span>Encrypted and stored locally</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span>Never shared with servers</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span>Can be disabled anytime</span>
                </div>
            </div>

            {isEnabled ? (
                <Button
                    onClick={handleDisableBiometric}
                    className="w-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-black text-sm py-3 rounded-2xl"
                >
                    Disable Biometric
                </Button>
            ) : (
                <Button
                    onClick={handleEnableBiometric}
                    disabled={isLoading}
                    className="w-full bg-white text-black hover:opacity-90 font-black text-sm py-3 rounded-2xl shadow-lg"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <Fingerprint className="w-5 h-5" />
                            Enable Biometric
                        </span>
                    )}
                </Button>
            )}
        </div>
    );
};
