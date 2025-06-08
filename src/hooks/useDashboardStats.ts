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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Today's sales and orders
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', today);

      const todaySales = todayOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      // Pending orders
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'pending');

      // Recent orders with status
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, payment_method, status')
        .order('created_at', { ascending: false })
        .limit(5);

      // Mock data for other stats (would need additional tables in real implementation)
      setStats({
        todaySales,
        todayOrders: todayOrders?.length || 0,
        pendingOrders: pendingOrders?.length || 0,
        totalCustomers: 150, // Mock data
        lowStockItems: 3, // Mock data
        recentOrders: recentOrders || [],
        topProducts: []
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
}