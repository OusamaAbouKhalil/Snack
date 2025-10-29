import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

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

      // Fetch customers and order stats in parallel
      const [customersResult, ordersResult] = await Promise.all([
        supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('customer_name, total_amount')
      ]);

      if (customersResult.error) throw customersResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const customers = customersResult.data || [];
      const orders = ordersResult.data || [];

      // Process order stats in memory - much faster than N queries
      const orderStats = orders.reduce((acc, order) => {
        const name = order.customer_name;
        if (!name) return acc;
        
        if (!acc[name]) {
          acc[name] = { count: 0, total: 0 };
        }
        acc[name].count += 1;
        acc[name].total += order.total_amount || 0;
        return acc;
      }, {} as Record<string, { count: number; total: number }>);

      // Map customers with their stats
      const customersWithStats = customers.map(customer => ({
        ...customer,
        total_orders: orderStats[customer.name]?.count || 0,
        total_spent: orderStats[customer.name]?.total || 0
      }));

      setCustomers(customersWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async (customerData: Omit<Customer, 'id' | 'total_orders' | 'total_spent' | 'created_at'>): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('customers')
        .insert(customerData);

      if (error) throw error;

      await fetchCustomers(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      console.error('Error creating customer:', err);
      return false;
    }
  };

  const updateCustomer = async (customerId: string, customerData: Partial<Customer>): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId);

      if (error) throw error;

      await fetchCustomers(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update customer');
      console.error('Error updating customer:', err);
      return false;
    }
  };

  const deleteCustomer = async (customerId: string): Promise<boolean> => {
    try {
      setError(null);

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      await fetchCustomers(); // Refresh the list
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      console.error('Error deleting customer:', err);
      return false;
    }
  };

  const updateLoyaltyPoints = async (customerId: string, pointsToAdd: number): Promise<boolean> => {
    try {
      setError(null);

      // Get current points
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return false;

      const newPoints = customer.loyalty_points + pointsToAdd;

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('id', customerId);

      if (error) throw error;

      // Update local state
      setCustomers(prev => 
        prev.map(c => 
          c.id === customerId 
            ? { ...c, loyalty_points: newPoints }
            : c
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update loyalty points');
      console.error('Error updating loyalty points:', err);
      return false;
    }
  };

  return { 
    customers, 
    loading, 
    error, 
    createCustomer,
    updateCustomer,
    deleteCustomer,
    updateLoyaltyPoints, 
    refetch: fetchCustomers 
  };
}