import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Product, Category } from '../types';

interface MenuProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

export function Menu({ products, categories, selectedCategory, onCategorySelect }: MenuProps) {
  const [isSticky, setIsSticky] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsSticky(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    checkScrollButtons();
  }, [categories]);

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('waffle')) return '🧇';
    if (name.includes('pancake')) return '🥞';
    if (name.includes('crepe') || name.includes('sweet')) return '🧁';
    if (name.includes('beverage') || name.includes('drink')) return '🥤';
    if (name.includes('add-on') || name.includes('addon')) return '🍯';
    if (name.includes('appetizer') || name.includes('cold')) return '🥗';
    if (name.includes('hot')) return '🍤';
    if (name.includes('salad')) return '🥬';
    if (name.includes('mashawi') || name.includes('grill')) return '🍖';
    if (name.includes('chicken')) return '🍗';
    return '🍽️';
  };

  const filteredProducts = selectedCategory === 'all' 
    ? products.filter(p => p.is_available)
    : products.filter(product => product.category_id === selectedCategory && product.is_available);

  const selectedCategoryName = selectedCategory === 'all' 
    ? 'All Items' 
    : categories.find(cat => cat.id === selectedCategory)?.name || 'Unknown';

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="text-primary-500" size={32} />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              Our Delicious Menu
            </h1>
            <Sparkles className="text-primary-500" size={32} />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Discover our carefully crafted selection of authentic Lebanese delicacies, 
            made with the finest ingredients and traditional recipes passed down through generations.
          </p>
        </div>
      </div>

      {/* Categories Navigation */}
      <div className={`transition-all duration-500 ease-in-out z-40 ${
        isSticky 
          ? 'fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg shadow-xl border-b border-primary-100' 
          : 'relative bg-white/80 backdrop-blur-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative py-6">
            {/* Scroll Left Button */}
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg hover:shadow-xl border border-gray-200 rounded-full p-3 transition-all duration-300 hover:scale-110 hover:bg-primary-50"
              >
                <ChevronLeft className="text-primary-600" size={20} />
              </button>
            )}

            {/* Categories Container */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScrollButtons}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth px-12"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* All Items Category */}
              <button
                onClick={() => onCategorySelect('all')}
                className={`flex-shrink-0 flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl scale-110 ring-4 ring-primary-200'
                    : 'bg-white hover:bg-primary-50 text-gray-700 hover:text-primary-700 shadow-md hover:shadow-lg hover:scale-105 border border-gray-100'
                }`}
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 backdrop-blur-sm'
                    : 'bg-primary-100 group-hover:bg-primary-200'
                }`}>
                  🍽️
                </div>
                <span className="font-semibold text-sm whitespace-nowrap">All Items</span>
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  selectedCategory === 'all' ? 'bg-white' : 'bg-transparent'
                }`} />
              </button>

              {/* Category Items */}
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xl scale-110 ring-4 ring-primary-200'
                      : 'bg-white hover:bg-primary-50 text-gray-700 hover:text-primary-700 shadow-md hover:shadow-lg hover:scale-105 border border-gray-100'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                    selectedCategory === category.id
                      ? 'bg-white/20 backdrop-blur-sm'
                      : 'bg-primary-100 group-hover:bg-primary-200'
                  }`}>
                    {getCategoryIcon(category.name)}
                  </div>
                  <span className="font-semibold text-sm whitespace-nowrap">{category.name}</span>
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    selectedCategory === category.id ? 'bg-white' : 'bg-transparent'
                  }`} />
                </button>
              ))}
            </div>

            {/* Scroll Right Button */}
            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg hover:shadow-xl border border-gray-200 rounded-full p-3 transition-all duration-300 hover:scale-110 hover:bg-primary-50"
              >
                <ChevronRight className="text-primary-600" size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add spacing when categories are sticky */}
      {isSticky && <div className="h-24"></div>}

      {/* Menu Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-lg border border-primary-100">
            <span className="text-2xl">{getCategoryIcon(selectedCategoryName)}</span>
            <h2 className="text-2xl font-bold text-gray-800">{selectedCategoryName}</h2>
            <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm font-semibold">
              {filteredProducts.length} items
            </span>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-12 max-w-md mx-auto">
              <div className="text-6xl mb-6 opacity-50">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No items available</h3>
              <p className="text-gray-600">
                We're currently updating this category. Please check back soon or explore other categories.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}