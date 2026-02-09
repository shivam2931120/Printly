import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { StudentPortal } from './components/StudentPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { DeveloperDashboard } from './components/developer/DeveloperDashboard';
import { MyOrdersPage } from './components/user/MyOrdersPage';
import { SupportPage } from './components/user/SupportPage';
import { SignInModal } from './components/auth/SignInModal';
import { User, PricingConfig, DEFAULT_PRICING } from './types';
import { Icon } from './components/ui/Icon';

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
    // Redirect to home or show sign-in, but better to keep them on the current URL structure
    // and just show the modal. For now, we'll redirect to home if they try to access directly without auth.
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
import { useUser, useClerk } from '@clerk/clerk-react';
import { CustomSignIn } from './components/auth/CustomSignIn';
import { CustomSignUp } from './components/auth/CustomSignUp';
import { DomainGuard } from './components/auth/DomainGuard';

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

  // Check if we are in a special view to hide global buttons
  const isDeveloper = location.pathname.startsWith('/developer');

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      Loading...
    </div>;
  }

  return (
    <div className="relative min-h-screen bg-slate-900 text-white font-display">

      {/* Global Controls (Sign Out, Switch View) */}
      {!isDeveloper && currentUser && (
        <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
          <button
            onClick={handleSignOut}
            className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
            title="Sign Out"
          >
            <Icon name="logout" className="text-xl" />
          </button>

          {currentUser?.isAdmin && (
            <button
              onClick={() => navigate(location.pathname.startsWith('/admin') ? '/' : '/admin')}
              className="px-6 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 transition-all flex items-center gap-2"
            >
              <Icon name="swap_horiz" />
              Switch to {location.pathname.startsWith('/admin') ? 'Student' : 'Admin'}
            </button>
          )}
        </div>
      )}

      <Routes>
        {/* Public Routes - Auth */}
        <Route path="/sign-in/*" element={<CustomSignIn />} />
        <Route path="/sign-up/*" element={<CustomSignUp />} />

        {/* Student Routes - Protected by DomainGuard (except for public browsing depending on logic) */}
        {/* User said "if a student tries to buy anything", assuming browsing is allowed. */}
        {/* But we want to enforce domain check on login. DomainGuard checks this. */}
        {/* So wrapping everything else in DomainGuard is safe. */}

        <Route
          path="/"
          element={
            <DomainGuard>
              <StudentPortal
                currentUser={currentUser}
                onSignInClick={() => navigate('/sign-in')}
                pricing={pricing}
              />
            </DomainGuard>
          }
        />
        <Route
          path="/my-orders"
          element={
            <DomainGuard>
              <MyOrdersPage />
            </DomainGuard>
          }
        />
        <Route
          path="/support"
          element={
            <SupportPage />
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
    </div>
  );
};

import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

const ClerkProviderWithRoutes: React.FC = () => {
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

// --- Main App Component ---
const App: React.FC = () => {
  return (
    <Router>
      <ClerkProviderWithRoutes />
    </Router>
  );
};

export default App;