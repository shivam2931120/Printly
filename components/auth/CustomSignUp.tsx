import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';
import { RateLimits } from '../../lib/rateLimiter';
import { isValidEmail, checkPasswordStrength, stripHtml } from '../../lib/security';

export const CustomSignUp = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [formStep, setFormStep] = useState<'form' | 'otp'>('form');
    const [otpCode, setOtpCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const navigate = useNavigate();

    const passwordStrength = checkPasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Sanitize inputs
        const cleanEmail = email.trim().toLowerCase();
        const cleanFirst = stripHtml(firstName.trim());
        const cleanLast = stripHtml(lastName.trim());

        if (!isValidEmail(cleanEmail)) {
            setError('Please enter a valid email address');
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setIsLoading(false);
            return;
        }

        try {
            // Rate limit signup attempts
            try {
                await RateLimits.signup(async () => {});
            } catch (err: any) {
                setError(err.message);
                setIsLoading(false);
                return;
            }

            const fullName = `${cleanFirst} ${cleanLast}`.trim();
            const { error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password,
                options: {
                    data: { name: fullName, full_name: fullName },
                    // No emailRedirectTo — OTP code verification instead of magic link
                },
            });

            if (signUpError) {
                if (signUpError.message?.includes('already registered')) {
                    setError('This email is already registered. Try signing in.');
                } else {
                    setError(signUpError.message);
                }
            } else {
                // Move to OTP verification step
                setFormStep('otp');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        setError('');

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otpCode.trim(),
                type: 'signup',
            });

            if (verifyError) {
                if (verifyError.message?.includes('expired')) {
                    setError('OTP has expired. Please request a new one.');
                } else if (verifyError.message?.includes('invalid') || verifyError.message?.includes('Token')) {
                    setError('Invalid OTP code. Please check and try again.');
                } else {
                    setError(verifyError.message);
                }
            } else {
                // Verified — AuthContext picks up the new session automatically
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'Verification failed');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendOtp = async () => {
        setError('');
        setIsLoading(true);
        try {
            const { error: resendErr } = await supabase.auth.resend({
                type: 'signup',
                email,
            });
            if (resendErr) {
                setError(resendErr.message);
            } else {
                setOtpCode('');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to resend');
        } finally {
            setIsLoading(false);
        }
    };

    // ===== OTP Verification Screen =====
    if (formStep === 'otp') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none opacity-50" />

                <div className="w-full max-w-sm relative z-10 animate-in">
                    <div className="w-full bg-white/[0.03] border border-white/[0.05] p-10 rounded-[40px] shadow-2xl backdrop-blur-xl text-center">
                        <div className="inline-flex items-center justify-center size-20 rounded-[32px] bg-white text-black mb-8 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                            <ShieldCheck size={40} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-3 font-display">Verify Email</h1>
                        <p className="text-text-muted text-sm leading-relaxed mb-8">
                            We've sent a 6-digit code to <span className="text-white font-bold">{email}</span>. Enter it below to complete registration.
                        </p>

                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-in">
                                    {error}
                                </div>
                            )}

                            <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full text-center text-3xl font-black tracking-[0.5em] py-5 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20"
                                placeholder="000000"
                                maxLength={6}
                                autoFocus
                                required
                            />

                            <Button
                                type="submit"
                                disabled={isVerifying || otpCode.length < 6}
                                className="w-full h-14 text-sm font-black bg-white text-black hover:bg-white/90 shadow-glow-primary rounded-2xl disabled:opacity-40"
                            >
                                {isVerifying ? (
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                ) : (
                                    <span className="flex items-center justify-center gap-3">
                                        VERIFY & CONTINUE <ArrowRight className="w-4 h-4" />
                                    </span>
                                )}
                            </Button>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setFormStep('form'); setError(''); setOtpCode(''); }}
                                    className="text-text-muted text-xs font-bold hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-3 h-3 inline mr-1" />
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={isLoading}
                                    className="text-text-muted text-xs font-bold hover:text-white transition-colors disabled:opacity-40"
                                >
                                    {isLoading ? 'Sending...' : 'Resend Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // ===== Sign Up Form =====
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4">
            {/* Background Accents */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-sm relative z-10 animate-in flex flex-col items-center">
                {/* Back to Home Button */}
                <div className="w-full flex justify-start mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-text-muted hover:text-white transition-all text-xs font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Store
                    </button>
                </div>

                <div className="w-full bg-white/[0.03] border border-white/[0.05] p-8 rounded-[40px] shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center mb-6">
                            <div className="relative group">
                                <div className="size-16 rounded-[24px] bg-white flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.1)] transition-transform duration-500 group-hover:scale-110">
                                    <img src="/Printly.png" alt="Logo" className="size-10 object-contain invert" />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">New Account</h1>
                        <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Student Registration</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-in">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium"
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors w-4 h-4" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium"
                                    placeholder="student@university.edu"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors w-4 h-4" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {/* Password Strength Indicator */}
                                {password.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                        <div className="flex gap-1">
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                                        i < passwordStrength.score
                                                            ? passwordStrength.score <= 1 ? 'bg-red-500' :
                                                              passwordStrength.score <= 2 ? 'bg-amber-500' :
                                                              passwordStrength.score <= 3 ? 'bg-blue-500' : 'bg-emerald-500'
                                                            : 'bg-white/10'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-text-muted">
                                            {passwordStrength.score <= 1 ? 'Weak' :
                                             passwordStrength.score <= 2 ? 'Fair' :
                                             passwordStrength.score <= 3 ? 'Strong' : 'Very Strong'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Confirm Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors w-4 h-4" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 text-sm font-black bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.15)] rounded-2xl transition-all active:scale-[0.98] group"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                ) : (
                                    <span className="flex items-center justify-center gap-3">
                                        INITIALIZE ACCOUNT <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="text-center space-y-4 mt-8">
                            <p className="text-text-muted text-[13px] font-medium">
                                Already have an account? <span onClick={() => navigate('/sign-in')} className="text-white font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Sign In</span>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
