import React, { useState } from 'react';
import { Menu } from './components/Menu';
import { Cart } from './components/Cart';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LoginModal } from './components/auth/LoginModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { CurrencyToggle } from './components/CurrencyToggle';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { useProducts } from './hooks/useProducts';
import { useOrders } from './hooks/useOrders';
import { Product, CartItem } from './types';
import { ShoppingBag, Coffee, Settings, LogIn, LogOut, User } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, signOut } = useAuth();
  const { products, categories, loading, error } = useProducts();
  const { createOrder, loading: orderLoading } = useOrders();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const addToCart = (product: Product) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (!user) {
      setShowLogin(true);
      return;
    }
    setShowCheckout(true);
  };

  const handleOrderComplete = async (customerName: string, paymentMethod: string) => {
    const orderId = await createOrder(cartItems, customerName, paymentMethod);
    
    if (orderId) {
      setCartItems([]);
      setShowCheckout(false);
    }
  };

  const handleAdminAccess = () => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    if (!isAdmin) {
      alert('You do not have admin access. Please contact an administrator.');
      return;
    }
    setShowAdmin(true);
  };

  if (showAdmin) {
    return (
      <ProtectedRoute requireAdmin>
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your crepe store...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 p-2 rounded-xl">
                <Coffee className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Crêpe Café</h1>
                <p className="text-sm text-gray-600">Point of Sale System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <CurrencyToggle />
              
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-blue-100 px-3 py-2 rounded-full">
                    <User className="text-blue-600\" size={16} />
                    <span className="text-sm font-medium text-blue-800">{user.email}</span>
                  </div>
                  
                  {isAdmin && (
                    <button
                      onClick={handleAdminAccess}
                      className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors"
                    >
                      <Settings className="text-gray-600" size={20} />
                      <span className="font-medium text-gray-700">Admin</span>
                    </button>
                  )}
                  
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-full transition-colors"
                  >
                    <LogOut className="text-red-600" size={20} />
                    <span className="font-medium text-red-700">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-full transition-colors"
                >
                  <LogIn className="text-blue-600" size={20} />
                  <span className="font-medium text-blue-700">Sign In</span>
                </button>
              )}
              
              <div className="flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full">
                <ShoppingBag className="text-orange-600" size={20} />
                <span className="font-medium text-orange-800">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Section */}
          <div className="lg:col-span-2">
            <Menu
              products={products}
              categories={categories}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
              onAddToCart={addToCart}
            />
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Cart
                items={cartItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
      />

      {showCheckout && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          cartItems={cartItems}
          onOrderComplete={handleOrderComplete}
          loading={orderLoading}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <AppContent />
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;