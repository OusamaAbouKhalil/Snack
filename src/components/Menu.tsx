import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from './ProductCard';

interface MenuProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

export function Menu({ products, categories, selectedCategory, onCategorySelect }: MenuProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('cold') || name.includes('appetizer')) return '🥗';
    if (name.includes('hot') || name.includes('appetizer')) return '🍤';
    if (name.includes('salad')) return '🥬';
    if (name.includes('mashawi') || name.includes('grill')) return '🍖';
    if (name.includes('chicken')) return '🍗';
    if (name.includes('sweet') || name.includes('dessert')) return '🧁';
    if (name.includes('drink') || name.includes('beverage')) return '🥤';
    return '🍽️';
  };

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const handleResize = () => checkScrollButtons();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [categories]);

  const filteredProducts = selectedCategory === 'all' 
    ? products.filter(p => p.is_available)
    : products.filter(p => p.is_available && p.category_id === selectedCategory);

  const allCategories = [
    { id: 'all', name: 'All Items', display_order: -1, created_at: '' },
    ...categories
  ];

  return (
    <div className="min-h-screen">
      {/* Sticky Category Navigation */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="relative">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
          )}

          {/* Categories Container */}
          <div
            ref={scrollRef}
            onScroll={checkScrollButtons}
            className="flex gap-4 px-6 py-4 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {allCategories
              .sort((a, b) => a.display_order - b.display_order)
              .map((category) => (
                <button
                  key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${
                      selectedCategory === category.id
                        ? 'bg-primary-400 shadow-lg scale-110 ring-2 ring-primary-300'
                        : 'bg-gray-100 hover:bg-gray-200 group-hover:scale-105'
                    }`}
                  >
                    {getCategoryIcon(category.name)}
                  </div>
                  <span
                    className={`text-sm font-medium text-center min-w-0 max-w-[80px] leading-tight transition-colors ${
                      selectedCategory === category.id
                        ? 'text-primary-700'
                        : 'text-gray-600 group-hover:text-gray-800'
                    }`}
                  >
                    {category.name}
                  </span>
                </button>
              ))}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={scrollRight}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-6">
        {/* Category Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-brown-900 mb-2">
            {allCategories.find(c => c.id === selectedCategory)?.name || 'All Items'}
          </h2>
          <p className="text-gray-600">
            {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No items available</h3>
            <p className="text-gray-600">
              {selectedCategory === 'all' 
                ? 'No products are currently available.' 
                : 'No items in this category are currently available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}