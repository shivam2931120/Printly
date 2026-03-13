import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { Mail, ArrowRight, ArrowLeft, Loader2, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';

export const CustomSignIn = () => {
    const { signIn, isLoaded, setActive } = useSignIn();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signIn) return;

        setIsLoading(true);
        setError('');

        try {
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === 'complete') {
                await setActive({ session: result.createdSessionId });
                navigate('/');
            } else {
                setError('Sign-in requires further verification. Please contact support.');
            }
        } catch (err: any) {
            const errMsg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || '';

            if (errMsg.toLowerCase().includes("couldn't find") ||
                errMsg.toLowerCase().includes("not found") ||
                errMsg.toLowerCase().includes("no account") ||
                err.errors?.[0]?.code === 'form_identifier_not_found') {
                setError("Account doesn't exist. Please create an account first.");
            } else if (errMsg.toLowerCase().includes("password")) {
                setError("Incorrect password. Please try again.");
            } else {
                setError(errMsg || 'Sign-in failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 font-sans">
            <div className="w-full max-w-sm relative z-10 animate-in flex flex-col items-center">
                {/* Back to Home Button */}
                <div className="w-full flex justify-start mb-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-all duration-300 text-xs font-black uppercase tracking-widest group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Store
                    </button>
                </div>

                <div className="w-full bg-background-card border border-border rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center mb-6">
                            <div className="size-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                                <img src="/Printly.png" alt="Logo" className="size-10 object-contain invert" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-black text-foreground tracking-tight mb-2 font-display">Welcome Back</h1>
                        <p className="text-foreground-muted text-[10px] font-black uppercase tracking-[0.25em]">Sign in to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-error/10 border border-error/20 text-error rounded-xl text-xs font-bold text-center animate-in">
                                {error}
                                {error.toLowerCase().includes("doesn't exist") && (
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/sign-up')}
                                            className="text-foreground underline underline-offset-2 hover:text-primary-foreground transition-colors font-black"
                                        >
                                            Create Account →
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.15em] ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-primary transition-colors w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-background-subtle border border-border rounded-xl shadow-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-300 text-foreground placeholder-border-light text-sm font-medium"
                                    placeholder="you@college.edu"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-foreground-muted uppercase tracking-[0.15em] ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted group-focus-within:text-primary transition-colors w-4 h-4" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-4 bg-background-subtle border border-border rounded-xl shadow-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-300 text-foreground placeholder-border-light text-sm font-medium"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(p => !p)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading || !isLoaded}
                                className="w-full h-14 text-sm font-black bg-primary text-primary-foreground hover:bg-primary-hover border-primary transition-all duration-300 active:scale-[0.98] group rounded-xl shadow-lg shadow-primary/20"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                ) : (
                                    <span className="flex items-center justify-center gap-3">
                                        SIGN IN <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </div>

                        <div className="text-center space-y-4 mt-8">
                            <p className="text-foreground-muted text-[13px] font-medium">
                                Don't have an account? <span onClick={() => navigate('/sign-up')} className="text-primary font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Sign Up</span>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
