import React, { useState, useEffect } from 'react';
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
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);

  // Load user and pricing from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('printwise_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        // Auto-switch view based on user role
        if (user.isDeveloper) {
          setView('developer');
        } else if (user.isAdmin) {
          setView('admin');
        }
      } catch (e) {
        localStorage.removeItem('printwise_user');
      }
    }

    const savedPricing = localStorage.getItem('printwise_pricing');
    if (savedPricing) {
      try {
        setPricing(JSON.parse(savedPricing));
      } catch (e) {
        localStorage.removeItem('printwise_pricing');
      }
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleViewSwitch = () => {
    if (view === 'student') {
      // Check if user is admin before switching
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
    const user: User = {
      id: `user_${Date.now()}`,
      email: userData.email,
      name: userData.name,
      isAdmin: userData.isAdmin,
      isDeveloper: userData.isDeveloper,
    };
    setCurrentUser(user);
    setShowSignIn(false);

    // Auto-switch to developer if user is developer
    if (userData.isDeveloper) {
      setView('developer');
    } else if (userData.isAdmin && view === 'student') {
      setView('admin');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('printwise_user');
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
    <div className="relative">
      {/* Sign In Modal */}
      <SignInModal
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSignIn={handleSignIn}
      />

      {/* Floating Controls - hide in developer view */}
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
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform"
            title="Toggle Dark Mode"
          >
            <Icon name={darkMode ? 'light_mode' : 'dark_mode'} className="text-xl" />
          </button>
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

      {/* Main Content */}
      {view === 'developer' ? (
        <DeveloperDashboard
          currentUser={currentUser}
          onSignOut={handleSignOut}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
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