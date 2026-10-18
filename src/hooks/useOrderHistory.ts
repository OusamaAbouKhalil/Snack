import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface UseOrderHistoryOptions {
  limit?: number;
  offset?: number;
  /** Local YYYY-MM-DD bounds; when set, every order in the range is fetched (no row cap). */
  from?: string;
  to?: string;
}

const ORDER_FIELDS =
  'id, order_number, customer_name, total_amount, payment_method, status, created_at, customer_id, order_type, delivery_fee, delivery_address, delivery_lat, delivery_lng, customer_phone, notes, source';

// Open statuses are always fetched in full, so old pending/unpaid orders can't
// fall off the end of the recent-orders window.
const OPEN_STATUSES = ['pending', 'unpaid'];

export function useOrderHistory(options: UseOrderHistoryOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const { limit = 100, offset = 0, from, to } = options;

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      let recent = supabase
        .from('orders')
        .select(ORDER_FIELDS, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (from) recent = recent.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
      if (to) recent = recent.lte('created_at', new Date(`${to}T23:59:59.999`).toISOString());
      // An explicit range bounds the result itself — only cap the default view.
      if (!from && !to && limit > 0) {
        recent = recent.range(offset, offset + limit - 1);
      }

      const open = supabase
        .from('orders')
        .select(ORDER_FIELDS)
        .in('status', OPEN_STATUSES)
        .order('created_at', { ascending: false });

      const [recentRes, openRes] = await Promise.all([recent, open]);
      if (recentRes.error) throw recentRes.error;
      if (openRes.error) throw openRes.error;

      const byId = new Map<string, Order>();
      for (const o of [...(recentRes.data || []), ...(openRes.data || [])] as Order[]) {
        byId.set(o.id, o);
      }
      const merged = [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));

      setOrders(merged);
      setHasMore(recentRes.count ? offset + limit < recentRes.count : false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, from, to]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  const updateManyStatuses = async (orderIds: string[], status: string): Promise<boolean> => {
    if (orderIds.length === 0) return true;
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .in('id', orderIds);

      if (updateError) throw updateError;

      const ids = new Set(orderIds);
      setOrders((prev) => prev.map((order) => (ids.has(order.id) ? { ...order, status } : order)));
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update order statuses');
      return false;
    }
  };

  return { orders, loading, error, updateOrderStatus, updateManyStatuses, refetch: fetchOrders, hasMore };
}
