import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface UseOrderHistoryOptions {
  limit?: number;
  offset?: number;
}

export function useOrderHistory(options: UseOrderHistoryOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { limit = 100, offset = 0 } = options;

  useEffect(() => {
    fetchOrders();
  }, [limit, offset]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('orders')
        .select(
          'id, order_number, customer_name, total_amount, payment_method, status, created_at, customer_id, order_type, delivery_fee, delivery_address, delivery_lat, delivery_lng, customer_phone, notes, source',
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      if (limit > 0) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      setOrders(data || []);
      setHasMore(count ? offset + limit < count : false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Status is the only thing a status change touches. Items are never deleted:
  // cancelled orders keep their rows (reports filter by status), and the
  // loyalty ledger reconciles automatically via DB trigger.
  const updateOrderStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (updateError) throw updateError;

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status } : order))
      );
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update order status');
      return false;
    }
  };

  return { orders, loading, error, updateOrderStatus, refetch: fetchOrders, hasMore };
}
