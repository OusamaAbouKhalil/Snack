import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InventoryItem {
  id: string;
  product_id: string;
  name: string;
  description: string;
  price: number;
  category_name: string;
  stock_quantity: number;
  min_stock_level: number;
  last_updated: string;
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('inventory')
        .select(`
          id,
          product_id,
          stock_quantity,
          min_stock_level,
          last_updated,
          products (
            name,
            description,
            price,
            categories (name)
          )
        `);

      if (fetchError) throw fetchError;

      const inventoryData = data?.map(item => ({
        id: item.id,
        product_id: item.product_id,
        name: (item.products as any)?.name || 'Unknown Product',
        description: (item.products as any)?.description || '',
        price: (item.products as any)?.price || 0,
        category_name: (item.products as any)?.categories?.name || 'Uncategorized',
        stock_quantity: item.stock_quantity,
        min_stock_level: item.min_stock_level,
        last_updated: item.last_updated
      })) || [];

      setInventory(inventoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (productId: string, newStock: number): Promise<boolean> => {
    try {
      setError(null);

      if (newStock < 0) {
        setError('Stock quantity cannot be negative');
        return false;
      }

      const { error } = await supabase
        .from('inventory')
        .update({ 
          stock_quantity: newStock,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', productId);

      if (error) throw error;

      setInventory(prev => 
        prev.map(item => 
          item.product_id === productId 
            ? { ...item, stock_quantity: newStock, last_updated: new Date().toISOString() }
            : item
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
      console.error('Error updating stock:', err);
      return false;
    }
  };

  const updateMinStockLevel = async (productId: string, minLevel: number): Promise<boolean> => {
    try {
      setError(null);

      if (minLevel < 0) {
        setError('Minimum stock level cannot be negative');
        return false;
      }

      const { error } = await supabase
        .from('inventory')
        .update({ min_stock_level: minLevel })
        .eq('product_id', productId);

      if (error) throw error;

      setInventory(prev => 
        prev.map(item => 
          item.product_id === productId 
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

  return { 
    inventory, 
    loading, 
    error, 
    updateStock, 
    updateMinStockLevel, 
    refetch: fetchInventory 
  };
}