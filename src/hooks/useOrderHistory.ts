import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

interface UseOrderHistoryOptions {
  limit?: number;
  offset?: number;
}

export function useOrderHistory(options: UseOrderHistoryOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletedOrderItems, setDeletedOrderItems] = useState<{ [orderId: string]: OrderItem[] }>({});
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
        .select('id, order_number, customer_name, total_amount, payment_method, status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (limit > 0) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;
      setOrders(data || []);
      setHasMore(count ? (offset + limit) < count : false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string): Promise<boolean> => {
    try {
      if (status === 'cancelled') {
        // Fetch order_items and verify auth in parallel
        const [itemsResult, authResult] = await Promise.all([
          supabase
            .from('order_items')
            .select('id, order_id, product_id, quantity, unit_price, total_price, created_at')
            .eq('order_id', orderId),
          supabase.auth.getUser()
        ]);

        console.log('Authenticated user:', authResult.data.user?.id || 'No user');

        if (itemsResult.error) {
          console.error('Error checking order_items:', itemsResult.error);
          throw new Error(`Failed to check order_items: ${itemsResult.error.message}`);
        }

        const items = itemsResult.data;
        console.log(`Found ${items?.length || 0} order_items for order ${orderId}:`, JSON.stringify(items, null, 2));

        // Store items before deletion
        if (items && items.length > 0) {
          setDeletedOrderItems(prev => ({
            ...prev,
            [orderId]: items,
          }));
        }

        // Update order status first to satisfy RLS policy, then delete items
        const updateResult = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId);

        if (updateResult.error) {
          console.error('Failed to update order status:', updateResult.error);
          throw new Error(`Failed to update order status: ${updateResult.error.message}`);
        }

        if (items && items.length > 0) {
          // Delete order_items after status update (they can run in parallel but order matters for RLS)
          const deleteResult = await supabase
            .from('order_items')
            .delete()
            .eq('order_id', orderId)
            .select();

          if (deleteResult.error) {
            console.error('Failed to delete order_items:', deleteResult.error);
            throw new Error(`Failed to delete order_items: ${deleteResult.error.message}`);
          }

          console.log(`Deleted ${deleteResult.data?.length || 0} order_items for order ${orderId}`);
        } else {
          console.log(`No order_items found to delete for order ${orderId}`);
        }
      } else {
        // Check if order was previously cancelled and has stored items
        const prevOrder = orders.find(order => order.id === orderId);
        const wasCancelled = prevOrder?.status === 'cancelled';
        const itemsToRestore = deletedOrderItems[orderId];

        // Update order status
        const updateResult = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId);

        if (updateResult.error) {
          console.error('Failed to update order status:', updateResult.error);
          throw new Error(`Failed to update order status: ${updateResult.error.message}`);
        }

        // If changing from cancelled and items exist, restore them with new IDs and timestamps
        if (wasCancelled && itemsToRestore && itemsToRestore.length > 0) {
          const itemsToInsert = itemsToRestore.map(({ id, created_at, ...item }) => ({
            ...item,
            created_at: new Date().toISOString(), // New timestamp
            // Omit id to generate new UUIDs
          }));

          const insertResult = await supabase
            .from('order_items')
            .insert(itemsToInsert)
            .select();

          if (insertResult.error) {
            console.error('Failed to reinsert order_items:', insertResult.error);
            throw new Error(`Failed to reinsert order_items: ${insertResult.error.message}`);
          }

          console.log(`Reinserted ${insertResult.data?.length || 0} order_items for order ${orderId}`, JSON.stringify(insertResult.data, null, 2));

          // Clear stored items
          setDeletedOrderItems(prev => {
            const newItems = { ...prev };
            delete newItems[orderId];
            return newItems;
          });
        }
      }

      // Update local state optimistically
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status }
            : order
        )
      );
      
      return true;
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      setError(error instanceof Error ? error.message : 'Failed to update order status');
      return false;
    }
  };

  return { orders, loading, error, updateOrderStatus, refetch: fetchOrders, hasMore };
}