
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  lowStockItems: number;
  totalItemsOrdered: number;
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
  dailyItemsOrdered: Array<{ date: string; quantity: number }>;
  topProductsByDate: Array<{ id: string; name: string; total_sold: number }>;
  dailySales: Array<{ date: string; total: number }>;
}

export function useDashboardStats(initialDays: number = 7) {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    lowStockItems: 0,
    totalItemsOrdered: 0,
    recentOrders: [],
    topProducts: [],
    dailyItemsOrdered: [],
    topProductsByDate: [],
    dailySales: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(initialDays);

  const fetchStats = async (daysFilter: number) => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      const daysAgo = new Date(Date.now() - daysFilter * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Today's sales and orders
      const { data: todayOrders, error: todayError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
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

      // Total items ordered today
      const { data: itemsOrderedToday, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity')
        .gte('created_at', today);

      if (itemsError) throw itemsError;

      const totalItemsOrdered = itemsOrderedToday?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      // Daily items ordered (selected days)
      const { data: dailyItemsData, error: dailyItemsError } = await supabase
        .from('order_items')
        .select('quantity, created_at')
        .gte('created_at', daysAgo);

      if (dailyItemsError) throw dailyItemsError;

      const dailyItemsOrdered = Array.from({ length: daysFilter }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const quantity = dailyItemsData
          ?.filter(item => item.created_at.toString().startsWith(dateStr))
          .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        return { date: dateStr, quantity };
      }).reverse();

      // Daily sales (selected days)
      const { data: dailySalesData, error: dailySalesError } = await supabase
        .from('order_items')
        .select('total_price, created_at')
        .gte('created_at', daysAgo);

      if (dailySalesError) throw dailySalesError;

      const dailySales = Array.from({ length: daysFilter }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const total = dailySalesData
          ?.filter(item => item.created_at.toString().startsWith(dateStr))
          .reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
        return { date: dateStr, total };
      }).reverse();

      // Top selling products (all-time)
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .order('quantity', { ascending: false });

      if (orderItemsError) throw orderItemsError;

      const productQuantities = orderItemsData?.reduce((acc, item) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + (item.quantity || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      const topProductIds = Object.entries(productQuantities)
        .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
        .slice(0, 50)
        .map(([id]) => id);

      // Top products by date (selected days)
      const { data: topProductsByDateData, error: topProductsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .gte('created_at', daysAgo)
        .in('product_id', topProductIds);

      if (topProductsError) throw topProductsError;

      const topProductQuantities = topProductsByDateData?.reduce((acc, item) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + (item.quantity || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      // Fetch product details
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', topProductIds);

      if (productsError) throw productsError;

      const topProducts = productsData?.map(product => ({
        id: product.id,
        name: product.name || 'Unknown Product',
        price: product.price || 0,
        total_sold: productQuantities[product.id] || 0
      })) || [];

      const sortedTopProducts = topProductIds
        .map(id => topProducts.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p != null);

      const topProductsByDate = productsData?.map(product => ({
        id: product.id,
        name: product.name || 'Unknown Product',
        total_sold: topProductQuantities[product.id] || 0
      })) || [];

      const sortedTopProductsByDate = topProductIds
        .map(id => topProductsByDate.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p != null);

      setStats({
        todaySales,
        todayOrders: todayOrders?.length || 0,
        pendingOrders: pendingOrders?.length || 0,
        totalCustomers: customers?.length || 0,
        lowStockItems,
        totalItemsOrdered,
        recentOrders: recentOrders || [],
        topProducts: sortedTopProducts,
        dailyItemsOrdered,
        topProductsByDate: sortedTopProductsByDate,
        dailySales
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard stats');
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(days);
  }, [days]);

  return { stats, loading, error, refetch: (newDays?: number) => {
    if (newDays !== undefined && newDays > 0) {
      setDays(newDays);
    } else {
      fetchStats(days);
    }
  } };
}
