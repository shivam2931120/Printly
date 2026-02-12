import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';
import { hasAdminAccess, hasDeveloperAccess, normalizeRole } from '../../lib/utils';

export const AdminSignIn = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const normalizedEmail = email.trim().toLowerCase();

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
            });

            if (signInError) {
                setError(signInError.message);
                return;
            }

            if (data.user) {
                const { data: dbUserByAuthId, error: dbErrorByAuthId } = await supabase
                    .from('User')
                    .select('id, role')
                    .eq('authId', data.user.id)
                    .maybeSingle();

                let resolvedUser = dbUserByAuthId;

                if (!resolvedUser) {
                    const { data: dbUserByEmail } = await supabase
                        .from('User')
                        .select('id, role')
                        .eq('email', normalizedEmail)
                        .maybeSingle();

                    if (dbUserByEmail?.id) {
                        resolvedUser = dbUserByEmail;
                        await supabase
                            .from('User')
                            .update({ authId: data.user.id })
                            .eq('id', dbUserByEmail.id);
                    }
                }

                const role = normalizeRole(
                    resolvedUser?.role || data.user.user_metadata?.role || data.user.app_metadata?.role
                );

                if (dbErrorByAuthId || !resolvedUser) {
                    if (!hasAdminAccess(role) && !hasDeveloperAccess(role)) {
                        await supabase.auth.signOut();
                        setError('Account not found. Please contact an administrator.');
                        return;
                    }
                }

                if (!hasAdminAccess(role) && !hasDeveloperAccess(role)) {
                    await supabase.auth.signOut();
                    setError('Access denied. This login is for administrators only.');
                    return;
                }

                if (hasDeveloperAccess(role)) {
                    navigate('/developer');
                } else {
                    navigate('/admin');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4 font-sans">
            {/* Background Accents — Orange/Red for Admin */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none opacity-30" />

            <div className="w-full max-w-sm relative z-10 animate-in flex flex-col items-center">
                {/* Back to Home Button */}
                <div className="w-full flex justify-start mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-text-muted hover:text-white transition-all text-xs font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to store
                    </button>
                </div>

                <div className="w-full bg-white/[0.03] border border-white/[0.05] p-8 rounded-[40px] shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center mb-6">
                            <div className="relative group">
                                <div className="size-16 rounded-[24px] bg-white flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.1)] transition-transform duration-500 group-hover:scale-110">
                                    <img src="/Printly.png" alt="Logo" className="size-10 object-contain invert" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-black border-2 border-orange-500 flex items-center justify-center shadow-lg">
                                    <Shield className="w-3 h-3 text-orange-500" />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">Hub Access</h1>
                        <p className="text-orange-500/60 text-[10px] font-black uppercase tracking-[0.25em]">Admin Control Unit</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-in">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Admin Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-orange-400 transition-colors w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-orange-500/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm font-medium"
                                    placeholder="admin@printly.in"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-orange-400 transition-colors w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-orange-500/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm font-medium"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 text-sm font-black bg-gradient-to-r from-orange-600 to-red-600 text-white hover:opacity-90 shadow-[0_10px_30px_rgba(239,68,68,0.25)] rounded-2xl transition-all active:scale-[0.98] group"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                ) : (
                                    <span className="flex items-center justify-center gap-3">
                                        ACCESS DASHBOARD <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="text-center space-y-4 mt-8">
                            <p className="text-text-muted text-[13px] font-medium">
                                Need access? <span onClick={() => navigate('/admin/sign-up')} className="text-orange-400 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Register Shop</span>
                            </p>
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-slate-600 text-[11px] font-bold uppercase tracking-widest">
                                    Are you a student? <span onClick={() => navigate('/sign-in')} className="text-white/40 font-black cursor-pointer hover:text-white transition-colors">Student Login</span>
                                </p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
