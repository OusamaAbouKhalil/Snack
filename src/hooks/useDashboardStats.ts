import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  lowStockItems: number;
  recentOrders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    total_amount: number;
    payment_method: string;
    status: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    price: number;
    total_sold: number;
  }>;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    lowStockItems: 0,
    recentOrders: [],
    topProducts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date().toISOString().split('T')[0];

      // Today's sales and orders
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', today);

      if (todayError) throw todayError;

      const todaySales = todayOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      // Pending orders
      const { data: pendingOrders, error: pendingError } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Total customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id');

      if (customersError) throw customersError;

      // Low stock items
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('stock_quantity, min_stock_level');

      if (inventoryError) throw inventoryError;

      const lowStockItems = inventory?.filter(item => 
        item.stock_quantity <= item.min_stock_level && item.stock_quantity > 0
      ).length || 0;

      // Recent orders
      const { data: recentOrders, error: recentError } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, payment_method, status')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      // Top products (mock data for now - would need order_items aggregation)
      const topProducts = [
        { id: '1', name: 'Classic Nutella', price: 8.50, total_sold: 45 },
        { id: '2', name: 'Strawberry Banana', price: 9.75, total_sold: 32 },
        { id: '3', name: 'Ham & Cheese', price: 10.50, total_sold: 28 }
      ];

      setStats({
        todaySales,
        todayOrders: todayOrders?.length || 0,
        pendingOrders: pendingOrders?.length || 0,
        totalCustomers: customers?.length || 0,
        lowStockItems,
        recentOrders: recentOrders || [],
        topProducts
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refetch: fetchStats };
}