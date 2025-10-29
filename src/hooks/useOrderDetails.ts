import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Order } from '../types';

interface OrderItemWithProduct {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export function useOrderDetails(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      // Fetch order and items in parallel for faster loading
      const [orderResult, itemsResult] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single(),
        supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            unit_price,
            total_price,
            products (name)
          `)
          .eq('order_id', orderId)
      ]);

      if (orderResult.error) throw orderResult.error;
      if (itemsResult.error) throw itemsResult.error;

      setOrder(orderResult.data);
      setItems(itemsResult.data?.map(item => ({
        id: item.id,
        product_name: (item.products as any)?.name || 'Unknown Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      })) || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  return { order, items, loading };
}