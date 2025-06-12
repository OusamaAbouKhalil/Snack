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
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      setError(null);

      if (!['pending', 'completed', 'cancelled'].includes(status)) {
        setError('Invalid order status');
        return false;
      }

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
      setError('Failed to update order status');
      console.error('Error updating order status:', error);
      return false;
    }
  };

  const deleteOrder = async (orderId: string): Promise<boolean> => {
    try {
      setError(null);

      // Delete order items first (should cascade, but being explicit)
      await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      // Delete order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(prev => prev.filter(order => order.id !== orderId));
      return true;
    } catch (error) {
      setError('Failed to delete order');
      console.error('Error deleting order:', error);
      return false;
    }
  };

  return { 
    orders, 
    loading, 
    error, 
    updateOrderStatus, 
    deleteOrder,
    refetch: fetchOrders 
  };
}