import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Flame,
  Leaf,
  Bike,
  Gift,
  Salad,
  Beef,
  Drumstick,
  Wind,
  Sparkles,
  CupSoda,
  Coffee,
  Layers,
  LayoutGrid,
  UtensilsCrossed,
  LucideIcon,
} from 'lucide-react';
import { ProductCard } from './ProductCard';
import { Product, Category } from '../types';
import { useProductImages } from '../hooks/useProductImages';
import { useLanguage } from '../contexts/LanguageContext';

interface MenuProps {
  products: Product[];
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
}

const HERO_IMAGES = {
  burgerMain:
    'https://images.pexels.com/photos/70497/pexels-photo-70497.jpeg?auto=compress&cs=tinysrgb&w=900',
  friesSide:
    'https://images.pexels.com/photos/115740/pexels-photo-115740.jpeg?auto=compress&cs=tinysrgb&w=600',
  drinkSide:
    'https://images.pexels.com/photos/1233319/pexels-photo-1233319.jpeg?auto=compress&cs=tinysrgb&w=600',
  friesWide:
    'https://images.pexels.com/photos/4109234/pexels-photo-4109234.jpeg?auto=compress&cs=tinysrgb&w=1600',
};

function getCategoryIcon(name: string): LucideIcon {
  const lower = name.toLowerCase();
  if (lower.includes('snack')) return UtensilsCrossed;
  if (lower.includes('burger')) return Beef;
  if (lower.includes('sandwich') || lower.includes('wrap')) return UtensilsCrossed;
  if (lower.includes('fries') || lower.includes('side')) return Flame;
  if (lower.includes('chicken')) return Drumstick;
  if (lower.includes('dessert') || lower.includes('sweet')) return Sparkles;
  if (lower.includes('coffee')) return Coffee;
  if (lower.includes('beverage') || lower.includes('drink')) return CupSoda;
  if (lower.includes('add-on') || lower.includes('addon')) return Sparkles;
  if (lower.includes('salad')) return Salad;
  if (lower.includes('appetizer') || lower.includes('cold')) return Salad;
  if (lower.includes('hot')) return Flame;
  if (lower.includes('hookah')) return Wind;
  if (lower.includes('mashawi') || lower.includes('grill')) return Beef;
  if (lower.includes('waffle')) return LayoutGrid;
  if (lower.includes('pancake') || lower.includes('crepe')) return Layers;
  return UtensilsCrossed;
}

export function Menu({ products, categories, selectedCategory, onCategorySelect }: MenuProps) {
  const [isSticky, setIsSticky] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Lazy load images for visible products
  const productIds = useMemo(() => products.map(p => p.id), [products]);
  const { imageMap, registerElement } = useProductImages(productIds);

  useEffect(() => {
    const handleScroll = () => setIsSticky(window.scrollY > 480);
    window.addEventListener('scroll', handleScroll, { passive: true });
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
      const scrollAmount = 220;
      const newScrollLeft =
        direction === 'left'
          ? scrollContainerRef.current.scrollLeft - scrollAmount
          : scrollContainerRef.current.scrollLeft + scrollAmount;
      scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const scrollToMenu = () => {
    menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  }, {} as Record<string, { id: string; products: Product[] }>), [availableProducts, categories]);

  // Sort categories, placing "Add-ons" and "Hookah" last - memoized
  const sortedCategories = useMemo(() => Object.entries(groupedProducts).sort(([a], [b]) => {
    const isAAddon = a.toLowerCase().includes('add-on') || a.toLowerCase().includes('addon');
    const isBAddon = b.toLowerCase().includes('add-on') || b.toLowerCase().includes('addon');
    const isAHookah = a.toLowerCase().includes('hookah');
    const isBHookah = b.toLowerCase().includes('hookah');

    if (isAHookah && !isBHookah && !isBAddon) return 1;
    if (!isAHookah && !isAAddon && isBHookah) return -1;
    if (isAAddon && !isBAddon && !isBHookah) return 1;
    if (!isAAddon && !isAHookah && isBAddon) return -1;
    if (isAAddon && isBHookah) return -1;
    if (isAHookah && isBAddon) return 1;
    return a.localeCompare(b);
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
      ? t('guest.allItems')
      : categories.find(cat => cat.id === selectedCategory)?.name || 'Unknown',
    [selectedCategory, categories, t]
  );

  const features = [
    { icon: Leaf, title: t('guest.featFreshTitle'), desc: t('guest.featFreshDesc') },
    { icon: Bike, title: t('guest.featFastTitle'), desc: t('guest.featFastDesc') },
    { icon: Gift, title: t('guest.featPointsTitle'), desc: t('guest.featPointsDesc') },
  ];

  const CategoryChip = ({
    id,
    name,
    icon: Icon,
  }: {
    id: string;
    name: string;
    icon: LucideIcon;
  }) => {
    const active = selectedCategory === id;
    return (
      <button
        onClick={() => onCategorySelect(id)}
        aria-pressed={active}
        className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
          active
            ? 'bg-primary-600 border-primary-600 text-white shadow-md'
            : 'bg-white dark:bg-gray-800 border-primary-200/70 dark:border-gray-600 text-brown-800 dark:text-gray-200 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700'
        }`}
      >
        <Icon size={16} className={active ? 'text-primary-100' : 'text-primary-600 dark:text-primary-400'} />
        <span className="whitespace-nowrap">{name}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-green-100 dark:bg-green-900 transition-colors duration-300">
        {/* decorative blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-200/50 dark:bg-primary-900/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-primary-300/40 dark:bg-primary-800/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="text-center lg:text-start">
            <span className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-primary-200 dark:border-gray-700 text-primary-700 dark:text-primary-300 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm mb-6">
              <Flame size={15} className="text-primary-500" />
              {t('guest.heroBadge')}
            </span>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-brown-900 dark:text-cream-100 leading-[1.05] mb-6">
              {t('guest.heroTitleTop')}
              <span className="block italic text-primary-600 dark:text-primary-400">
                {t('guest.heroTitleAccent')}
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-brown-700/80 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed mb-8">
              {t('guest.heroSubtitle')}
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                onClick={scrollToMenu}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white px-7 py-3.5 rounded-full font-bold text-base shadow-lg shadow-primary-600/25 transition-all duration-200"
              >
                {t('guest.orderNow')}
                <ArrowRight size={18} className="rtl:rotate-180" />
              </button>
              <button
                onClick={scrollToMenu}
                className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-gray-700 text-brown-900 dark:text-gray-100 border border-primary-300 dark:border-gray-600 px-7 py-3.5 rounded-full font-semibold text-base transition-colors duration-200"
              >
                {t('guest.browseMenu')}
              </button>
            </div>
          </div>

          {/* Image collage */}
          <div className="relative grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
            <div className="row-span-2 rounded-4xl overflow-hidden shadow-card-hover">
              <img
                src={HERO_IMAGES.burgerMain}
                alt={t('guest.heroTitleTop')}
                className="w-full h-full object-cover aspect-[3/4]"
                width={450}
                height={600}
              />
            </div>
            <div className="rounded-3xl overflow-hidden shadow-card">
              <img
                src={HERO_IMAGES.friesSide}
                alt=""
                className="w-full h-full object-cover aspect-square"
                width={300}
                height={300}
                loading="lazy"
              />
            </div>
            <div className="rounded-3xl overflow-hidden shadow-card">
              <img
                src={HERO_IMAGES.drinkSide}
                alt=""
                className="w-full h-full object-cover aspect-square"
                width={300}
                height={300}
                loading="lazy"
              />
            </div>

            {/* floating badge */}
            <div className="absolute -bottom-4 start-4 sm:start-6 bg-white dark:bg-gray-800 rounded-2xl shadow-card-hover px-4 py-3 flex items-center gap-3 animate-float">
              <span className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <Flame size={20} className="text-primary-600 dark:text-primary-400" />
              </span>
              <div>
                <p className="text-sm font-bold text-brown-900 dark:text-gray-100 leading-tight">{t('guest.handmade')}</p>
                <p className="text-xs text-brown-600 dark:text-gray-400">{t('guest.featFreshTitle')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature strip */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid sm:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 border border-primary-100 dark:border-gray-700 rounded-3xl px-5 py-4 shadow-card transition-colors duration-300"
              >
                <span className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                  <Icon size={22} className="text-primary-600 dark:text-primary-400" />
                </span>
                <div>
                  <p className="font-bold text-brown-900 dark:text-gray-100">{title}</p>
                  <p className="text-sm text-brown-600/90 dark:text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CATEGORY NAV ============ */}
      <div
        ref={menuRef}
        className="scroll-mt-16"
      >
        <div
          className={`transition-all duration-300 z-40 ${
            isSticky
              ? 'fixed top-16 left-0 right-0 bg-green-50/95 dark:bg-green-900/95 backdrop-blur-lg shadow-lg border-b border-primary-200 dark:border-green-700'
              : 'relative bg-green-50 dark:bg-green-900 border-b border-primary-200/60 dark:border-green-800'
          }`}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
            <div className="relative py-3">
              {canScrollLeft && (
                <button
                  onClick={() => scroll('left')}
                  aria-label="Scroll categories left"
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-700 shadow-lg border border-primary-200 dark:border-gray-600 rounded-full p-2 transition-all duration-200 hover:bg-primary-50 dark:hover:bg-gray-600"
                >
                  <ChevronLeft className="text-primary-600 dark:text-primary-400" size={18} />
                </button>
              )}

              <div
                ref={scrollContainerRef}
                onScroll={checkScrollButtons}
                className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-smooth px-1 py-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <CategoryChip id="all" name={t('guest.allItems')} icon={UtensilsCrossed} />
                {categories.map(cat => (
                  <CategoryChip key={cat.id} id={cat.id} name={cat.name} icon={getCategoryIcon(cat.name)} />
                ))}
              </div>

              {canScrollRight && (
                <button
                  onClick={() => scroll('right')}
                  aria-label="Scroll categories right"
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-700 shadow-lg border border-primary-200 dark:border-gray-600 rounded-full p-2 transition-all duration-200 hover:bg-primary-50 dark:hover:bg-gray-600"
                >
                  <ChevronRight className="text-primary-600 dark:text-primary-400" size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
        {isSticky && <div className="h-[68px]" />}
      </div>

      {/* ============ MENU CONTENT ============ */}
      <div className="bg-green-50 dark:bg-green-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {filteredProducts.length > 0 ? (
            selectedCategory === 'all' ? (
              <div className="space-y-16">
                {sortedCategories.map(([categoryName, { id, products }]) => {
                  const Icon = getCategoryIcon(categoryName);
                  return (
                    <section key={id}>
                      <div className="flex items-center gap-4 mb-7">
                        <span className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                          <Icon size={20} className="text-primary-600 dark:text-primary-400" />
                        </span>
                        <h3 className="font-display text-2xl sm:text-3xl font-bold text-brown-900 dark:text-gray-100">
                          {categoryName}
                        </h3>
                        <span className="bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-bold">
                          {products.length} {t('guest.items')}
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary-200 dark:from-gray-700 to-transparent" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product, i) => (
                          <div
                            key={product.id}
                            className="animate-fade-in-up"
                            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                          >
                            <ProductCard
                              product={product}
                              imageUrl={imageMap[product.id] || undefined}
                              onImageElementReady={registerElement}
                            />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <section>
                <div className="flex items-center gap-4 mb-7">
                  <span className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = getCategoryIcon(selectedCategoryName);
                      return <Icon size={20} className="text-primary-600 dark:text-primary-400" />;
                    })()}
                  </span>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-brown-900 dark:text-gray-100">
                    {selectedCategoryName}
                  </h2>
                  <span className="bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-xs font-bold">
                    {filteredProducts.length} {t('guest.items')}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-primary-200 dark:from-gray-700 to-transparent" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product, i) => (
                    <div
                      key={product.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
                    >
                      <ProductCard
                        product={product}
                        imageUrl={imageMap[product.id] || undefined}
                        onImageElementReady={registerElement}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )
          ) : (
            <div className="text-center py-20">
              <div className="bg-white dark:bg-gray-800 border border-primary-100 dark:border-gray-700 rounded-4xl p-12 max-w-md mx-auto shadow-card transition-colors duration-300">
                <span className="inline-flex w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 items-center justify-center mb-6">
                  <UtensilsCrossed size={28} className="text-primary-500 dark:text-primary-400" />
                </span>
                <h3 className="font-display text-xl font-bold text-brown-900 dark:text-gray-100 mb-2">{t('guest.noItems')}</h3>
                <p className="text-brown-600 dark:text-gray-300">
                  {t('guest.noItemsHint')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ============ CTA BANNER ============ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="relative rounded-4xl overflow-hidden shadow-card-hover">
            <img
              src={HERO_IMAGES.friesWide}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-cocoa-950/85 via-cocoa-900/70 to-cocoa-900/40" />
            <div className="relative px-6 sm:px-12 py-14 sm:py-20 max-w-2xl">
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-cream-50 leading-tight mb-4">
                {t('guest.menuTitle')}
              </h2>
              <p className="text-cream-200/90 text-base sm:text-lg leading-relaxed mb-8">
                {t('guest.menuSubtitle')}
              </p>
              <button
                onClick={() => {
                  onCategorySelect('all');
                  scrollToMenu();
                }}
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 active:scale-[0.98] text-white px-7 py-3.5 rounded-full font-bold shadow-lg transition-all duration-200"
              >
                {t('guest.orderNow')}
                <ArrowRight size={18} className="rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
