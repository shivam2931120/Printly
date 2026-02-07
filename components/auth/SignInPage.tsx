import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Icon } from '../ui/Icon';

export const SignInPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark font-display px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
                        <Icon name="print" className="text-3xl" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        PrintWise Admin
                    </h1>
                </div>

                {/* Clerk Sign In */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-light dark:border-border-dark p-8 shadow-xl">
                    <SignIn
                        appearance={{
                            elements: {
                                rootBox: 'w-full',
                                card: 'bg-transparent shadow-none p-0',
                                headerTitle: 'text-slate-900 dark:text-white font-bold',
                                headerSubtitle: 'text-slate-500 dark:text-slate-400',
                                formButtonPrimary: 'bg-primary hover:bg-primary-hover',
                                formFieldInput: 'bg-background-light dark:bg-background-dark border-border-light dark:border-border-dark text-slate-900 dark:text-white',
                                formFieldLabel: 'text-slate-700 dark:text-slate-300',
                                footerActionLink: 'text-primary hover:text-primary-hover',
                                identityPreviewEditButton: 'text-primary',
                                formFieldInputShowPasswordButton: 'text-slate-500',
                            }
                        }}
                    />
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                    Protected admin area. Authorized personnel only.
                </p>
            </div>
        </div>
    );
};
