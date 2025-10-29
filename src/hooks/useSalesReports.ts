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

  // Chunk size for batching queries to avoid URL length limits
  // With UUIDs (36 chars each), 50 items = ~2000+ chars in URL, which is safe
  const BATCH_CHUNK_SIZE = 50;

  // Helper function to batch array operations
  const chunkArray = <T,>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Helper function to batch query with .in()
  const batchQuery = async <T,>(
    table: string,
    select: string,
    column: string,
    values: string[],
    chunkSize: number = BATCH_CHUNK_SIZE
  ): Promise<T[]> => {
    if (!values || values.length === 0) {
      return [];
    }

    const chunks = chunkArray(values, chunkSize);
    const allResults: T[] = [];

    for (const chunk of chunks) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .in(column, chunk);

      if (error) throw error;
      if (data && Array.isArray(data)) {
        allResults.push(...(data as T[]));
      }
    }

    return allResults;
  };

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

      if (!ordersData || ordersData.length === 0) {
        setReports({
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          totalItemsSold: 0,
          topProducts: [],
          salesByCategory: [],
          dailySales: []
        });
        return;
      }

      const orderIds = ordersData.map(o => o.id);
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const totalOrders = ordersData.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Total items sold - using batch query
      const itemsData = await batchQuery<{ quantity: number; order_id: string }>(
        'order_items',
        'quantity, order_id',
        'order_id',
        orderIds
      );

      const totalItemsSold = itemsData.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Top products - using batch query
      const topProductsData = await batchQuery<{ product_id: string; quantity: number; total_price: number }>(
        'order_items',
        'product_id, quantity, total_price',
        'order_id',
        orderIds
      );

      const productQuantities = topProductsData.reduce((acc, item) => {
        acc[item.product_id] = {
          quantity: (acc[item.product_id]?.quantity || 0) + (item.quantity || 0),
          total_revenue: (acc[item.product_id]?.total_revenue || 0) + (item.total_price || 0)
        };
        return acc;
      }, {} as Record<string, { quantity: number; total_revenue: number }>);

      const topProductIds = Object.entries(productQuantities)
        .sort(([, a], [, b]) => b.quantity - a.quantity)
        .slice(0, 50)
        .map(([id]) => id);

      let productsData: Array<{ id: string; name: string }> = [];
      if (topProductIds.length > 0) {
        const { data, error: productsError } = await supabase
          .from('products')
          .select('id, name')
          .in('id', topProductIds);

        if (productsError) throw productsError;
        productsData = data || [];
      }

      const topProducts = topProductIds
        .map(id => {
          const product = productsData.find(p => p.id === id);
          return product ? {
            id,
            name: product.name || 'Unknown Product',
            quantity_sold: productQuantities[id]?.quantity || 0,
            total_revenue: productQuantities[id]?.total_revenue || 0
          } : null;
        })
        .filter((p): p is NonNullable<typeof p> => p != null);

      // Sales by category - using batch query
      const categoryData = await batchQuery<{ order_id: string; total_price: number; products: { category_id: string } | null }>(
        'order_items',
        'order_id, total_price, products!inner(category_id)',
        'order_id',
        orderIds
      );

      const categoryStats = categoryData.reduce((acc, item) => {
        const categoryId = item.products?.category_id;
        if (categoryId) {
          if (!acc[categoryId]) {
            acc[categoryId] = { total_revenue: 0, order_ids: new Set<string>() };
          }
          acc[categoryId].total_revenue += item.total_price || 0;
          acc[categoryId].order_ids.add(item.order_id);
        }
        return acc;
      }, {} as Record<string, { total_revenue: number; order_ids: Set<string> }>);

      const categoryIds = Object.keys(categoryStats);
      let categoriesData: Array<{ id: string; name: string }> = [];
      if (categoryIds.length > 0) {
        const { data, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds);

        if (categoriesError) throw categoriesError;
        categoriesData = data || [];
      }

      const salesByCategory = categoryIds
        .map(id => {
          const category = categoriesData.find(c => c.id === id);
          return category ? {
            category_id: id,
            category_name: category.name || 'Unknown Category',
            total_revenue: categoryStats[id].total_revenue,
            total_orders: categoryStats[id].order_ids.size
          } : null;
        })
        .filter((c): c is NonNullable<typeof c> => c != null);

      // Daily sales - using batch query
      const dailySalesData = await batchQuery<{ total_price: number; order_id: string; quantity: number }>(
        'order_items',
        'total_price, order_id, quantity',
        'order_id',
        orderIds
      );

      // Create a map of order IDs to order dates for daily sales calculation
      const orderDateMap = new Map<string, string>();
      ordersData.forEach(order => {
        orderDateMap.set(order.id, order.created_at);
      });

      const dateRangeDays = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      const dailySales = Array.from({ length: dateRangeDays }, (_, i) => {
        const date = new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        // Filter items by matching their order's created_at date
        const dayItems = dailySalesData.filter(item => {
          const orderDate = orderDateMap.get(item.order_id);
          if (!orderDate) return false;
          const orderDateStr = typeof orderDate === 'string' 
            ? orderDate.split('T')[0] 
            : new Date(orderDate).toISOString().split('T')[0];
          return orderDateStr === dateStr;
        });
        const total_revenue = dayItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
        const total_items = dayItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const orderIds = new Set(dayItems.map(item => item.order_id));
        return {
          date: dateStr,
          total_revenue,
          total_orders: orderIds.size,
          total_items
        };
      });

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