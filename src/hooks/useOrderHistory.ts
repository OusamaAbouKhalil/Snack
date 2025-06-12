import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

export function useOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      
      // Update local state
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status }
            : order
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      return false;
    }
  };

  return { orders, loading, error, updateOrderStatus, refetch: fetchOrders };
}