import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Order, OrderItem, CartItem } from '../types';

export function useOrders() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async (
    cartItems: CartItem[],
    customerName: string,
    paymentMethod: string
  ): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      // Generate order number
      const orderNumber = `ORD-${Date.now()}`;
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: customerName,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return orderData.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getOrderWithItems = async (orderId: string) => {
    try {
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
            *,
            products (*)
          `)
          .eq('order_id', orderId)
      ]);

      if (orderResult.error) throw orderResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return { order: orderResult.data, items: itemsResult.data };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order');
      return null;
    }
  };

  return { createOrder, getOrderWithItems, loading, error };
}