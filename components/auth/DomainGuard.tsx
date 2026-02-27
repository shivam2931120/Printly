import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const DomainGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const { isLoaded } = useAuth();

 if (!isLoaded) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white">
 <div className="animate-spin h-12 w-12 border-b-2 border-[#333]"></div>
 </div>
 );
 }

 return <>{children}</>;
};
