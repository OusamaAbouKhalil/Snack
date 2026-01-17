import React, { useState, useEffect } from 'react';
import { Menu } from './components/Menu';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeToggle } from './components/ThemeToggle';
import { useProducts } from './hooks/useProducts';
import { Coffee } from 'lucide-react';

function GuestApp() {
  const { products, categories, loading, error } = useProducts({ onlyAvailable: true });
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-green-900 dark:to-green-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-red-500 dark:text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Connection Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-cream-200 dark:from-green-900 dark:via-green-800 dark:to-green-700 transition-colors duration-300">
      {/* Simple Header */}
      <header className="bg-white dark:bg-green-900 shadow-sm border-b border-cream-300 dark:border-green-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-green-800 p-1 transition-colors duration-300">
                <img
                  src="/logo.png"
                  alt="Hadi Snack Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-900 dark:text-cream-100 transition-colors duration-300">Hadi Snack</h1>
                <p className="text-sm text-green-700 dark:text-cream-300 transition-colors duration-300">Delicious Snacks & More</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Menu
          products={products}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      </main>
    </div>
  );
}

function AdminApp() {
  const { user, isAdmin, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(!user);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-green-900 dark:to-green-800 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-cream-50 to-cream-100 dark:from-green-900 dark:to-green-800 flex items-center justify-center transition-colors duration-300">
          <div className="text-center bg-white dark:bg-green-900 p-8 rounded-xl shadow-lg border border-cream-300 dark:border-green-700 transition-colors duration-300">
            <div className="bg-primary-100 dark:bg-primary-900 p-4 rounded-full w-20 h-20 mx-auto mb-4 transition-colors duration-300">
              <Coffee className="text-primary-600 dark:text-primary-400 w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 dark:text-cream-100 mb-2">Admin Access Required</h2>
            <p className="text-green-700 dark:text-cream-300 mb-4">Please sign in to access the admin panel</p>
            <button 
              onClick={() => setShowLogin(true)}
              className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
        <LoginModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
        />
      </>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboard onClose={() => window.location.href = '/'} />
    </ProtectedRoute>
  );
}

function AppRouter() {
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  useEffect(() => {
    const checkRoute = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };

    checkRoute();
    window.addEventListener('popstate', checkRoute);
    
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  // Handle client-side routing
  useEffect(() => {
    const handleNavigation = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        setIsAdminRoute(true);
      } else {
        setIsAdminRoute(false);
      }
    };

    // Listen for navigation changes
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);
  
  if (isAdminRoute) {
    return <AdminApp />;
  }
  
  return <GuestApp />;
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;