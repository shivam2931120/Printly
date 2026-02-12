import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const DomainGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isLoaded } = useAuth();

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
        );
    }

    return <>{children}</>;
};
