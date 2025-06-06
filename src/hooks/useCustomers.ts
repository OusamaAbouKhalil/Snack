import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  name: string;
  email: string;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // For now, we'll create mock customer data
      // In a real implementation, you'd have a customers table
      const mockCustomers: Customer[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john@example.com',
          loyalty_points: 1250,
          total_orders: 15,
          total_spent: 187.50,
          created_at: '2024-01-15T00:00:00Z'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          loyalty_points: 890,
          total_orders: 12,
          total_spent: 156.80,
          created_at: '2024-02-01T00:00:00Z'
        },
        {
          id: '3',
          name: 'Mike Davis',
          email: 'mike@example.com',
          loyalty_points: 450,
          total_orders: 8,
          total_spent: 98.40,
          created_at: '2024-03-10T00:00:00Z'
        }
      ];

      setCustomers(mockCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLoyaltyPoints = async (customerId: string, pointsToAdd: number): Promise<boolean> => {
    try {
      // In a real implementation, you'd update the database
      setCustomers(prev => 
        prev.map(customer => 
          customer.id === customerId 
            ? { ...customer, loyalty_points: customer.loyalty_points + pointsToAdd }
            : customer
        )
      );
      return true;
    } catch (error) {
      console.error('Error updating loyalty points:', error);
      return false;
    }
  };

  return { customers, loading, updateLoyaltyPoints, refetch: fetchCustomers };
}