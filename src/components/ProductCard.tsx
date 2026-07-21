import { useMemo, useRef, useEffect } from 'react';
import { Plus, Croissant } from 'lucide-react';
import { Product } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useCart } from '../contexts/CartContext';
import { useToast } from './ui/Toast';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductCardProps {
  product: Product;
  imageUrl?: string | null;
  onImageElementReady?: (productId: string, element: HTMLDivElement | null) => void;
}

export function ProductCard({ product, imageUrl, onImageElementReady }: ProductCardProps) {
  const { settings } = useSettings();
  const { addItem } = useCart();
  const { success } = useToast();
  const { t } = useLanguage();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleAdd = () => {
    addItem(product);
    success(`${product.name} ${t('guest.addedToCart')}`);
  };

  useEffect(() => {
    if (onImageElementReady && imageContainerRef.current) {
      onImageElementReady(product.id, imageContainerRef.current);
    }
    return () => {
      if (onImageElementReady) {
        onImageElementReady(product.id, null);
      }
    };
  }, [product.id, onImageElementReady]);

  const prices = useMemo(() => {
    const exchangeRate = settings?.usd_to_lbp_rate || 90000;
    const priceLBP = product.price * exchangeRate;

    return {
      usd: `$${product.price.toFixed(2)}`,
      lbp: `${Math.round(priceLBP).toLocaleString()} L.L`
    };
  }, [product.price, settings?.usd_to_lbp_rate]);

  // Use provided imageUrl, fallback to product.image_url, or null
  const displayImageUrl = imageUrl !== undefined && imageUrl !== null ? imageUrl : (product.image_url || null);

  return (
    <div className="group h-full flex flex-col bg-white dark:bg-gray-800 rounded-3xl shadow-card overflow-hidden hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 border border-primary-100/80 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600">
      <div
        ref={imageContainerRef}
        className="aspect-[4/3] bg-gradient-to-br from-cream-100 to-primary-100 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden transition-colors duration-300"
      >
        {displayImageUrl ? (
          <>
            <img
              key={displayImageUrl}
              src={displayImageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Croissant size={56} className="text-primary-300 dark:text-gray-600 group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
          </div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              {t('guest.unavailable')}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5">
        <h3 className="font-display font-bold text-lg text-brown-900 dark:text-gray-100 mb-1.5 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors duration-300">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-brown-600/90 dark:text-gray-300 text-sm mb-4 line-clamp-2 leading-relaxed transition-colors duration-300">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-bold text-primary-700 dark:text-primary-400 tabular-nums">
              {prices.usd}
            </div>
            <div className="text-xs font-medium text-brown-500 dark:text-gray-400 tabular-nums">
              {prices.lbp}
            </div>
          </div>

          {product.is_available ? (
            <button
              onClick={handleAdd}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white ps-3.5 pe-4 py-2.5 rounded-full text-sm font-bold shadow-md shadow-primary-600/20 hover:shadow-lg transition-all duration-200"
              aria-label={`${t('guest.addToCart')} ${product.name}`}
            >
              <Plus size={16} />
              {t('guest.addToCart')}
            </button>
          ) : (
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
              {t('guest.unavailable')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
