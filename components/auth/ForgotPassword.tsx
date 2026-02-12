import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../services/supabase';

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (resetError) {
                setError(resetError.message);
            } else {
                setSuccess(true);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none opacity-50" />
                <div className="w-full max-w-sm relative z-10 animate-in">
                    <div className="w-full bg-white/[0.03] border border-white/[0.05] p-10 rounded-[40px] shadow-2xl backdrop-blur-xl text-center">
                        <div className="inline-flex items-center justify-center size-20 rounded-[32px] bg-white text-black mb-8 shadow-glow-primary">
                            <CheckCircle2 size={40} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-3 font-display">Link Sent</h1>
                        <p className="text-text-muted text-sm leading-relaxed mb-8">
                            We've sent a password reset link to <span className="text-white font-bold">{email}</span>.
                        </p>
                        <Button
                            onClick={() => navigate('/sign-in')}
                            className="w-full h-14 text-sm font-black bg-white text-black hover:bg-white/90 rounded-2xl"
                        >
                            Back to Login
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4">
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-sm relative z-10 animate-in flex flex-col items-center">
                <div className="w-full flex justify-start mb-8">
                    <button
                        onClick={() => navigate('/sign-in')}
                        className="flex items-center gap-2 text-text-muted hover:text-white transition-all text-xs font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                    </button>
                </div>

                <div className="w-full bg-white/[0.03] border border-white/[0.05] p-8 rounded-[40px] shadow-2xl backdrop-blur-xl">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">Reset Password</h1>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-[0.2em] opacity-60">Enter your email to receive a link</p>
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

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 text-sm font-black bg-white text-black hover:bg-white/90 shadow-glow-primary rounded-2xl transition-all active:scale-[0.98]"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
