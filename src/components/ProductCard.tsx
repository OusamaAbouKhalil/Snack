import React, { useMemo, useRef, useEffect } from 'react';
import { Star, Heart } from 'lucide-react';
import { Product } from '../types';
import { useSettings } from '../hooks/useSettings';

interface ProductCardProps {
  product: Product;
  imageUrl?: string | null;
  onImageElementReady?: (productId: string, element: HTMLDivElement | null) => void;
}

export function ProductCard({ product, imageUrl, onImageElementReady }: ProductCardProps) {
  const { settings } = useSettings();
  const imageContainerRef = useRef<HTMLDivElement>(null);

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
  // If imageUrl is explicitly null/undefined from hook, use it; otherwise fallback to product.image_url
  const displayImageUrl = imageUrl !== undefined && imageUrl !== null ? imageUrl : (product.image_url || null);
  

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-600">
      <div 
        ref={imageContainerRef}
        className="aspect-video bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center relative overflow-hidden transition-colors duration-300"
      >
        {displayImageUrl ? (
          <img
            key={displayImageUrl}
            src={displayImageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-300">🍽️</div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black bg-opacity-60 dark:bg-opacity-70 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              Unavailable
            </span>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 mb-3 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors duration-300">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2 leading-relaxed transition-colors duration-300">
            {product.description}
          </p>
        )}
        
        <div className="flex items-end justify-between">
          <div className="text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors duration-300">
            <div className="text-xl font-bold">
              {prices.usd}
            </div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {prices.lbp}
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-300 ${
            product.is_available 
              ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
          }`}>
            {product.is_available ? 'Available' : 'Unavailable'}
          </div>
        </div>
      </div>
    </div>
  );
}