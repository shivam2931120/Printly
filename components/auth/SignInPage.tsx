import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export const SignInPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />
    </div>
);
