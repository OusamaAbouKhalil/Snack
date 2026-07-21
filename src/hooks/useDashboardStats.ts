
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  lowStockItems: number;
  totalItemsOrdered: number;
  onlineOrdersToday: number;
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
  newCustomersDaily: Array<{ date: string; count: number; cumulative: number }>;
}

export function useDashboardStats(initialDays: number = 7) {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayOrders: 0,
    pendingOrders: 0,
    totalCustomers: 0,
    lowStockItems: 0,
    totalItemsOrdered: 0,
    onlineOrdersToday: 0,
    recentOrders: [],
    topProducts: [],
    dailyItemsOrdered: [],
    topProductsByDate: [],
    dailySales: [],
    newCustomersDaily: []
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

      // Parallelize independent queries
      const [
        { data: todayOrders, error: todayError },
        { count: pendingCount, error: pendingError },
        { count: customersCount, error: customersError },
        { data: inventory, error: inventoryError },
        { count: onlineTodayCount, error: onlineTodayError }
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('total_amount, delivery_fee')
          .eq('status', 'completed')
          .gte('created_at', today),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('inventory')
          .select('stock_quantity, min_stock_level'),
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('source', 'online')
          .gte('created_at', today)
      ]);

      if (todayError) throw todayError;
      if (pendingError) throw pendingError;
      if (customersError) throw customersError;
      if (inventoryError) throw inventoryError;
      if (onlineTodayError) throw onlineTodayError;

      // Delivery fee is collected for the delivery company, not store revenue.
      const todaySales = todayOrders?.reduce((sum, order) => sum + order.total_amount - (order.delivery_fee || 0), 0) || 0;

      const lowStockItems = inventory?.filter(item => 
        item.stock_quantity <= item.min_stock_level && item.stock_quantity > 0
      ).length || 0;

      // Recent orders and items ordered today in parallel
      const [
        { data: recentOrders, error: recentError },
        { data: itemsOrderedToday, error: itemsError }
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, customer_name, total_amount, payment_method, status')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('order_items')
          .select('quantity, orders!inner(status)')
          .neq('orders.status', 'cancelled')
          .gte('created_at', today)
      ]);

      if (recentError) throw recentError;
      if (itemsError) throw itemsError;

      const totalItemsOrdered = itemsOrderedToday?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      // One range fetch covers daily items, daily sales, and top products.
      // Cancelled orders keep their items now, so exclude them here.
      const { data: rangeItems, error: rangeError } = await supabase
        .from('order_items')
        .select('product_id, quantity, total_price, created_at, orders!inner(status)')
        .neq('orders.status', 'cancelled')
        .gte('created_at', daysAgo);

      if (rangeError) throw rangeError;
      const dailyItemsData = rangeItems;
      const dailySalesData = rangeItems;

      const dailyItemsOrdered = Array.from({ length: daysFilter }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const quantity = dailyItemsData
          ?.filter(item => item.created_at.toString().startsWith(dateStr))
          .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
        return { date: dateStr, quantity };
      }).reverse();

      const dailySales = Array.from({ length: daysFilter }, (_, i) => {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const total = dailySalesData
          ?.filter(item => item.created_at.toString().startsWith(dateStr))
          .reduce((sum, item) => sum + (item.total_price || 0), 0) || 0;
        return { date: dateStr, total };
      }).reverse();

      // Customer growth: new signups per day over the range, plus a running
      // total starting from however many existed before the range began.
      const [
        { data: newCustomersInRange, error: newCustomersError },
        { count: customersBeforeRange, error: beforeRangeError }
      ] = await Promise.all([
        supabase
          .from('customers')
          .select('created_at')
          .gte('created_at', daysAgo),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .lt('created_at', daysAgo)
      ]);

      if (newCustomersError) throw newCustomersError;
      if (beforeRangeError) throw beforeRangeError;

      let runningTotal = customersBeforeRange || 0;
      const newCustomersDaily = Array.from({ length: daysFilter }, (_, i) => {
        const date = new Date(Date.now() - (daysFilter - 1 - i) * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const count = newCustomersInRange
          ?.filter(c => c.created_at.toString().startsWith(dateStr)).length || 0;
        runningTotal += count;
        return { date: dateStr, count, cumulative: runningTotal };
      });

      // Process in memory instead of multiple queries
      const productQuantities = rangeItems?.reduce((acc, item) => {
        acc[item.product_id] = (acc[item.product_id] || 0) + (item.quantity || 0);
        return acc;
      }, {} as Record<string, number>) || {};

      const topProductIds = Object.entries(productQuantities)
        .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
        .slice(0, 10)
        .map(([id]) => id);

      // Fetch product details only for top 10
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, price')
        .in('id', topProductIds);

      if (productsError) throw productsError;

      // Use same data for topProductsByDate (no need for separate query)
      const topProductQuantities = productQuantities;

      const topProducts = productsData?.map(product => ({
        id: product.id,
        name: product.name || 'Unknown Product',
        price: product.price || 0,
        total_sold: productQuantities[product.id] || 0
      })) || [];

      const sortedTopProducts = topProductIds
        .map(id => topProducts.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p != null);

      const sortedTopProductsByDate = topProductIds
        .map(id => {
          const product = productsData?.find(p => p.id === id);
          return product ? {
            id: product.id,
            name: product.name || 'Unknown Product',
            total_sold: topProductQuantities[product.id] || 0
          } : null;
        })
        .filter((p): p is NonNullable<typeof p> => p != null);

      setStats({
        todaySales,
        todayOrders: todayOrders?.length || 0,
        pendingOrders: pendingCount || 0,
        totalCustomers: customersCount || 0,
        lowStockItems,
        totalItemsOrdered,
        onlineOrdersToday: onlineTodayCount || 0,
        recentOrders: recentOrders || [],
        topProducts: sortedTopProducts,
        dailyItemsOrdered,
        topProductsByDate: sortedTopProductsByDate,
        dailySales,
        newCustomersDaily
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
