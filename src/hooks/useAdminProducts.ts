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
      
      // Fetch ALL product fields for admin management
      const productsQuery = supabase
        .from('products')
        .select('id, name, description, price, category_id, image_url, is_available, created_at')
        .order('name', { ascending: true });

      // Fetch categories and products in parallel for faster loading
      const [categoriesQuery, productsQueryResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, display_order, created_at')
          .order('display_order', { ascending: true }),
        productsQuery
      ]);

      if (categoriesQuery.error) {
        console.error('Categories query error:', categoriesQuery.error);
        throw categoriesQuery.error;
      }

      if (productsQueryResult.error) {
        console.error('Products query error:', productsQueryResult.error);
        throw productsQueryResult.error;
      }

      setCategories(categoriesQuery.data || []);
      setProducts(productsQueryResult.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching admin product data:', err);
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

