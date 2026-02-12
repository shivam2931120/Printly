import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import { StudentPortal } from './components/StudentPortal';
import { StorePage } from './components/StorePage';
import { AdminDashboard } from './components/AdminDashboard';
import { DeveloperDashboard } from './components/developer/DeveloperDashboard';
import { MyOrdersPage } from './components/user/MyOrdersPage';
import { SupportPage } from './components/user/SupportPage';
import { ProfilePage } from './components/user/ProfilePage';
import { CustomSignIn } from './components/auth/CustomSignIn';
import { CustomSignUp } from './components/auth/CustomSignUp';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import { MainLayout } from './components/layout/MainLayout';
import { CartDrawer } from './components/layout/CartDrawer';
import { User, PricingConfig, DEFAULT_PRICING } from './types';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/layout/PageTransition';
import { NotFound } from './components/NotFound';

// --- Protected Route Component ---
const ProtectedRoute = ({
  children,
  user,
  isLoaded,
  requiredRole
}: {
  children: React.ReactNode;
  user: User | null;
  isLoaded: boolean;
  requiredRole?: 'admin' | 'developer';
}) => {
  const location = useLocation();

  if (!isLoaded) return null; // Wait for auth to settle

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && !user.isAdmin) {
    if (user.isDeveloper) {
      return <Navigate to="/developer" replace />;
    }

    return <Navigate to="/" replace />;
  }

  if (requiredRole === 'developer' && !user.isDeveloper) {
    if (user.isAdmin) {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// --- App Content (Inside Router) ---
const AppContent: React.FC = () => {
  const { user: currentUser, isLoaded, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  // Global Redirects
  React.useEffect(() => {
    if (!isLoaded) return;

    const isAuthPage = location.pathname.startsWith('/sign-in') ||
      location.pathname.startsWith('/sign-up') ||
      location.pathname === '/forgot-password' ||
      location.pathname === '/reset-password' ||
      location.pathname === '/auth/callback';

    // 1. If signed in, manage redirects based on role
    if (currentUser) {
      // Keep away from auth pages
      if (isAuthPage) {
        if (currentUser.isDeveloper) {
          navigate('/developer', { replace: true });
        } else if (currentUser.isAdmin) {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
        return;
      }

      // Auto-redirect to respective dashboards from Home
      if (location.pathname === '/') {
        if (currentUser.isDeveloper) {
          console.log('[App] Developer detected, redirecting to /developer');
          navigate('/developer', { replace: true });
        } else if (currentUser.isAdmin) {
          console.log('[App] Admin detected, redirecting to /admin');
          navigate('/admin', { replace: true });
        }
        return;
      }

      if (location.pathname.startsWith('/developer') && !currentUser.isDeveloper && currentUser.isAdmin) {
        navigate('/admin', { replace: true });
      }
    }
  }, [isLoaded, currentUser, location.pathname, navigate]);

  const handlePricingUpdate = (newPricing: PricingConfig) => {
    setPricing(newPricing);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      <div className="size-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="relative min-h-screen bg-background text-white font-sans selection:bg-white/20">

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes - Student Auth */}
          <Route path="/sign-in/*" element={<CustomSignIn />} />
          <Route path="/sign-up/*" element={<CustomSignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<Navigate to="/" replace />} />

          {/* Student Routes */}
          <Route
            path="/"
            element={
              <MainLayout user={currentUser}>
                <PageTransition>
                  <StudentPortal
                    pricing={pricing}
                    currentUser={currentUser}
                    onSignInClick={() => navigate('/sign-in')}
                  />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/store"
            element={
              <MainLayout user={currentUser}>
                <PageTransition>
                  <StorePage />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/my-orders"
            element={
              <MainLayout user={currentUser}>
                <PageTransition>
                  <MyOrdersPage />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/support"
            element={
              <MainLayout user={currentUser}>
                <PageTransition>
                  <SupportPage />
                </PageTransition>
              </MainLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <MainLayout user={currentUser}>
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              </MainLayout>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute
                user={currentUser}
                isLoaded={isLoaded}
                requiredRole="admin"
              >
                <AdminDashboard
                  currentUser={currentUser}
                  pricing={pricing}
                  onPricingUpdate={handlePricingUpdate}
                  onSignOut={handleSignOut}
                />
              </ProtectedRoute>
            }
          />

          {/* Developer Routes */}
          <Route
            path="/developer/*"
            element={
              <ProtectedRoute
                user={currentUser}
                isLoaded={isLoaded}
                requiredRole="developer"
              >
                <DeveloperDashboard
                  currentUser={currentUser}
                  onSignOut={handleSignOut}
                  darkMode={true}
                  onToggleDarkMode={() => { }}
                />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>

      {/* Global Cart Drawer */}
      <CartDrawer />
    </div>
  );
};

import { ErrorBoundary } from './components/ErrorBoundary';

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}