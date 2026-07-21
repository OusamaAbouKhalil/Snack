import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Customer } from '../types';

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const [customersResult, ordersResult] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('customer_id, customer_name, total_amount, status')
          .neq('status', 'cancelled'),
      ]);

      if (customersResult.error) throw customersResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const customers = (customersResult.data || []) as Customer[];
      const orders = ordersResult.data || [];

      // Stats keyed by customer_id (real FK); name-matching only as a
      // fallback for legacy orders created before the link existed.
      const statsById: Record<string, { count: number; total: number }> = {};
      const statsByName: Record<string, { count: number; total: number }> = {};
      for (const order of orders) {
        if (order.customer_id) {
          (statsById[order.customer_id] ??= { count: 0, total: 0 });
          statsById[order.customer_id].count += 1;
          statsById[order.customer_id].total += order.total_amount || 0;
        } else if (order.customer_name) {
          (statsByName[order.customer_name] ??= { count: 0, total: 0 });
          statsByName[order.customer_name].count += 1;
          statsByName[order.customer_name].total += order.total_amount || 0;
        }
      }

      setCustomers(
        customers.map((customer) => {
          const byId = statsById[customer.id];
          const byName = statsByName[customer.name];
          return {
            ...customer,
            total_orders: (byId?.count || 0) + (byName?.count || 0),
            total_spent: (byId?.total || 0) + (byName?.total || 0),
          };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async (
    customerData: Partial<Customer> & { name: string }
  ): Promise<Customer | null> => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customerData, email: customerData.email || null })
        .select()
        .single();
      if (error) throw error;
      await fetchCustomers();
      return data as Customer;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      return null;
    }
  };

  const updateCustomer = async (
    customerId: string,
    customerData: Partial<Customer>
  ): Promise<boolean> => {
    try {
      setError(null);
      const { error } = await supabase
        .from('customers')
        .update({ ...customerData, email: customerData.email || null })
        .eq('id', customerId);
      if (error) throw error;
      await fetchCustomers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      return false;
    }
  };

  const deleteCustomer = async (customerId: string): Promise<boolean> => {
    try {
      setError(null);
      const { error } = await supabase.from('customers').delete().eq('id', customerId);
      if (error) throw error;
      await fetchCustomers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      return false;
    }
  };

  /**
   * Points changes go through the loyalty ledger — the DB trigger updates the
   * cached balance atomically (and rejects balances below zero).
   * Positive points = adjustment/bonus, negative = redemption.
   */
  const adjustLoyaltyPoints = async (
    customerId: string,
    points: number,
    note?: string
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      setError(null);
      if (!points) return { ok: false, message: 'Points must be non-zero' };
      const { error } = await supabase.from('loyalty_transactions').insert({
        customer_id: customerId,
        points,
        type: points < 0 ? 'redeem' : 'adjust',
        note: note || (points < 0 ? 'redeemed at counter' : 'manual adjustment'),
      });
      if (error) throw error;
      await fetchCustomers();
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update points';
      setError(message);
      return { ok: false, message };
    }
  };

  return {
    customers,
    loading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    adjustLoyaltyPoints,
    refetch: fetchCustomers,
  };
}
