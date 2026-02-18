import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { User, PricingConfig, DEFAULT_PRICING } from './types';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/layout/PageTransition';
import { MainLayout } from './components/layout/MainLayout';
import { CartDrawer } from './components/layout/CartDrawer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LockScreen } from './components/auth/LockScreen';
import { startAutoLockMonitor, isAppLocked, clearAdminVerification } from './lib/biometricAuth';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

// ===== Lazy-loaded route components =====
const StudentPortal = lazy(() => import('./components/StudentPortal').then(m => ({ default: m.StudentPortal })));
const StorePage = lazy(() => import('./components/StorePage').then(m => ({ default: m.StorePage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const DeveloperDashboard = lazy(() => import('./components/developer/DeveloperDashboard').then(m => ({ default: m.DeveloperDashboard })));
const MyOrdersPage = lazy(() => import('./components/user/MyOrdersPage').then(m => ({ default: m.MyOrdersPage })));
// SupportPage removed — users use /contact instead
const ProfilePage = lazy(() => import('./components/user/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CustomSignIn = lazy(() => import('./components/auth/CustomSignIn').then(m => ({ default: m.CustomSignIn })));
const CustomSignUp = lazy(() => import('./components/auth/CustomSignUp').then(m => ({ default: m.CustomSignUp })));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));
const ContactPage = lazy(() => import('./components/ContactPage').then(m => ({ default: m.ContactPage })));
const NotFound = lazy(() => import('./components/NotFound').then(m => ({ default: m.NotFound })));

// ===== Full-screen loading spinner =====
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
    <div className="size-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
  </div>
);

// ===== Protected Route =====
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

  if (!isLoaded) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (requiredRole === 'admin' && !user.isAdmin) {
    return <Navigate to={user.isDeveloper ? '/developer' : '/'} replace />;
  }

  if (requiredRole === 'developer' && !user.isDeveloper) {
    return <Navigate to={user.isAdmin ? '/admin' : '/'} replace />;
  }

  return <>{children}</>;
};

// ===== Home route: inline redirect for admin/developer =====
const HomeRoute: React.FC<{
  currentUser: User | null;
  pricing: PricingConfig;
}> = ({ currentUser, pricing }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ?view=student bypasses the auto-redirect so devs/admins can see Student Portal
  const forceStudent = searchParams.get('view') === 'student';

  if (!forceStudent) {
    if (currentUser?.isDeveloper) {
      return <Navigate to="/developer" replace />;
    }
    if (currentUser?.isAdmin) {
      return <Navigate to="/admin" replace />;
    }
  }

  return (
    <MainLayout user={currentUser}>
      <PageTransition>
        <StudentPortal
          pricing={pricing}
          currentUser={currentUser}
          onSignInClick={() => navigate('/sign-in')}
        />
      </PageTransition>
    </MainLayout>
  );
};

// ===== Auth redirect: if signed in, bounce away from auth pages =====
const AuthRoute: React.FC<{
  children: React.ReactNode;
  currentUser: User | null;
}> = ({ children, currentUser }) => {
  if (currentUser) {
    if (currentUser.isDeveloper) return <Navigate to="/developer" replace />;
    if (currentUser.isAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// ===== Main App Content =====
const AppContent: React.FC = () => {
  const { user: currentUser, isLoaded, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [locked, setLocked] = useState(() => isAppLocked());

  // Auto-lock monitor — only active in PWA mode with biometric enabled
  useEffect(() => {
    if (!currentUser) return;

    const cleanup = startAutoLockMonitor(() => {
      setLocked(true);
    });

    return cleanup;
  }, [currentUser?.id]);

  const handleSignOut = async () => {
    clearAdminVerification();
    await signOut();
    navigate('/');
  };

  if (!isLoaded) {
    return <LoadingSpinner />;
  }

  // Show lock screen overlay
  if (locked && currentUser) {
    return <LockScreen onUnlock={() => setLocked(false)} />;
  }

  return (
    <div className="relative min-h-screen bg-background text-white font-sans selection:bg-white/20">
      <Suspense fallback={<LoadingSpinner />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Auth Routes — redirect away if already signed in */}
            <Route path="/sign-in" element={<AuthRoute currentUser={currentUser}><CustomSignIn /></AuthRoute>} />
            <Route path="/sign-up" element={<AuthRoute currentUser={currentUser}><CustomSignUp /></AuthRoute>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<Navigate to="/" replace />} />

            {/* Home — inline redirect for admin/developer, no flash */}
            <Route path="/" element={<HomeRoute currentUser={currentUser} pricing={pricing} />} />

            {/* Student Routes */}
            <Route path="/store" element={<MainLayout user={currentUser}><PageTransition><StorePage /></PageTransition></MainLayout>} />
            <Route path="/my-orders" element={<MainLayout user={currentUser}><PageTransition><MyOrdersPage /></PageTransition></MainLayout>} />
            {/* /support removed — redirects to /contact */}
            <Route path="/support" element={<Navigate to="/contact" replace />} />
            <Route path="/contact" element={<PageTransition><ContactPage /></PageTransition>} />
            <Route path="/profile" element={<MainLayout user={currentUser}><PageTransition><ProfilePage /></PageTransition></MainLayout>} />

            {/* Admin */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute user={currentUser} isLoaded={isLoaded} requiredRole="admin">
                  <AdminDashboard
                    currentUser={currentUser}
                    pricing={pricing}
                    onPricingUpdate={setPricing}
                    onSignOut={handleSignOut}
                  />
                </ProtectedRoute>
              }
            />

            {/* Developer */}
            <Route
              path="/developer/*"
              element={
                <ProtectedRoute user={currentUser} isLoaded={isLoaded} requiredRole="developer">
                  <DeveloperDashboard
                    currentUser={currentUser}
                    onSignOut={handleSignOut}
                  />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </Suspense>

      <CartDrawer />
    </div>
  );
};

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        appearance={{
          variables: {
            colorPrimary: '#ffffff',
            colorBackground: '#0a0a0a',
            colorText: '#ffffff',
            colorTextSecondary: '#888888',
            colorInputBackground: 'rgba(255,255,255,0.05)',
            colorInputText: '#ffffff',
            borderRadius: '1rem',
          },
        }}
      >
        <Router>
          <AuthProvider>
            <Toaster position="top-right" richColors />
            <AppContent />
          </AuthProvider>
        </Router>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
