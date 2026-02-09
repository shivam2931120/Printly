import React from 'react';
import { SignUp } from '@clerk/clerk-react';

export const SignUpPage = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
    </div>
);
