import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface CategoryData {
  name: string;
  display_order: number;
}

export function useCategoryManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCategory = async (categoryData: CategoryData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: createError } = await supabase
        .from('categories')
        .insert(categoryData);

      if (createError) throw createError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
      console.error('Error creating category:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (categoryId: string, categoryData: Partial<CategoryData>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', categoryId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
      console.error('Error updating category:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Check if category has products
      const { data: products, error: checkError } = await supabase
        .from('products')
        .select('id')
        .eq('category_id', categoryId);

      if (checkError) throw checkError;

      if (products && products.length > 0) {
        setError('Cannot delete category with existing products. Please move or delete products first.');
        return false;
      }

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      console.error('Error deleting category:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createCategory, updateCategory, deleteCategory, loading, error };
}