import React from 'react';
import { Plus } from 'lucide-react';
import { Product } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const { formatDualPrice } = useCurrency();

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
      <div className="aspect-video bg-gradient-to-br from-orange-100 to-yellow-100 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-6xl">🥞</div>
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
          <div className="text-orange-600">
            <div className="text-lg font-bold">
              {formatDualPrice(product.price)}
            </div>
          </div>
          
          <button
            onClick={() => onAddToCart(product)}
            className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}