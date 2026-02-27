import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Admin sign-up is now handled by Clerk through the unified /sign-up route.
 * After sign-up, AuthContext auto-creates a User row in the DB.
 * Admin role must be assigned in the database by an existing admin/developer.
 */
export const AdminSignUp = () => {
 return <Navigate to="/sign-up" replace />;
};
