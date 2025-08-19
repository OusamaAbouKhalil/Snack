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
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            product.is_available 
              ? 'bg-green-100 text-green-600' 
              : 'bg-red-100 text-red-600'
          }`}>
            {product.is_available ? 'Available' : 'Unavailable'}
          </div>
        </div>
      </div>
    </div>
  );
}