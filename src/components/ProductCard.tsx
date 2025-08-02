import React from 'react';
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
      lbp: `${Math.round(priceLBP).toLocaleString()}`
    };
  };

  const prices = formatDualCurrency(product.price);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100">
      <div className="aspect-video bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-6xl">🍽️</div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              Unavailable
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 mb-2">
          {product.name}
        </h3>
        
        {product.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-primary-600">
            <div className="text-lg font-bold">
              {prices.usd}
            </div>
            <div className="text-sm font-medium text-gray-600">
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