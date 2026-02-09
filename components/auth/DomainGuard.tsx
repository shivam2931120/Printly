import React, { useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { Icon } from '../ui/Icon';

export const DomainGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoaded, isSignedIn } = useUser();
    const { signOut } = useClerk();

    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            const email = user.primaryEmailAddress?.emailAddress || '';
            const role = (user.publicMetadata.role as string) || '';

            const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
            const isAllowedDomain = email.endsWith('.rvitm@rvei.edu.in');

            if (!isAdmin && !isAllowedDomain) {
                // Sign out if not admin and not correct domain
                signOut();
                alert('Access Restricted: Only .rvitm@rvei.edu.in emails are allowed.');
            }
        }
    }, [user, isLoaded, isSignedIn, signOut]);

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    return <>{children}</>;
};
