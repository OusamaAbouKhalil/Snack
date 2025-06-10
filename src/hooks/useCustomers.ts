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

      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Calculate total orders and spent for each customer
      const customersWithStats = await Promise.all(
        (data || []).map(async (customer) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('customer_name', customer.name);

          const totalOrders = orders?.length || 0;
          const totalSpent = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

          return {
            ...customer,
            total_orders: totalOrders,
            total_spent: totalSpent
          };
        })
      );

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