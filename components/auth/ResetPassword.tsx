import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Clerk handles password reset internally via the SignIn component.
 * This route redirects to sign-in.
 */
export const ResetPassword = () => {
    return <Navigate to="/sign-in" replace />;
};
