import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CartItem } from '../types';

export interface CreateOrderInput {
  items: CartItem[];
  customerName: string;
  paymentMethod?: string;
  customerId?: string | null;
  orderType?: 'pickup' | 'delivery';
  deliveryFee?: number | null;
  deliveryAddress?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  customerPhone?: string | null;
  notes?: string | null;
  source?: 'pos' | 'online';
  redeemPoints?: number;
}

export interface CreatedOrder {
  id: string;
  order_number: string;
  total_amount: number;
  delivery_fee: number;
  delivery_zone?: string | null;
  discount: number;
  redeemed_points: number;
  order_type: string;
  status: string;
}

export function useOrders() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All order creation (POS + online + guest) goes through the create_order
  // RPC: prices are computed server-side, the order number is generated once.
  const createOrder = async (input: CreateOrderInput): Promise<CreatedOrder | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_items: input.items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        p_customer_name: input.customerName,
        p_payment_method: input.paymentMethod || 'cash',
        p_customer_id: input.customerId ?? null,
        p_order_type: input.orderType || 'pickup',
        p_delivery_fee: input.deliveryFee ?? null,
        p_delivery_address: input.deliveryAddress ?? null,
        p_delivery_lat: input.deliveryLat ?? null,
        p_delivery_lng: input.deliveryLng ?? null,
        p_customer_phone: input.customerPhone ?? null,
        p_notes: input.notes ?? null,
        p_source: input.source || 'online',
        p_redeem_points: input.redeemPoints ?? 0,
      });

      if (error) throw error;
      return data as CreatedOrder;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getOrderWithItems = async (orderId: string) => {
    try {
      const [orderResult, itemsResult] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase
          .from('order_items')
          .select('*, products (name)')
          .eq('order_id', orderId),
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
