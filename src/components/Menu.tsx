import React from 'react';
import { ProductCard } from './ProductCard';
import { Product, Category } from '../types';

interface MenuProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

export function Menu({ products, categories, selectedCategory, onCategorySelect }: MenuProps) {
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category_id === selectedCategory);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Our Menu</h2>
        <p className="text-gray-600 mb-6">Discover our delicious selection of crepes and treats</p>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategorySelect('all')}
            className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
            }`}
          >
            All Items
          </button>
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-lg font-medium">No products found in this category</p>
          <p className="text-sm">Try selecting a different category</p>
        </div>
      )}
    </div>
  );
}