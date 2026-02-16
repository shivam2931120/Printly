import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { Lock, Mail, Loader2, X, ArrowRight } from 'lucide-react';

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignIn?: (user: { email: string; name: string; isAdmin: boolean; isDeveloper?: boolean }) => void;
}

type ModalStage = 'form' | 'verifyEmail';

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
    const { signIn, isLoaded, setActive } = useSignIn();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [stage, setStage] = useState<ModalStage>('form');
    const navigate = useNavigate();

    if (!isOpen) return null;

    const fallbackToEmailCode = async () => {
        if (!signIn) return false;
        try {
            const si = await signIn.create({ identifier: email });
            const emailFactor = si.supportedFirstFactors?.find(
                (f: any) => f.strategy === 'email_code'
            );
            if (emailFactor) {
                await signIn.prepareFirstFactor({
                    strategy: 'email_code',
                    emailAddressId: (emailFactor as any).emailAddressId,
                });
                setStage('verifyEmail');
                return true;
            }
        } catch { /* fall through */ }
        return false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signIn) return;
        setIsLoading(true);
        setError('');

        try {
            const result = await signIn.create({ identifier: email, password });
            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                onClose();
                return;
            }
            if (result.status === 'needs_first_factor') {
                const emailFactor = result.supportedFirstFactors?.find((f: any) => f.strategy === 'email_code');
                if (emailFactor) {
                    await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: (emailFactor as any).emailAddressId });
                    setStage('verifyEmail');
                    return;
                }
            }
            setError('Unable to complete sign-in.');
        } catch (err: any) {
            const clerkError = err.errors?.[0];
            const msg = clerkError?.longMessage || clerkError?.message || 'Invalid email or password';
            if (msg.toLowerCase().includes('strategy') || msg.toLowerCase().includes('verification') || clerkError?.code === 'strategy_for_user_invalid') {
                if (await fallbackToEmailCode()) return;
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signIn) return;
        setIsLoading(true);
        setError('');
        try {
            const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                onClose();
            } else {
                setError('Verification failed. Please try again.');
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || 'Invalid verification code');
        } finally {
            setIsLoading(false);
        }
    };

    if (stage === 'verifyEmail') {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative z-10 w-full max-w-md mx-4 bg-white/[0.03] border border-white/[0.05] rounded-[32px] shadow-2xl backdrop-blur-xl p-8 text-center">
                    <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-2">Check Your Email</h2>
                    <p className="text-text-muted text-xs mb-6">Code sent to <span className="text-white font-bold">{email}</span></p>
                    <form onSubmit={handleVerifyCode} className="space-y-6">
                        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">{error}</div>}
                        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-center text-2xl font-bold tracking-widest" placeholder="000000" maxLength={6} autoFocus required />
                        <button type="submit" disabled={isLoading || !isLoaded} className="w-full py-3.5 bg-white text-black hover:opacity-90 font-black rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center justify-center gap-2">VERIFY & SIGN IN <ArrowRight className="w-4 h-4" /></span>}
                        </button>
                        <button type="button" onClick={() => { setStage('form'); setCode(''); setError(''); }} className="text-text-muted text-xs font-bold hover:text-white transition-colors">← Back</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md mx-4 bg-white/[0.03] border border-white/[0.05] rounded-[32px] shadow-2xl backdrop-blur-xl p-8">
                <button onClick={onClose} className="absolute top-6 right-6 text-text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-white tracking-tight mb-2">Sign In</h2>
                    <p className="text-text-muted text-xs">Welcome back to Printly</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center">{error}</div>}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm" placeholder="you@college.edu" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm" placeholder="••••••••" required />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading || !isLoaded} className="w-full py-3.5 bg-white text-black hover:opacity-90 font-black rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'SIGN IN'}
                    </button>
                    <p className="text-center text-text-muted text-xs">
                        Don't have an account?{' '}
                        <button type="button" onClick={() => { onClose(); navigate('/sign-up'); }} className="text-white font-black hover:underline">Sign Up</button>
                    </p>
                </form>
            </div>
        </div>
    );
};
