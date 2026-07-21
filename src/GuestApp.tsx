import { useState } from 'react';
import { ShoppingBag, UserCircle, LogIn, MapPin, Phone, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { Menu } from './components/Menu';
import { MenuSkeleton } from './components/MenuSkeleton';
import { ThemeToggle } from './components/ThemeToggle';
import { LanguageToggle } from './components/LanguageToggle';
import { LoginModal } from './components/auth/LoginModal';
import { CartDrawer } from './components/cart/CartDrawer';
import { AccountPanel } from './components/account/AccountPanel';
import { useProducts } from './hooks/useProducts';
import { useBusinessHours } from './hooks/useBusinessHours';
import { computeStoreStatus, formatTime } from './lib/storeHours';
import { useAuth } from './contexts/AuthContext';
import { useCart } from './contexts/CartContext';
import { useLanguage } from './contexts/LanguageContext';
import { useSettings } from './hooks/useSettings';

export function GuestApp() {
  const { products, categories, loading, error } = useProducts({ onlyAvailable: true });
  const { hours } = useBusinessHours();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLogin, setShowLogin] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const { user, customer } = useAuth();
  const { count, openCart } = useCart();
  const { t } = useLanguage();
  const { settings } = useSettings();

  const { isOpen: storeOpen, today: todayHours } = computeStoreStatus(hours);

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-green-50 dark:bg-green-900 flex items-center justify-center transition-colors duration-300 p-4">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-card border border-primary-100 dark:border-gray-700 max-w-md">
          <span className="inline-flex w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-red-500 dark:text-red-400" />
          </span>
          <h2 className="font-display text-2xl font-bold text-brown-900 dark:text-gray-100 mb-2">{t('guest.connectionError')}</h2>
          <p className="text-brown-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-full font-semibold transition-colors"
          >
            <RefreshCw size={16} />
            {t('guest.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-cream-50 to-green-100 dark:from-green-900 dark:via-green-800 dark:to-green-700 transition-colors duration-300">
      <header className="bg-green-50/90 dark:bg-green-900/90 backdrop-blur-lg border-b border-primary-200 dark:border-green-700 transition-colors duration-300 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-3">
              <div className="w-11 h-11 shadow-sm transition-colors duration-300">
                <img src="/logo.png" alt="Mat3amji Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-display block text-2xl font-bold text-brown-900 dark:text-cream-100 leading-none transition-colors duration-300">Mat3amji</span>
                <span className="text-xs font-medium text-primary-700 dark:text-primary-400 transition-colors duration-300 hidden sm:block">{t('guest.tagline')}</span>
              </div>
            </a>

            <div className="flex items-center gap-1 sm:gap-2">
              <LanguageToggle />
              <ThemeToggle />

              {user ? (
                <button
                  onClick={() => setShowAccount(true)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full hover:bg-primary-100/70 dark:hover:bg-gray-800 text-brown-800 dark:text-gray-200 transition-colors"
                  aria-label={t('guest.myAccount')}
                >
                  <UserCircle size={22} className="text-primary-600 dark:text-primary-400" />
                  <span className="hidden sm:block text-sm font-semibold max-w-[110px] truncate">
                    {customer?.name || t('guest.account')}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full hover:bg-primary-100/70 dark:hover:bg-gray-800 text-brown-800 dark:text-gray-200 transition-colors"
                  aria-label={t('guest.signIn')}
                >
                  <LogIn size={20} className="text-primary-600 dark:text-primary-400" />
                  <span className="hidden sm:block text-sm font-semibold">{t('guest.signIn')}</span>
                </button>
              )}

              <button
                onClick={openCart}
                className="relative flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.97] text-white px-3.5 sm:px-5 py-2.5 rounded-full font-bold shadow-md shadow-primary-600/20 transition-all duration-200"
                aria-label={t('guest.openCart')}
              >
                <ShoppingBag size={19} />
                <span className="hidden sm:block text-sm">{t('guest.cart')}</span>
                {count > 0 && (
                  <span className="absolute -top-1.5 -end-1.5 bg-brown-900 dark:bg-cream-100 text-cream-50 dark:text-brown-900 text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 ring-2 ring-cream-50 dark:ring-gray-900">
                    {count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {hours.length > 0 && !storeOpen && (
        <div className="bg-amber-500 text-amber-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2.5 text-sm font-semibold">
            <Clock size={16} className="flex-shrink-0" />
            <span>{t('guest.storeClosed')}</span>
            {todayHours && !todayHours.is_closed && (
              <span className="opacity-80">— {t('guest.storeClosedOpensAt')} {formatTime(todayHours.open_time)}</span>
            )}
          </div>
        </div>
      )}

      <main>
        <Menu
          products={products}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      </main>

      <footer className="bg-cocoa-950 text-cream-200 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11">
                  <img src="/logo.png" alt="Mat3amji Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-display text-2xl font-bold text-cream-50">Mat3amji</span>
              </div>
              <p className="text-cream-200/70 leading-relaxed max-w-xs">{t('guest.footerTagline')}</p>
            </div>

            {settings?.store_address && (
              <div>
                <h3 className="font-display text-lg font-bold text-cream-50 mb-4">{t('guest.findUs')}</h3>
                <p className="flex items-start gap-3 text-cream-200/80">
                  <MapPin size={18} className="text-primary-400 mt-0.5 flex-shrink-0" />
                  {settings.store_address}
                </p>
              </div>
            )}

            {settings?.store_phone && (
              <div>
                <h3 className="font-display text-lg font-bold text-cream-50 mb-4">{t('guest.callUs')}</h3>
                <a
                  href={`tel:${settings.store_phone}`}
                  className="inline-flex items-center gap-3 text-cream-200/80 hover:text-primary-400 transition-colors"
                >
                  <Phone size={18} className="text-primary-400 flex-shrink-0" />
                  <span dir="ltr">{settings.store_phone}</span>
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-cream-200/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-sm text-cream-200/50 text-center">
            © {new Date().getFullYear()} Mat3amji. {t('guest.rights')}
          </div>
        </div>
      </footer>

      <CartDrawer onRequestSignIn={() => setShowLogin(true)} />
      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      {showAccount && <AccountPanel onClose={() => setShowAccount(false)} />}
    </div>
  );
}
