import { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useSettings } from '../../hooks/useSettings';
import { useLanguage } from '../../contexts/LanguageContext';
import { Checkout } from './Checkout';

interface CartDrawerProps {
  onRequestSignIn: () => void;
}

export function CartDrawer({ onRequestSignIn }: CartDrawerProps) {
  const { items, subtotal, isOpen, closeCart, updateQuantity, removeItem } = useCart();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const [checkingOut, setCheckingOut] = useState(false);

  if (!isOpen) return null;

  const rate = Number(settings?.usd_to_lbp_rate) || 90000;
  const fmt = (n: number) => `$${n.toFixed(2)} / ${Math.round(n * rate).toLocaleString()} LBP`;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeCart} />
      <div className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-cream-50 dark:bg-gray-800 shadow-2xl flex flex-col sm:rounded-s-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-primary-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-display text-xl font-bold text-brown-900 dark:text-gray-100 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <ShoppingBag size={17} className="text-primary-600 dark:text-primary-400" />
            </span>
            {checkingOut ? t('guest.checkout') : t('guest.yourCart')}
          </h2>
          <button
            onClick={() => (checkingOut ? setCheckingOut(false) : closeCart())}
            className="p-2 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-full text-brown-500 dark:text-gray-300 transition-colors"
            aria-label={t('common.close')}
          >
            <X size={20} />
          </button>
        </div>

        {checkingOut ? (
          <Checkout
            onBack={() => setCheckingOut(false)}
            onRequestSignIn={onRequestSignIn}
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <span className="inline-flex w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 items-center justify-center mb-5">
                    <ShoppingBag size={26} className="text-primary-500 dark:text-primary-400" />
                  </span>
                  <p className="text-brown-800 dark:text-gray-300 font-semibold">{t('guest.cartEmpty')}</p>
                  <p className="text-sm text-brown-500 dark:text-gray-400 mt-1">{t('guest.cartEmptyHint')}</p>
                </div>
              ) : (
                items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 bg-white dark:bg-gray-700/50 border border-primary-100 dark:border-gray-700 rounded-2xl p-3 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                      <p className="text-sm text-primary-600 dark:text-primary-400">{fmt(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="p-1.5 rounded-full bg-white dark:bg-gray-600 shadow hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                        aria-label={t('guest.decreaseQty')}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-semibold text-gray-900 dark:text-gray-100">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="p-1.5 rounded-full bg-white dark:bg-gray-600 shadow hover:bg-gray-100 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200"
                        aria-label={t('guest.increaseQty')}
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 ml-1"
                        aria-label={t('guest.removeItem')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 border-t border-primary-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
                <div className="flex justify-between font-bold text-brown-900 dark:text-gray-100 tabular-nums">
                  <span>{t('guest.subtotal')}</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <button
                  onClick={() => setCheckingOut(true)}
                  className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white py-3.5 rounded-full font-bold shadow-md shadow-primary-600/20 transition-all duration-200"
                >
                  {t('guest.checkout')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
