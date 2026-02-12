import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Shield, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';

const ADMIN_SECRET_CODE = 'PRINTLY-ADMIN-2024';

export const AdminSignUp = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [adminCode, setAdminCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (adminCode !== ADMIN_SECRET_CODE) {
            setError('Invalid admin authorization code. Contact the system administrator.');
            setIsLoading(false);
            return;
        }

        try {
            const fullName = `${firstName} ${lastName}`.trim();
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name: fullName, full_name: fullName, role: 'ADMIN' },
                },
            });

            if (signUpError) {
                setError(signUpError.message);
                return;
            }

            if (data.user) {
                const { error: upsertError } = await supabase
                    .from('User')
                    .upsert({
                        authId: data.user.id,
                        email: email,
                        name: fullName,
                        role: 'ADMIN',
                    }, { onConflict: 'authId' });

                if (upsertError) {
                    console.error('Failed to set admin role:', upsertError);
                }
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none opacity-50" />

                <div className="w-full max-w-sm relative z-10 animate-in">
                    <div className="w-full bg-white/[0.03] border border-white/[0.05] p-10 rounded-[40px] shadow-2xl backdrop-blur-xl text-center">
                        <div className="inline-flex items-center justify-center size-20 rounded-[32px] bg-orange-500 text-white mb-8 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                            <CheckCircle2 size={40} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-3 font-display">Verify Admin</h1>
                        <p className="text-text-muted text-sm leading-relaxed mb-8">
                            We've sent a confirmation link to <span className="text-white font-bold">{email}</span>. Please verify your admin account to continue.
                        </p>

                        <Button
                            onClick={() => navigate('/admin/sign-in')}
                            className="w-full h-14 text-sm font-black bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90 shadow-lg rounded-2xl"
                        >
                            Back to Admin Login
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4">
            {/* Background Accents */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
            <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none opacity-30" />

            <div className="w-full max-w-sm relative z-10 animate-in flex flex-col items-center">
                {/* Back to Home */}
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
                                <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-black border-2 border-orange-500 flex items-center justify-center shadow-lg">
                                    <Shield className="w-3 h-3 text-orange-500" />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">New Unit</h1>
                        <p className="text-orange-500/60 text-[10px] font-black uppercase tracking-[0.25em]">Admin Provisioning</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center animate-in">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-orange-500/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm font-medium"
                                    placeholder="Admin"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-orange-500/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm font-medium"
                                    placeholder="Owner"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Admin Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-orange-500/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm font-medium"
                                placeholder="admin@printly.in"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:border-orange-500/30 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm font-medium"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-orange-500/80 uppercase tracking-[0.15em] ml-1">Auth Code</label>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/40 w-5 h-5" />
                                <input
                                    type="password"
                                    value={adminCode}
                                    onChange={(e) => setAdminCode(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-orange-500/20 rounded-2xl focus:border-orange-500/50 focus:bg-white/[0.08] outline-none transition-all text-white placeholder-white/10 text-sm font-medium"
                                    placeholder="Enter secret code"
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
                                        PROVISION ACCOUNT <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="text-center space-y-4 mt-8">
                            <p className="text-text-muted text-[13px] font-medium">
                                Already an admin? <span onClick={() => navigate('/admin/sign-in')} className="text-orange-400 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Admin Login</span>
                            </p>
                            <div className="pt-4 border-t border-white/5">
                                <p className="text-slate-600 text-[11px] font-bold uppercase tracking-widest">
                                    Are you a student? <span onClick={() => navigate('/sign-in')} className="text-white/40 font-black cursor-pointer hover:text-white transition-colors">Student Entry</span>
                                </p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
