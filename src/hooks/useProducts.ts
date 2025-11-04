import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';

interface UseProductsOptions {
  onlyAvailable?: boolean;
}

export function useProducts(options: UseProductsOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { onlyAvailable = false } = options;

  useEffect(() => {
    fetchData();
  }, [onlyAvailable]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // OPTIMIZED: Removed description and image_url to reduce egress by ~70%
      // These fields will be lazy-loaded when needed (e.g., product detail modal)
      let productsQueryBuilder = supabase
        .from('products')
        .select('id, name, price, category_id, is_available, created_at');
      
      if (onlyAvailable) {
        productsQueryBuilder = productsQueryBuilder.eq('is_available', true);
      }
      
      productsQueryBuilder = productsQueryBuilder.order('name', { ascending: true });
      // Note: No .limit() here since this is a menu display - all items are needed
      // If you have 100+ products, consider adding pagination

      // Fetch categories and products in parallel for faster loading
      const [categoriesQuery, productsQuery] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, display_order, created_at')
          .order('display_order', { ascending: true }),
        productsQueryBuilder
      ]);

      if (categoriesQuery.error) {
        console.error('Categories query error:', categoriesQuery.error);
        throw categoriesQuery.error;
      }

      if (productsQuery.error) {
        console.error('Products query error:', {
          message: productsQuery.error.message,
          details: productsQuery.error.details,
          hint: productsQuery.error.hint,
          code: productsQuery.error.code,
          statusCode: (productsQuery.error as any).statusCode || (productsQuery.error as any).status
        });
        
        // If 500 error or no status code, try fallback: fetch without ORDER BY and sort in memory
        const statusCode = (productsQuery.error as any).statusCode || (productsQuery.error as any).status;
        if (statusCode === 500 || !statusCode) {
          console.log('⚠️ Server error (500) - Trying fallback: fetch without ORDER BY, sort in memory...');
          
          let fallbackQuery = supabase
            .from('products')
            .select('id, name, price, category_id, is_available, created_at');
          
          if (onlyAvailable) {
            fallbackQuery = fallbackQuery.eq('is_available', true);
          }
          
          const { data: fallbackData, error: fallbackError } = await fallbackQuery;
          
          if (!fallbackError && fallbackData) {
            console.log('✅ Fallback succeeded! Sorting in memory...');
            // Sort in memory instead of database
            const sorted = [...fallbackData].sort((a, b) => 
              (a.name || '').localeCompare(b.name || '')
            );
            setProducts(sorted);
            setCategories(categoriesQuery.data || []);
            return; // Success with fallback
          } else {
            console.warn('⚠️ Fallback query also failed:', fallbackError);
          }
        }
        
        throw productsQuery.error;
      }

      setCategories(categoriesQuery.data || []);
      setProducts(productsQuery.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
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