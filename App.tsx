import React, { useState } from 'react';
import { StudentPortal } from './components/StudentPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { DeveloperDashboard } from './components/developer/DeveloperDashboard';
import { MyOrdersPage } from './components/user/MyOrdersPage';
import { SupportPage } from './components/user/SupportPage';
import { SignInModal } from './components/auth/SignInModal';
import { ViewMode, User, PricingConfig, DEFAULT_PRICING } from './types';
import { Icon } from './components/ui/Icon';

type PageView = 'home' | 'orders' | 'support';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('student');
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  // Dark mode is globally enforced.

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  // Removed localStorage loading effects.

  const handleViewSwitch = () => {
    if (view === 'student') {
      if (!currentUser) {
        setShowSignIn(true);
        return;
      }
      if (!currentUser.isAdmin) {
        alert('You need admin access to view this section.');
        return;
      }
      setView('admin');
    } else {
      setView('student');
      setCurrentPage('home');
    }
  };

  const handleSignIn = (userData: { email: string; name: string; isAdmin: boolean; isDeveloper?: boolean }) => {
    // Session-only auth for now
    const user: User = {
      id: `user_${Date.now()}`,
      email: userData.email,
      name: userData.name,
      isAdmin: userData.isAdmin,
      isDeveloper: userData.isDeveloper,
    };
    setCurrentUser(user);
    setShowSignIn(false);

    if (userData.isDeveloper) {
      setView('developer');
    } else if (userData.isAdmin && view === 'student') {
      setView('admin');
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setView('student');
    setCurrentPage('home');
  };

  const handlePageChange = (page: PageView) => {
    setCurrentPage(page);
  };

  const handlePricingUpdate = (newPricing: PricingConfig) => {
    setPricing(newPricing);
  };

  const renderStudentContent = () => {
    switch (currentPage) {
      case 'orders':
        return <MyOrdersPage onBack={() => setCurrentPage('home')} />;
      case 'support':
        return <SupportPage onBack={() => setCurrentPage('home')} />;
      default:
        return (
          <StudentPortal
            onNavigate={handlePageChange}
            currentUser={currentUser}
            onSignInClick={() => setShowSignIn(true)}
            pricing={pricing}
          />
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-900 text-white">
      <SignInModal
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSignIn={handleSignIn}
      />

      {view !== 'developer' && (
        <div className="fixed bottom-6 right-6 z-[100] flex gap-2">
          {currentUser && (
            <button
              onClick={handleSignOut}
              className="p-3 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"
              title="Sign Out"
            >
              <Icon name="logout" className="text-xl" />
            </button>
          )}

          {currentUser?.isAdmin && (
            <button
              onClick={handleViewSwitch}
              className="px-6 py-3 bg-primary text-white font-bold rounded-full shadow-lg shadow-primary/30 hover:bg-primary-hover hover:scale-105 transition-all flex items-center gap-2"
            >
              <Icon name="swap_horiz" />
              Switch to {view === 'admin' ? 'Student' : 'Admin'}
            </button>
          )}
        </div>
      )}

      {view === 'developer' ? (
        <DeveloperDashboard
          currentUser={currentUser}
          onSignOut={handleSignOut}
          darkMode={true}
          onToggleDarkMode={() => { }}
          onNavigate={(view) => setView(view)}
        />
      ) : view === 'student' ? (
        renderStudentContent()
      ) : (
        <AdminDashboard
          currentUser={currentUser}
          pricing={pricing}
          onPricingUpdate={handlePricingUpdate}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
};

export default App;