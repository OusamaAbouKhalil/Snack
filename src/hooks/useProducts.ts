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
      
      // Build products query conditionally
      let productsQueryBuilder = supabase
        .from('products')
        .select('id, name, description, price, category_id, image_url, is_available, created_at');
      
      if (onlyAvailable) {
        productsQueryBuilder = productsQueryBuilder.eq('is_available', true);
      }
      
      productsQueryBuilder = productsQueryBuilder.order('name', { ascending: true });

      // Fetch categories and products in parallel
      const [categoriesQuery, productsQuery] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, display_order, created_at')
          .order('display_order', { ascending: true }),
        productsQueryBuilder
      ]);

      if (categoriesQuery.error) throw categoriesQuery.error;
      if (productsQuery.error) throw productsQuery.error;

      setCategories(categoriesQuery.data || []);
      setProducts(productsQuery.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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