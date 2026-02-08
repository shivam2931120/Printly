import React, { useState } from 'react';
import { Icon } from '../ui/Icon';

import { supabase } from '../../services/supabase';

// Map database roles to frontend permissions
const mapUserRole = (dbUser: any) => {
    return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || dbUser.email.split('@')[0],
        isAdmin: dbUser.role === 'ADMIN' || dbUser.role === 'DEVELOPER',
        isDeveloper: dbUser.role === 'DEVELOPER',
        avatar: dbUser.avatar
    };
};

interface SignInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSignIn: (user: { email: string; name: string; isAdmin: boolean; isDeveloper?: boolean }) => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, onSignIn }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isSignUp) {
                // Check if user already exists
                const { data: existingUser } = await supabase
                    .from('User')
                    .select('email')
                    .eq('email', email)
                    .single();

                if (existingUser) {
                    setError('User with this email already exists');
                    setIsLoading(false);
                    return;
                }

                // Create new user
                const { data: newUser, error: createError } = await supabase
                    .from('User')
                    .insert([
                        {
                            email,
                            password, // Storing directly as per current requirement
                            name,
                            role: 'USER', // Default role
                        }
                    ])
                    .select()
                    .single();

                if (createError) throw createError;

                if (newUser) {
                    const userData = mapUserRole(newUser);
                    localStorage.setItem('printwise_user', JSON.stringify(userData));
                    onSignIn(userData);
                    onClose();
                }
            } else {
                // Sign In
                const { data: user, error: fetchError } = await supabase
                    .from('User')
                    .select('*')
                    .eq('email', email)
                    .eq('password', password)
                    .single();

                if (fetchError || !user) {
                    setError('Invalid email or password');
                    setIsLoading(false);
                    return;
                }

                const userData = mapUserRole(user);
                localStorage.setItem('printwise_user', JSON.stringify(userData));
                onSignIn(userData);
                onClose();
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'An error occurred during authentication');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-border-light dark:border-border-dark bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Icon name="print" className="text-2xl text-primary" />
                            </div>
                            <span className="text-xl font-bold text-slate-900 dark:text-white">Printly</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <Icon name="close" />
                        </button>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {isSignUp ? 'Join Printly today' : 'Sign in to continue to Printly'}
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isSignUp && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@college.edu"
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 flex items-center gap-1">
                                <Icon name="error" className="text-sm" />
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                    <Icon name="arrow_forward" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-primary font-medium hover:underline"
                        >
                            {isSignUp ? 'Sign In' : 'Sign Up'}
                        </button>
                    </p>

                </div>
            </div>
        </div>
    );
};
