import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ProductData {
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string;
  is_available: boolean;
}

export function useProductManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProduct = async (productData: ProductData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: createError } = await supabase
        .from('products')
        .insert(productData);

      if (createError) throw createError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
      console.error('Error creating product:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (productId: string, productData: Partial<ProductData>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', productId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      console.error('Error updating product:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (productId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      console.error('Error deleting product:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createProduct, updateProduct, deleteProduct, loading, error };
}