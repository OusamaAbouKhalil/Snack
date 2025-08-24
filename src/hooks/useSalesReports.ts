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
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Total revenue and orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', `${endDate}T23:59:59`);

      if (ordersError) throw ordersError;

      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
      const totalOrders = ordersData?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Total items sold
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, order_id')
        .in('order_id', ordersData?.map(o => o.id) || []);

      if (itemsError) throw itemsError;

      const totalItemsSold = itemsData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      // Top products
      const { data: topProductsData, error: topProductsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, total_price')
        .in('order_id', ordersData?.map(o => o.id) || []);

      if (topProductsError) throw topProductsError;

      const productQuantities = topProductsData?.reduce((acc, item) => {
        acc[item.product_id] = {
          quantity: (acc[item.product_id]?.quantity || 0) + (item.quantity || 0),
          total_revenue: (acc[item.product_id]?.total_revenue || 0) + (item.total_price || 0)
        };
        return acc;
      }, {} as Record<string, { quantity: number; total_revenue: number }>) || {};

      const topProductIds = Object.entries(productQuantities)
        .sort(([, a], [, b]) => b.quantity - a.quantity)
        .slice(0, 50)
        .map(([id]) => id);

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('id', topProductIds);

      if (productsError) throw productsError;

      const topProducts = topProductIds
        .map(id => {
          const product = productsData?.find(p => p.id === id);
          return product ? {
            id,
            name: product.name || 'Unknown Product',
            quantity_sold: productQuantities[id]?.quantity || 0,
            total_revenue: productQuantities[id]?.total_revenue || 0
          } : null;
        })
        .filter((p): p is NonNullable<typeof p> => p != null);

      // Sales by category
      const { data: categoryData, error: categoryError } = await supabase
        .from('order_items')
        .select('order_id, total_price, products!inner(category_id)')
        .in('order_id', ordersData?.map(o => o.id) || []);

      if (categoryError) throw categoryError;

      console.log('Category Data:', JSON.stringify(categoryData, null, 2));

      const categoryStats = categoryData?.reduce((acc, item) => {
        const categoryId = item.products?.category_id;
        if (categoryId) {
          if (!acc[categoryId]) {
            acc[categoryId] = { total_revenue: 0, order_ids: new Set<string>() };
          }
          acc[categoryId].total_revenue += item.total_price || 0;
          acc[categoryId].order_ids.add(item.order_id);
        }
        return acc;
      }, {} as Record<string, { total_revenue: number; order_ids: Set<string> }>) || {};

      console.log('Category Stats:', JSON.stringify(categoryStats, null, 2));

      const categoryIds = Object.keys(categoryStats);
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', categoryIds);

      if (categoriesError) throw categoriesError;

      console.log('Categories Data:', JSON.stringify(categoriesData, null, 2));

      const salesByCategory = categoryIds
        .map(id => {
          const category = categoriesData?.find(c => c.id === id);
          return category ? {
            category_id: id,
            category_name: category.name || 'Unknown Category',
            total_revenue: categoryStats[id].total_revenue,
            total_orders: categoryStats[id].order_ids.size
          } : null;
        })
        .filter((c): c is NonNullable<typeof c> => c != null);

      // Daily sales
      const { data: dailySalesData, error: dailySalesError } = await supabase
        .from('order_items')
        .select('total_price, created_at, order_id, quantity')
        .in('order_id', ordersData?.map(o => o.id) || []);

      if (dailySalesError) throw dailySalesError;

      const dateRangeDays = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const dailySales = Array.from({ length: dateRangeDays }, (_, i) => {
        const date = new Date(new Date(endDate).getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayItems = dailySalesData?.filter(item => item.created_at.toString().startsWith(dateStr)) || [];
        const total_revenue = dayItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
        const total_items = dayItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const orderIds = new Set(dayItems.map(item => item.order_id));
        return {
          date: dateStr,
          total_revenue,
          total_orders: orderIds.size,
          total_items
        };
      }).reverse();

      setReports({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalItemsSold,
        topProducts,
        salesByCategory,
        dailySales
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sales reports');
      console.error('Error fetching sales reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  return { reports, loading, error, refetch: fetchReports };
}