import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

/**
 * Hook for lazy loading full product details including description and image
 * Use this when you need to display product details (e.g., in a modal or detail page)
 * 
 * EGRESS OPTIMIZATION: Only fetches description and image_url when specifically needed,
 * not during initial list loading. This can reduce egress by 70-90% for list views.
 */
export function useProductDetails(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }

    fetchProductDetails();
  }, [productId]);

  const fetchProductDetails = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('products')
        .select('id, name, description, image_url, price, category_id, is_available, created_at')
        .eq('id', productId)
        .single();

      if (queryError) {
        console.error('Product details query error:', queryError);
        throw queryError;
      }

      setProduct(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error fetching product details:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    product,
    loading,
    error,
    refetch: fetchProductDetails,
  };
}

