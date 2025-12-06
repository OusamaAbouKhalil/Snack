import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';

/**
 * Hook for fetching products with ALL fields (including description and image_url)
 * for admin purposes.
 * 
 * NOTE: This fetches more data than the regular useProducts hook.
 * Only use this in admin panels where you need full product details.
 * For customer-facing menus, use the optimized useProducts hook instead.
 */
export function useAdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch categories first (small, fast query)
      const categoriesQuery = await supabase
        .from('categories')
        .select('id, name, display_order, created_at')
        .order('display_order', { ascending: true });

      if (categoriesQuery.error) {
        console.error('Categories query error:', categoriesQuery.error);
        throw categoriesQuery.error;
      }

      setCategories(categoriesQuery.data || []);

      // OPTIMIZATION: Fetch products in two phases for faster initial load
      // Phase 1: Fetch essential fields first (fast, no large fields)
      // Skip ORDER BY initially to avoid 500 errors, sort in memory
      console.log('📦 Loading products (phase 1: essential fields, no ORDER BY for speed)...');
      let productsQuery = supabase
        .from('products')
        .select('id, name, price, category_id, is_available, created_at')
        .limit(500); // Reasonable limit for admin panel

      const productsQueryResult = await productsQuery;

      // If 500 error, try fallback without ORDER BY
      const statusCode = (productsQueryResult.error as any)?.statusCode || (productsQueryResult.error as any)?.status;
      if (productsQueryResult.error && (statusCode === 500 || !statusCode)) {
        console.log('⚠️ Server error (500) - Trying fallback without ORDER BY...');
        
        const fallbackQuery = await supabase
          .from('products')
          .select('id, name, price, category_id, is_available, created_at')
          .limit(500);
        
        if (fallbackQuery.error) {
          console.error('Fallback query also failed:', fallbackQuery.error);
          throw fallbackQuery.error;
        }
        
        console.log('✅ Fallback succeeded! Sorting in memory...');
        const sorted = [...(fallbackQuery.data || [])].sort((a, b) => 
          (a.name || '').localeCompare(b.name || '')
        );
        
        // Set products immediately (fast initial render)
        setProducts(sorted);
        
        // Mark loading as complete NOW (don't wait for details)
        setLoading(false);
        
        // Phase 2: Lazy load description and image_url in background (non-blocking)
        loadProductDetails(sorted).catch(err => {
          console.error('Error loading product details in background:', err);
        });
        return;
      }

      if (productsQueryResult.error) {
        console.error('Products query error:', {
          message: productsQueryResult.error.message,
          details: productsQueryResult.error.details,
          hint: productsQueryResult.error.hint,
          code: productsQueryResult.error.code,
          statusCode: statusCode
        });
        throw productsQueryResult.error;
      }

      // Set products immediately (fast initial render)
      // Sort in memory (faster than database ORDER BY for large datasets)
      const initialProducts = [...(productsQueryResult.data || [])].sort((a, b) => 
        (a.name || '').localeCompare(b.name || '')
      );
      setProducts(initialProducts);
      
      // Mark loading as complete NOW (don't wait for details)
      setLoading(false);

      // Phase 2: Load full details (description, image_url) in background (non-blocking)
      // Don't await - let it load in background while UI is already showing
      loadProductDetails(initialProducts).catch(err => {
        console.error('Error loading product details in background:', err);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching admin product data:', err);
      setLoading(false);
    }
  };

  // Load product details (description, image_url) in batches - NON-BLOCKING
  const loadProductDetails = async (baseProducts: any[]) => {
    // Products are already set, just update them with details

    // Load images first (more important for UI), then descriptions
    // Priority: Load first 20 products' images immediately, rest in background
    const priorityBatch = baseProducts.slice(0, 20);
    const remainingProducts = baseProducts.slice(20);

    // Load priority batch images immediately
    if (priorityBatch.length > 0) {
      try {
        const priorityIds = priorityBatch.map(p => p.id);
        const { data: imageData } = await supabase
          .from('products')
          .select('id, image_url')
          .in('id', priorityIds);

        if (imageData) {
          setProducts(prev => prev.map(product => {
            const img = imageData.find(d => d.id === product.id);
            return img?.image_url ? { ...product, image_url: img.image_url } : product;
          }));
        }
      } catch (err) {
        console.warn('Failed to load priority images:', err);
      }
    }

    // Load remaining images in background (non-blocking)
    if (remainingProducts.length > 0) {
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < remainingProducts.length; i += batchSize) {
        batches.push(remainingProducts.slice(i, i + batchSize));
      }

      // Load images in background
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const productIds = batch.map(p => p.id);
        
        try {
          const { data: imageData } = await supabase
            .from('products')
            .select('id, image_url')
            .in('id', productIds);

          if (imageData) {
            setProducts(prev => prev.map(product => {
              const img = imageData.find(d => d.id === product.id);
              return img?.image_url ? { ...product, image_url: img.image_url } : product;
            }));
          }
        } catch (err) {
          console.warn(`Failed to load images for batch ${i + 1}:`, err);
        }
        
        // Small delay to avoid overwhelming server
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Load descriptions last (least critical, can be lazy loaded when editing)
    // Only load descriptions for first 50 products, rest load on-demand
    const descriptionBatch = baseProducts.slice(0, 50);
    if (descriptionBatch.length > 0) {
      try {
        const descIds = descriptionBatch.map(p => p.id);
        const { data: descData } = await supabase
          .from('products')
          .select('id, description')
          .in('id', descIds);

        if (descData) {
          setProducts(prev => prev.map(product => {
            const desc = descData.find(d => d.id === product.id);
            return desc?.description ? { ...product, description: desc.description } : product;
          }));
        }
      } catch (err) {
        console.warn('Failed to load descriptions:', err);
      }
    }
  };

  // Memoize available products
  const availableProducts = useMemo(() => 
    products.filter(p => p.is_available), 
    [products]
  );

  return { 
    products, 
    categories, 
    availableProducts,
    loading, 
    error, 
    refetch: fetchData 
  };
}

