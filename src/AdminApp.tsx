import React, { useState } from 'react';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Coffee } from 'lucide-react';

function AdminAppContent() {
  const { user, isAdmin, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(!user);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
          <div className="text-center bg-white p-8 rounded-xl shadow-lg">
            <div className="bg-orange-100 p-4 rounded-full w-20 h-20 mx-auto mb-4">
              <Coffee className="text-orange-600 w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Admin Access Required</h2>
            <p className="text-gray-600 mb-4">Please sign in to access the admin panel</p>
            <button 
              onClick={() => setShowLogin(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
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

export function AdminApp() {
  return (
    <AuthProvider>
      <AdminAppContent />
    </AuthProvider>
  );
}