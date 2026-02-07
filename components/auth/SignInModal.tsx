import React, { useState } from 'react';
import { Icon } from '../ui/Icon';

// Demo accounts for testing
const DEMO_ACCOUNTS = {
    developer: {
        email: 'dev@printly.in',
        password: 'dev123',
        name: 'Developer',
        isAdmin: true,
        isDeveloper: true,
    },
    admin: {
        email: 'admin@printly.in',
        password: 'admin123',
        name: 'Admin User',
        isAdmin: true,
        isDeveloper: false,
    },
    student: {
        email: 'student@college.edu',
        password: 'student123',
        name: 'Demo Student',
        isAdmin: false,
        isDeveloper: false,
    },
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

        // Simulate authentication delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Check for developer account
        if (email === DEMO_ACCOUNTS.developer.email) {
            if (password === DEMO_ACCOUNTS.developer.password) {
                const userData = {
                    id: 'dev_main',
                    email: DEMO_ACCOUNTS.developer.email,
                    name: DEMO_ACCOUNTS.developer.name,
                    isAdmin: true,
                    isDeveloper: true,
                };
                localStorage.setItem('printwise_user', JSON.stringify(userData));
                setIsLoading(false);
                onSignIn(userData);
                onClose();
                return;
            } else {
                setError('Invalid password for developer account');
                setIsLoading(false);
                return;
            }
        }

        // Check for demo admin account
        if (email === DEMO_ACCOUNTS.admin.email) {
            if (password === DEMO_ACCOUNTS.admin.password) {
                const userData = {
                    id: 'admin_demo',
                    email: DEMO_ACCOUNTS.admin.email,
                    name: DEMO_ACCOUNTS.admin.name,
                    isAdmin: true,
                    isDeveloper: false,
                };
                localStorage.setItem('printwise_user', JSON.stringify(userData));
                setIsLoading(false);
                onSignIn(userData);
                onClose();
                return;
            } else {
                setError('Invalid password for admin account');
                setIsLoading(false);
                return;
            }
        }

        // Check for demo student account
        if (email === DEMO_ACCOUNTS.student.email) {
            if (password === DEMO_ACCOUNTS.student.password) {
                const userData = {
                    id: 'student_demo',
                    email: DEMO_ACCOUNTS.student.email,
                    name: DEMO_ACCOUNTS.student.name,
                    isAdmin: false,
                };
                localStorage.setItem('printwise_user', JSON.stringify(userData));
                setIsLoading(false);
                onSignIn(userData);
                onClose();
                return;
            } else {
                setError('Invalid password for student account');
                setIsLoading(false);
                return;
            }
        }

        // For any other email - check if contains 'admin' for admin access
        const isAdmin = email.toLowerCase().includes('admin');

        // Store in localStorage for persistence
        const userData = {
            id: `user_${Date.now()}`,
            email,
            name: name || email.split('@')[0],
            isAdmin,
        };
        localStorage.setItem('printwise_user', JSON.stringify(userData));

        setIsLoading(false);
        onSignIn(userData);
        onClose();
    };

    const handleDemoLogin = async (type: 'admin' | 'student') => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));

        const account = DEMO_ACCOUNTS[type];
        const userData = {
            id: `${type}_demo`,
            email: account.email,
            name: account.name,
            isAdmin: account.isAdmin,
        };
        localStorage.setItem('printwise_user', JSON.stringify(userData));

        setIsLoading(false);
        onSignIn(userData);
        onClose();
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        // Simulate Google OAuth
        await new Promise(resolve => setTimeout(resolve, 1000));

        const userData = {
            id: `google_${Date.now()}`,
            email: 'student@college.edu',
            name: 'Google User',
            isAdmin: false,
        };
        localStorage.setItem('printwise_user', JSON.stringify(userData));

        setIsLoading(false);
        onSignIn(userData);
        onClose();
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
                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-border-light dark:border-border-dark rounded-xl font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        <img
                            alt="Google"
                            className="w-5 h-5"
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        />
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
                        <span className="text-sm text-slate-400">or</span>
                        <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
                    </div>

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

                    {/* Demo Accounts Section */}
                    <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark">
                        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mb-3">
                            <Icon name="science" className="text-xs align-middle mr-1" />
                            Quick Demo Login
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDemoLogin('admin')}
                                disabled={isLoading}
                                className="flex-1 py-2.5 px-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Icon name="admin_panel_settings" className="text-lg" />
                                Admin
                            </button>
                            <button
                                onClick={() => handleDemoLogin('student')}
                                disabled={isLoading}
                                className="flex-1 py-2.5 px-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Icon name="school" className="text-lg" />
                                Student
                            </button>
                        </div>
                        <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
                            <p className="font-medium mb-1">Demo Credentials:</p>
                            <p>👤 Admin: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">admin@printwise.in</code> / <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">admin123</code></p>
                            <p>🎓 Student: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">student@college.edu</code> / <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">student123</code></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
