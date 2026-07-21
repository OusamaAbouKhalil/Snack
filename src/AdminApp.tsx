import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLoginPage } from './components/auth/AdminLoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

export default function AdminApp() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 dark:bg-gray-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 dark:border-primary-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // A logged-in customer session isn't an admin session — show the admin
  // sign-in form (which will replace the session on submit) instead of
  // bouncing to the storefront, so staff can log in from a customer device.
  if (!user || !isAdmin) {
    return <AdminLoginPage />;
  }

  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboard onClose={() => (window.location.href = '/')} />
    </ProtectedRoute>
  );
}
