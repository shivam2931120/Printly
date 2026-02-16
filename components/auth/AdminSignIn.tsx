import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Admin sign-in is now handled by Clerk through the unified /sign-in route.
 * After sign-in, AuthContext resolves the user's role from the DB
 * and App.tsx redirects admins to /admin automatically.
 */
export const AdminSignIn = () => {
    return <Navigate to="/sign-in" replace />;
};
