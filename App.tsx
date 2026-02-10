import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useUser, useClerk, ClerkProvider } from '@clerk/clerk-react';

import { StudentPortal } from './components/StudentPortal';
import { StorePage } from './components/StorePage';
import { AdminDashboard } from './components/AdminDashboard';
import { DeveloperDashboard } from './components/developer/DeveloperDashboard';
import { MyOrdersPage } from './components/user/MyOrdersPage';
import { SupportPage } from './components/user/SupportPage';
import { ProfilePage } from './components/user/ProfilePage';
import { CustomSignIn } from './components/auth/CustomSignIn';
import { CustomSignUp } from './components/auth/CustomSignUp';
import { DomainGuard } from './components/auth/DomainGuard';
import { MainLayout } from './components/layout/MainLayout';
import { CartDrawer } from './components/layout/CartDrawer';
// CartProvider removed - using Zustand
import { Icon } from './components/ui/Icon';
import { User, PricingConfig, DEFAULT_PRICING } from './types';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/layout/PageTransition';

// --- Protected Route Component ---
const ProtectedRoute = ({
  children,
  user,
  requiredRole,
  onSignInRequired
}: {
  children: React.ReactNode;
  user: User | null;
  requiredRole?: 'admin' | 'developer';
  onSignInRequired: () => void;
}) => {
  const location = useLocation();

  if (!user) {
    onSignInRequired();
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole === 'developer' && !user.isDeveloper) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// --- App Content (Inside Router) ---
const AppContent: React.FC = () => {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  // Map Clerk User to App User
  const currentUser: User | null = (isLoaded && isSignedIn && clerkUser) ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    name: clerkUser.fullName || '',
    isAdmin: (clerkUser.publicMetadata.role === 'ADMIN' || clerkUser.publicMetadata.role === 'SUPERADMIN'),
    isDeveloper: (clerkUser.publicMetadata.role === 'DEVELOPER' || clerkUser.publicMetadata.role === 'SUPERADMIN'),
    avatar: clerkUser.imageUrl,
  } : null;

  const handlePricingUpdate = (newPricing: PricingConfig) => {
    setPricing(newPricing);
  };

  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isDeveloper = location.pathname.startsWith('/developer');

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      <div className="size-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="relative min-h-screen bg-background text-white font-sans selection:bg-white/20">

      {/* Global Controls (Sign Out, Switch View) */}
      {!isDeveloper && currentUser && (
        <div className="fixed bottom-20 lg:bottom-6 right-6 z-[40] flex gap-2">
          {currentUser?.isAdmin && (
            <button
              onClick={() => navigate(location.pathname.startsWith('/admin') ? '/' : '/admin')}
              className="px-5 py-2.5 bg-white text-black font-bold rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-2 text-sm"
            >
              <Icon name="swap_horiz" />
              Switch to {location.pathname.startsWith('/admin') ? 'Student' : 'Admin'}
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes - Auth */}
          <Route path="/sign-in/*" element={<CustomSignIn />} />
          <Route path="/sign-up/*" element={<CustomSignUp />} />

          {/* Student Routes */}
          <Route
            path="/"
            element={
              <DomainGuard>
                <MainLayout user={currentUser}>
                  <PageTransition>
                    <StudentPortal
                      pricing={pricing}
                      currentUser={currentUser}
                      onSignInClick={() => navigate('/sign-in')}
                    />
                  </PageTransition>
                </MainLayout>
              </DomainGuard>
            }
          />
          <Route
            path="/store"
            element={
              <DomainGuard>
                <MainLayout user={currentUser}>
                  <PageTransition>
                    <StorePage />
                  </PageTransition>
                </MainLayout>
              </DomainGuard>
            }
          />
          <Route
            path="/my-orders"
            element={
              <DomainGuard>
                <MainLayout user={currentUser}>
                  <PageTransition>
                    <MyOrdersPage />
                  </PageTransition>
                </MainLayout>
              </DomainGuard>
            }
          />
          <Route
            path="/support"
            element={
              <DomainGuard>
                <MainLayout user={currentUser}>
                  <PageTransition>
                    <SupportPage />
                  </PageTransition>
                </MainLayout>
              </DomainGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <DomainGuard>
                <MainLayout user={currentUser}>
                  <PageTransition>
                    <ProfilePage />
                  </PageTransition>
                </MainLayout>
              </DomainGuard>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <DomainGuard>
                <ProtectedRoute
                  user={currentUser}
                  requiredRole="admin"
                  onSignInRequired={() => navigate('/sign-in')}
                >
                  <AdminDashboard
                    currentUser={currentUser}
                    pricing={pricing}
                    onPricingUpdate={handlePricingUpdate}
                    onSignOut={handleSignOut}
                  />
                </ProtectedRoute>
              </DomainGuard>
            }
          />

          {/* Developer Routes */}
          <Route
            path="/developer/*"
            element={
              <DomainGuard>
                <ProtectedRoute
                  user={currentUser}
                  requiredRole="developer"
                  onSignInRequired={() => navigate('/sign-in')}
                >
                  <DeveloperDashboard
                    currentUser={currentUser}
                    onSignOut={handleSignOut}
                    darkMode={true}
                    onToggleDarkMode={() => { }}
                  />
                </ProtectedRoute>
              </DomainGuard>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>

      {/* Global Cart Drawer */}
      <CartDrawer />
    </div>
  );
};

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const App: React.FC = () => {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      {...({ navigate: (to: string) => navigate(to) } as any)}
    >
      <AppContent />
    </ClerkProvider>
  );
};

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}