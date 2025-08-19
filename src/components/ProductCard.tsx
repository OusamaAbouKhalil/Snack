import React from 'react';
import { Star, Heart } from 'lucide-react';
import { Product } from '../types';
import { useSettings } from '../hooks/useSettings';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { settings } = useSettings();

  const formatDualCurrency = (priceUSD: number) => {
    const exchangeRate = settings?.usd_to_lbp_rate || 89500;
    const priceLBP = priceUSD * exchangeRate;
    
    return {
      usd: `$${priceUSD.toFixed(2)}`,
      lbp: `${Math.round(priceLBP).toLocaleString()} L.L`
    };
  };

  const prices = formatDualCurrency(product.price);

  return (
    <div className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 hover:scale-105 border border-gray-100 hover:border-primary-200">
      <div className="aspect-video bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="text-6xl opacity-60 group-hover:scale-110 transition-transform duration-300">🍽️</div>
        )}
        
        {/* Favorite Button */}
        <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
          <Heart className="text-gray-600 hover:text-red-500" size={16} />
        </button>
        
        {/* Rating Badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex items-center gap-1">
          </div>
        </div>
        
        {!product.is_available && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
            <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
              Unavailable
            </span>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <h3 className="font-bold text-xl text-gray-800 mb-3 group-hover:text-primary-700 transition-colors duration-300">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}
        
        <div className="flex items-end justify-between">
          <div className="text-primary-600 group-hover:text-primary-700 transition-colors duration-300">
            <div className="text-xl font-bold">
              {prices.usd}
            </div>
            <div className="text-sm font-medium text-gray-500">
              {prices.lbp}
            </div>
          </div>
          
          <button className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
            product.is_available 
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl hover:scale-105' 
              : 'bg-gray-100 text-gray-500 cursor-not-allowed'
          }`}>
            {product.is_available ? 'Add to Cart' : 'Unavailable'}
          </button>
        </div>
        
        {/* Quick Info */}
        <div className="mt-4 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Fresh & Hot
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}