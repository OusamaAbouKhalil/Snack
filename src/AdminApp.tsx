import { useState } from 'react';
import { Coffee } from 'lucide-react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

export default function AdminApp() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(!user);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center transition-colors duration-300">
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
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center transition-colors duration-300">
          <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors duration-300">
            <div className="bg-primary-100 dark:bg-primary-900 p-4 rounded-full w-20 h-20 mx-auto mb-4 transition-colors duration-300">
              <Coffee className="text-primary-600 dark:text-primary-400 w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Admin Access Required</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Please sign in to access the admin panel</p>
            <button
              onClick={() => setShowLogin(true)}
              className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
        <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} allowSignup={false} />
      </>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboard onClose={() => (window.location.href = '/')} />
    </ProtectedRoute>
  );
}
