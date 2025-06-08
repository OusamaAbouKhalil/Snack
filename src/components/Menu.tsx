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
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Our Menu</h2>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onCategorySelect('all')}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items
          </button>
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <p className="text-lg">No products found in this category</p>
        </div>
      )}
    </div>
  );
}