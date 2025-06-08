import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
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
              ${product.price.toFixed(2)}
            </div>
          </div>
          
          <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
            View Item
          </div>
        </div>
      </div>
    </div>
  );
}