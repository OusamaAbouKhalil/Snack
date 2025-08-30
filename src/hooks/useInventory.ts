import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface InventoryItem {
  id: string;
  ingredient_id: string;
  name: string;
  description: string;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  category_name: string;
}

interface Transaction {
  id: string;
  ingredient_id: string;
  quantity_change: number;
  transaction_type: 'ADD' | 'REMOVE' | 'ADJUST';
  created_at: string;
  ingredient_name: string;
  unit: string;
}

interface NewIngredient {
  name: string;
  description: string;
  unit: string;
  category_id: string;
  stock_quantity: number;
  min_stock_level: number;
}

interface Category {
  id: string;
  name: string;
}

interface InventoryQueryResult {
  id: string;
  ingredient_id: string;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  ingredients: {
    name: string;
    description: string | null;
    ingredient_categories: {
      name: string | null;
    } | null;
  } | null;
}

interface TransactionQueryResult {
  id: string;
  ingredient_id: string;
  quantity_change: number;
  transaction_type: 'ADD' | 'REMOVE' | 'ADJUST';
  created_at: string;
  ingredients: {
    name: string;
    unit: string;
  } | null;
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('ingredient_categories')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select(`
          id,
          ingredient_id,
          stock_quantity,
          min_stock_level,
          unit,
          ingredients (
            name,
            description,
            ingredient_categories (name)
          )
        `) as { data: InventoryQueryResult[] | null; error: any };

      if (fetchError) throw fetchError;

      const inventoryData = data?.map(item => ({
        id: item.id,
        ingredient_id: item.ingredient_id,
        name: item.ingredients?.name || 'Unknown Ingredient',
        description: item.ingredients?.description || '',
        stock_quantity: item.stock_quantity,
        min_stock_level: item.min_stock_level,
        unit: item.unit,
        category_name: item.ingredients?.ingredient_categories?.name || 'Uncategorized'
      })) || [];

      setInventory(inventoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          id,
          ingredient_id,
          quantity_change,
          transaction_type,
          created_at,
          ingredients (
            name,
            unit
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100) as { data: TransactionQueryResult[] | null; error: any };

      if (error) throw error;

      const transactionData = data?.map(item => {
        if (!item.ingredients) {
          console.warn(`No ingredients data for transaction ${item.id}, ingredient_id: ${item.ingredient_id}`);
        }
        return {
          id: item.id,
          ingredient_id: item.ingredient_id,
          quantity_change: item.quantity_change,
          transaction_type: item.transaction_type,
          created_at: item.created_at,
          ingredient_name: item.ingredients?.name || 'Unknown',
          unit: item.ingredients?.unit || 'Unknown'
        };
      }) || [];

      setTransactions(transactionData);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    }
  };

  const updateStock = async (ingredientId: string, newStock: number, transactionType: 'ADD' | 'REMOVE' | 'ADJUST'): Promise<boolean> => {
    try {
      setError(null);

      const { data: currentData } = await supabase
        .from('inventory')
        .select('stock_quantity')
        .eq('ingredient_id', ingredientId)
        .single();

      if (!currentData) throw new Error('Ingredient not found');

      const quantityChange = transactionType === 'REMOVE' 
        ? currentData.stock_quantity - newStock
        : newStock - currentData.stock_quantity;

      const { error: updateError } = await supabase
        .from('inventory')
        .update({ 
          stock_quantity: newStock,
          last_updated: new Date().toISOString()
        })
        .eq('ingredient_id', ingredientId);

      if (updateError) throw updateError;

      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .insert({
          id: uuidv4(),
          ingredient_id: ingredientId,
          quantity_change: quantityChange,
          transaction_type: transactionType,
          created_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      setInventory(prev => 
        prev.map(item => 
          item.ingredient_id === ingredientId 
            ? { ...item, stock_quantity: newStock }
            : item
        )
      );

      await fetchTransactions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
      console.error('Error updating stock:', err);
      return false;
    }
  };

  const updateMinStockLevel = async (ingredientId: string, minLevel: number): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('inventory')
        .update({ min_stock_level: minLevel })
        .eq('ingredient_id', ingredientId);

      if (error) throw error;

      setInventory(prev => 
        prev.map(item => 
          item.ingredient_id === ingredientId 
            ? { ...item, min_stock_level: minLevel }
            : item
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update minimum stock level');
      console.error('Error updating min stock level:', err);
      return false;
    }
  };

  const addIngredient = async (ingredient: NewIngredient): Promise<boolean> => {
    try {
      setError(null);

      if (ingredient.category_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(ingredient.category_id)) {
          throw new Error('Invalid category ID format');
        }
        const { data: category } = await supabase
          .from('ingredient_categories')
          .select('id')
          .eq('id', ingredient.category_id)
          .single();
        if (!category) {
          throw new Error('Category does not exist');
        }
      }

      const newIngredientId = uuidv4();
      const { error: ingredientError } = await supabase
        .from('ingredients')
        .insert({
          id: newIngredientId,
          name: ingredient.name,
          description: ingredient.description,
          unit: ingredient.unit,
          category_id: ingredient.category_id || null
        });

      if (ingredientError) throw ingredientError;

      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert({
          id: uuidv4(),
          ingredient_id: newIngredientId,
          stock_quantity: ingredient.stock_quantity,
          min_stock_level: ingredient.min_stock_level,
          unit: ingredient.unit,
          last_updated: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        });

      if (inventoryError) throw inventoryError;

      if (ingredient.stock_quantity > 0) {
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert({
            id: uuidv4(),
            ingredient_id: newIngredientId,
            quantity_change: ingredient.stock_quantity,
            transaction_type: 'ADD',
            created_at: new Date().toISOString()
          });

        if (transactionError) throw transactionError;
      }

      await fetchInventory();
      await fetchTransactions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ingredient');
      console.error('Error adding ingredient:', err);
      return false;
    }
  };

  const removeIngredient = async (ingredientId: string): Promise<boolean> => {
    try {
      setError(null);

      const { error: inventoryError } = await supabase
        .from('inventory')
        .delete()
        .eq('ingredient_id', ingredientId);

      if (inventoryError) throw inventoryError;

      const { error: ingredientError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', ingredientId);

      if (ingredientError) throw ingredientError;

      const { error: transactionError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('ingredient_id', ingredientId);

      if (transactionError) throw transactionError;

      setInventory(prev => prev.filter(item => item.ingredient_id !== ingredientId));
      setTransactions(prev => prev.filter(t => t.ingredient_id !== ingredientId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove ingredient');
      console.error('Error removing ingredient:', err);
      return false;
    }
  };

  const getDailyUsage = async (days: number = 7) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          id,
          ingredient_id,
          quantity_change,
          transaction_type,
          created_at,
          ingredients (
            name,
            unit
          )
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true }) as { data: TransactionQueryResult[] | null; error: any };

      if (error) throw error;

      const transactionData = data?.map(item => {
        if (!item.ingredients) {
          console.warn(`No ingredients data for transaction ${item.id}, ingredient_id: ${item.ingredient_id}`);
        }
        return {
          id: item.id,
          ingredient_id: item.ingredient_id,
          quantity_change: item.quantity_change,
          transaction_type: item.transaction_type,
          created_at: item.created_at,
          ingredient_name: item.ingredients?.name || 'Unknown',
          unit: item.ingredients?.unit || 'Unknown'
        };
      }) || [];

      return transactionData;
    } catch (err) {
      console.error('Error fetching daily usage:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch daily usage');
      return [];
    }
  };

  return { 
    inventory,
    transactions,
    categories,
    loading,
    error,
    updateStock,
    updateMinStockLevel,
    addIngredient,
    removeIngredient,
    getDailyUsage,
    refetch: fetchInventory 
  };
}
