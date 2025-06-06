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
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { createCategory, updateCategory, deleteCategory, loading, error };
}