import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_name: string;
  stock_quantity: number;
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);

      // For now, we'll use products table and add mock stock quantities
      // In a real implementation, you'd have a separate inventory table
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          categories (name)
        `);

      if (error) throw error;

      const inventoryData = products?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        category_name: (product.categories as any)?.name || 'Uncategorized',
        stock_quantity: Math.floor(Math.random() * 50) + 5 // Mock stock quantity
      })) || [];

      setInventory(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (productId: string, newStock: number): Promise<boolean> => {
    try {
      // In a real implementation, you'd update an inventory table
      // For now, we'll just update the local state
      setInventory(prev => 
        prev.map(item => 
          item.id === productId 
            ? { ...item, stock_quantity: newStock }
            : item
        )
      );
      return true;
    } catch (error) {
      console.error('Error updating stock:', error);
      return false;
    }
  };

  return { inventory, loading, updateStock, refetch: fetchInventory };
}