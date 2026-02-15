import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';
import { hasAdminAccess, hasDeveloperAccess, normalizeRole } from '../../lib/utils';
import { RateLimits } from '../../lib/rateLimiter';

export const CustomSignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Rate limit sign-in attempts
            try {
                await RateLimits.signin(async () => {});
            } catch (err: any) {
                setError(err.message);
                setIsLoading(false);
                return;
            }

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                if (signInError.message === 'Email not confirmed') {
                    setError('Please verify your email address before signing in.');
                } else if (signInError.message === 'Invalid login credentials') {
                    setError('Incorrect email or password. Please try again.');
                } else {
                    setError(signInError.message);
                }
            } else {
                const authUserId = data.user?.id;
                const authEmail = data.user?.email;

                if (!authUserId) {
                    navigate('/');
                    return;
                }

                // Look up User row by authId
                let resolvedRole = 'USER';
                const { data: authIdRecord } = await supabase
                    .from('User')
                    .select('id, role')
                    .eq('authId', authUserId)
                    .maybeSingle();

                if (authIdRecord) {
                    resolvedRole = authIdRecord.role || 'USER';
                } else {
                    // Try by email and backfill authId
                    const { data: emailRecord } = await supabase
                        .from('User')
                        .select('id, role')
                        .eq('email', email)
                        .maybeSingle();

                    if (emailRecord?.id) {
                        resolvedRole = emailRecord.role || 'USER';
                        await supabase
                            .from('User')
                            .update({ authId: authUserId })
                            .eq('id', emailRecord.id);
                    } else {
                        // No User row at all — auto-create one
                        // Prisma @default(cuid()) is client-side only, must provide id
                        const userName = data.user?.user_metadata?.name || data.user?.user_metadata?.full_name || authEmail?.split('@')[0] || 'User';
                        const { data: newUser, error: insertErr } = await supabase
                            .from('User')
                            .insert({
                                id: crypto.randomUUID(),
                                authId: authUserId,
                                email: authEmail || email,
                                name: userName,
                                role: 'USER',
                            })
                            .select('id, role')
                            .single();
                        if (insertErr) {
                            console.warn('[SignIn] Auto-insert failed:', insertErr.message);
                        }
                        if (newUser) resolvedRole = newUser.role || 'USER';
                    }
                }

                const normalizedRole = normalizeRole(resolvedRole);

                if (hasDeveloperAccess(normalizedRole)) {
                    navigate('/developer');
                } else if (hasAdminAccess(normalizedRole)) {
                    navigate('/admin');
                } else {
                    navigate('/');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

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
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">Welcome Back</h1>
                        <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Sign in to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-in">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium"
                                    placeholder="yourname@college.edu"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Password</label>
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    className="text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.1em] transition-colors"
                                >
                                    Forgot?
                                </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-white transition-colors w-5 h-5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-white/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/20 text-sm font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
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
                                        ENTER SYSTEM <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="text-center space-y-4 mt-8">
                            <p className="text-text-muted text-[13px] font-medium">
                                New here? <span onClick={() => navigate('/sign-up')} className="text-white font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Create Account</span>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
