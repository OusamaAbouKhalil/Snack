import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Product, Category } from '../types';
import { useProductImages } from '../hooks/useProductImages';

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
  
  // Lazy load images for visible products
  const productIds = useMemo(() => {
    return products.map(p => p.id);
  }, [products]);
  
  const { imageMap, registerElement } = useProductImages(productIds);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 200);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => checkScrollButtons(), [categories]);

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
      const newScrollLeft =
        direction === 'left'
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('waffle')) return '🧇';
    if (lower.includes('pancake')) return '🥞';
    if (lower.includes('crepe') || lower.includes('sweet')) return '🫓';
    if (lower.includes('beverage') || lower.includes('drink')) return '🥤';
    if (lower.includes('add-on') || lower.includes('addon')) return '🍯';
    if (lower.includes('appetizer') || lower.includes('cold')) return '🥗';
    if (lower.includes('hot')) return '🍤';
    if (lower.includes('salad')) return '🥬';
    if (lower.includes('hookah')) return '🚬';
    if (lower.includes('mashawi') || lower.includes('grill')) return '🍖';
    if (lower.includes('chicken')) return '🍗';
    return '🍽️';
  };

  // Products are already filtered if useProducts onlyAvailable is true
  const availableProducts = useMemo(() => products, [products]);

  // Group products by category for "All Items" - memoized
  const groupedProducts = useMemo(() => availableProducts.reduce((acc, product) => {
    const category = categories.find(cat => cat.id === product.category_id);
    const categoryName = category ? category.name : 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = { id: product.category_id, products: [] };
    }
    acc[categoryName].products.push(product);
    return acc;
  }, {} as Record<string, { id: string; products: Product[] }>), [availableProducts]);

  // Sort categories, placing "Add-ons" and "Hookah" last - memoized
  const sortedCategories = useMemo(() => Object.entries(groupedProducts).sort(([a], [b]) => {
    const isAAddon = a.toLowerCase().includes('add-on') || a.toLowerCase().includes('addon');
    const isBAddon = b.toLowerCase().includes('add-on') || b.toLowerCase().includes('addon');
    const isAHookah = a.toLowerCase().includes('hookah');
    const isBHookah = b.toLowerCase().includes('hookah');

    // Place Hookah after Add-ons, and both after other categories
    if (isAHookah && !isBHookah && !isBAddon) return 1; // Hookah after non-Hookah/non-Add-ons
    if (!isAHookah && !isAAddon && isBHookah) return -1; // Non-Hookah/non-Add-ons before Hookah
    if (isAAddon && !isBAddon && !isBHookah) return 1; // Add-ons after non-Add-ons/non-Hookah
    if (!isAAddon && !isAHookah && isBAddon) return -1; // Non-Add-ons/non-Hookah before Add-ons
    if (isAAddon && isBHookah) return -1; // Add-ons before Hookah
    if (isAHookah && isBAddon) return 1; // Hookah after Add-ons
    return a.localeCompare(b); // Alphabetical sort for same type or non-Add-ons/non-Hookah
  }), [groupedProducts]);

  // Memoize filtered products
  const filteredProducts = useMemo(() =>
    selectedCategory === 'all'
      ? availableProducts
      : products.filter(p => p.category_id === selectedCategory && p.is_available),
    [selectedCategory, availableProducts, products]
  );

  const selectedCategoryName = useMemo(() =>
    selectedCategory === 'all'
      ? 'All Items'
      : categories.find(cat => cat.id === selectedCategory)?.name || 'Unknown',
    [selectedCategory, categories]
  );

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 py-12 mb-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="text-primary-500 dark:text-primary-400" size={32} />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent">
              Our Delicious Menu
            </h1>
            <Sparkles className="text-primary-500 dark:text-primary-400" size={32} />
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
            Discover our carefully crafted selection of authentic Lebanese delicacies,
            made with the finest ingredients and traditional recipes passed down through generations.
          </p>
        </div>
      </div>

      {/* Categories Navigation */}
      <div
        className={`transition-all duration-500 ease-in-out z-40 ${
          isSticky
            ? 'fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg shadow-xl border-b border-primary-100 dark:border-gray-700'
            : 'relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
          <div className="relative py-2">
            {canScrollLeft && (
              <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-700 shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-600 rounded-full p-2 transition-all duration-300 hover:scale-110 hover:bg-primary-50 dark:hover:bg-gray-600"
              >
                <ChevronLeft className="text-primary-600 dark:text-primary-400" size={18} />
              </button>
            )}

            <div
              ref={scrollContainerRef}
              onScroll={checkScrollButtons}
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-5"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <button
                onClick={() => onCategorySelect('all')}
                className={`flex-shrink-0 flex flex-col items-center gap-2.5 p-2.5 rounded-xl transition-all duration-300 group ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white shadow-md scale-105 ring-2 ring-primary-200 dark:ring-primary-700'
                    : 'bg-white dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 hover:text-primary-700 dark:hover:text-primary-400 shadow-sm hover:shadow-md hover:scale-105 border border-gray-100 dark:border-gray-600'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                    selectedCategory === 'all'
                      ? 'bg-white/20 backdrop-blur-sm'
                      : 'bg-primary-100 dark:bg-primary-900/50 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50'
                  }`}
                >
                  🍽️
                </div>
                <span className="font-medium text-xs whitespace-nowrap">All Items</span>
              </button>

              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => onCategorySelect(cat.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-2.5 p-2.5 rounded-xl transition-all duration-300 group ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 text-white shadow-md scale-105 ring-2 ring-primary-200 dark:ring-primary-700'
                      : 'bg-white dark:bg-gray-700 hover:bg-primary-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 hover:text-primary-700 dark:hover:text-primary-400 shadow-sm hover:shadow-md hover:scale-105 border border-gray-100 dark:border-gray-600'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all duration-300 ${
                      selectedCategory === cat.id
                        ? 'bg-white/20 backdrop-blur-sm'
                        : 'bg-primary-100 dark:bg-primary-900/50 group-hover:bg-primary-200 dark:group-hover:bg-primary-800/50'
                    }`}
                  >
                    {getCategoryIcon(cat.name)}
                  </div>
                  <span className="font-medium text-xs whitespace-nowrap">{cat.name}</span>
                </button>
              ))}
            </div>

            {canScrollRight && (
              <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-700 shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-600 rounded-full p-2 transition-all duration-300 hover:scale-110 hover:bg-primary-50 dark:hover:bg-gray-600"
              >
                <ChevronRight className="text-primary-600 dark:text-primary-400" size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {isSticky && <div className="h-20"></div>}

      {/* Menu Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full px-5 py-2.5 shadow-lg border border-primary-100 dark:border-gray-700 transition-colors duration-300">
            <span className="text-xl">{getCategoryIcon(selectedCategoryName)}</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-300">{selectedCategoryName}</h2>
            <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-300">
              {filteredProducts.length} items
            </span>
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          selectedCategory === 'all' ? (
            <div className="space-y-12">
              {sortedCategories.map(([categoryName, { id, products }], index) => (
                <div key={id}>
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-full px-5 py-2.5 shadow-lg border border-primary-100 dark:border-gray-700 transition-colors duration-300">
                      <span className="text-xl">{getCategoryIcon(categoryName)}</span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 transition-colors duration-300">{categoryName}</h3>
                      <span className="bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-300">
                        {products.length} items
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map((product, i) => (
                      <div
                        key={product.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <ProductCard 
                          product={product} 
                          imageUrl={imageMap[product.id] || undefined}
                          onImageElementReady={registerElement}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredProducts.map((product, i) => (
                <div
                  key={product.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                      <ProductCard 
                        product={product} 
                        imageUrl={imageMap[product.id] || undefined}
                        onImageElementReady={registerElement}
                      />
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl p-12 max-w-md mx-auto transition-colors duration-300">
              <div className="text-6xl mb-6 opacity-50">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 transition-colors duration-300">No items available</h3>
              <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
                We're currently updating this category. Please check back soon or explore other categories.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}