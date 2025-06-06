import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SalesReports {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItemsSold: number;
  topProducts: Array<{
    id: string;
    name: string;
    quantity_sold: number;
    total_revenue: number;
  }>;
  salesByCategory: Array<{
    category_id: string;
    category_name: string;
    total_revenue: number;
    total_orders: number;
  }>;
  dailySales: Array<{
    date: string;
    total_revenue: number;
    total_orders: number;
    total_items: number;
  }>;
}

export function useSalesReports(startDate: string, endDate: string) {
  const [reports, setReports] = useState<SalesReports>({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalItemsSold: 0,
    topProducts: [],
    salesByCategory: [],
    dailySales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Fetch orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');

      if (ordersError) throw ordersError;

      const totalRevenue = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Mock data for other reports (would need more complex queries in real implementation)
      const mockReports: SalesReports = {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalItemsSold: 156,
        topProducts: [
          { id: '1', name: 'Classic Nutella', quantity_sold: 45, total_revenue: 382.50 },
          { id: '2', name: 'Strawberry Banana', quantity_sold: 32, total_revenue: 312.00 },
          { id: '3', name: 'Ham & Cheese', quantity_sold: 28, total_revenue: 294.00 }
        ],
        salesByCategory: [
          { category_id: '1', category_name: 'Sweet Crepes', total_revenue: 850.50, total_orders: 45 },
          { category_id: '2', category_name: 'Savory Crepes', total_revenue: 620.25, total_orders: 32 },
          { category_id: '3', category_name: 'Beverages', total_revenue: 180.75, total_orders: 28 }
        ],
        dailySales: [
          { date: '2024-12-06', total_revenue: 245.50, total_orders: 12, total_items: 28 },
          { date: '2024-12-05', total_revenue: 189.25, total_orders: 9, total_items: 22 },
          { date: '2024-12-04', total_revenue: 312.75, total_orders: 15, total_items: 35 }
        ]
      };

      setReports(mockReports);
    } catch (error) {
      console.error('Error fetching sales reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return { reports, loading, refetch: fetchReports };
}