import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';

export function useProducts() {
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
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Fetch all products (not just available ones for admin)
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      setCategories(categoriesData || []);
      setProducts(productsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  return { products, categories, loading, error, refetch: fetchData };
}