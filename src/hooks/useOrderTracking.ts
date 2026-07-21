import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface TrackedOrder {
  order_number: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  discount?: number;
  redeemed_points?: number;
  order_type: string;
  created_at: string;
  items: Array<{ name: string; quantity: number; unit_price: number; total_price: number }>;
}

/**
 * Polls the track_order RPC (works for guests — no table access needed).
 * Polling stops automatically once the order reaches a final state.
 */
export function useOrderTracking(orderId: string | null, intervalMs = 12000) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      const { data, error } = await supabase.rpc('track_order', { p_order_id: orderId });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        return;
      }
      if (data) {
        setOrder(data as TrackedOrder);
        if ((data as TrackedOrder).status !== 'pending' && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
      }
    };

    fetchStatus();
    timer.current = setInterval(fetchStatus, intervalMs);

    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [orderId, intervalMs]);

  return { order, error };
}
