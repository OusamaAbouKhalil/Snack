import { Suspense, lazy, useEffect, useState } from 'react';
import { GuestApp } from './GuestApp';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/ConfirmDialog';

// Admin bundle (charts, exports, dashboards) is lazy-loaded so guests never download it.
const AdminApp = lazy(() => import('./AdminApp'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 dark:border-primary-400"></div>
    </div>
  );
}

function AppRouter() {
  const [isAdminRoute, setIsAdminRoute] = useState(() =>
    window.location.pathname.startsWith('/admin')
  );

  useEffect(() => {
    const checkRoute = () =>
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  if (isAdminRoute) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <AdminApp />
      </Suspense>
    );
  }

  return <GuestApp />;
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <CartProvider>
                <AppRouter />
              </CartProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
