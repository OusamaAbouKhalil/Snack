import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { FinancialRecord, ExpenseCategory, DateRange, FinancialStats } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export function useFinancialRecords() {
  const { language } = useLanguage();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<{ type: 'all' | 'month' | 'year' | 'range'; value?: string | DateRange }>({ type: 'all' });

  const fetchCategories = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('expense_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  const buildDateFilter = useCallback(() => {
    if (dateFilter.type === 'all') {
      return {};
    }

    if (dateFilter.type === 'month' && dateFilter.value) {
      const [year, month] = (dateFilter.value as string).split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      return {
        gte: startDate,
        lte: endDate,
      };
    }

    if (dateFilter.type === 'year' && dateFilter.value) {
      const year = dateFilter.value as string;
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      return {
        gte: startDate,
        lte: endDate,
      };
    }

    if (dateFilter.type === 'range' && dateFilter.value) {
      const range = dateFilter.value as DateRange;
      return {
        gte: range.from,
        lte: range.to,
      };
    }

    return {};
  }, [dateFilter]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dateConditions = buildDateFilter();
      let query = supabase
        .from('financial_records')
        .select(`
          *,
          category:expense_categories(*)
        `)
        .order('record_date', { ascending: false });

      if (dateConditions.gte) {
        query = query.gte('record_date', dateConditions.gte);
      }
      if (dateConditions.lte) {
        query = query.lte('record_date', dateConditions.lte);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const recordsWithCategories = (data || []).map((record: any) => ({
        ...record,
        category: Array.isArray(record.category) ? record.category[0] : record.category,
      }));

      setRecords(recordsWithCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch records');
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  }, [buildDateFilter]);

  const fetchProfits = useCallback(async (startDate: string, endDate: string): Promise<number> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (fetchError) throw fetchError;

      return (data || []).reduce((sum, order) => sum + order.total_amount, 0);
    } catch (err) {
      console.error('Error fetching profits:', err);
      return 0;
    }
  }, []);

  const calculateStats = useCallback(async (): Promise<FinancialStats> => {
    const dateConditions = buildDateFilter();
    const startDate = dateConditions.gte || '1970-01-01';
    const endDate = dateConditions.lte || new Date().toISOString().split('T')[0];

    const expenses = records.filter(r => r.type === 'expense');
    const totalExpenses = expenses.reduce((sum, r) => sum + r.amount, 0);
    const totalProfits = await fetchProfits(startDate, endDate);
    const netProfit = totalProfits - totalExpenses;

    // Expenses by category
    const categoryMap = new Map<string | null, number>();
    expenses.forEach(expense => {
      const categoryId = expense.category_id || 'uncategorized';
      categoryMap.set(categoryId, (categoryMap.get(categoryId) || 0) + expense.amount);
    });

    const expensesByCategory = Array.from(categoryMap.entries()).map(([categoryId, total]) => {
      const category = categories.find(c => c.id === categoryId);
      const categoryName = category
        ? (language === 'ar' ? category.name_ar : category.name_en)
        : (categoryId === 'uncategorized' ? (language === 'ar' ? 'غير مصنف' : 'Uncategorized') : '');
      return {
        category_id: categoryId === 'uncategorized' ? null : categoryId,
        category_name: categoryName,
        total,
      };
    });

    // Expenses over time (daily)
    const expensesOverTimeMap = new Map<string, { expenses: number; profits: number }>();
    
    expenses.forEach(expense => {
      const date = expense.record_date;
      const current = expensesOverTimeMap.get(date) || { expenses: 0, profits: 0 };
      current.expenses += expense.amount;
      expensesOverTimeMap.set(date, current);
    });

    // Fetch daily profits
    const { data: dailyOrders } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    dailyOrders?.forEach(order => {
      const date = order.created_at.split('T')[0];
      const current = expensesOverTimeMap.get(date) || { expenses: 0, profits: 0 };
      current.profits += order.total_amount;
      expensesOverTimeMap.set(date, current);
    });

    const expensesOverTime = Array.from(expensesOverTimeMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Monthly breakdown
    const monthlyMap = new Map<string, { expenses: number; profits: number }>();
    expenses.forEach(expense => {
      const month = expense.record_date.substring(0, 7); // YYYY-MM
      const current = monthlyMap.get(month) || { expenses: 0, profits: 0 };
      current.expenses += expense.amount;
      monthlyMap.set(month, current);
    });

    dailyOrders?.forEach(order => {
      const month = order.created_at.substring(0, 7);
      const current = monthlyMap.get(month) || { expenses: 0, profits: 0 };
      current.profits += order.total_amount;
      monthlyMap.set(month, current);
    });

    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        expenses: data.expenses,
        profits: data.profits,
        net: data.profits - data.expenses,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Yearly breakdown
    const yearlyMap = new Map<string, { expenses: number; profits: number }>();
    expenses.forEach(expense => {
      const year = expense.record_date.substring(0, 4);
      const current = yearlyMap.get(year) || { expenses: 0, profits: 0 };
      current.expenses += expense.amount;
      yearlyMap.set(year, current);
    });

    dailyOrders?.forEach(order => {
      const year = order.created_at.substring(0, 4);
      const current = yearlyMap.get(year) || { expenses: 0, profits: 0 };
      current.profits += order.total_amount;
      yearlyMap.set(year, current);
    });

    const yearlyBreakdown = Array.from(yearlyMap.entries())
      .map(([year, data]) => ({
        year,
        expenses: data.expenses,
        profits: data.profits,
        net: data.profits - data.expenses,
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return {
      totalExpenses,
      totalProfits,
      netProfit,
      recordsCount: records.length,
      expensesByCategory,
      expensesOverTime,
      monthlyBreakdown,
      yearlyBreakdown,
    };
  }, [records, categories, language, buildDateFilter, fetchProfits]);

  const createRecord = async (record: Omit<FinancialRecord, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: createError } = await supabase
        .from('financial_records')
        .insert([{
          type: record.type,
          category_id: record.category_id || null,
          amount: record.amount,
          description: record.description,
          record_date: record.record_date,
        }])
        .select(`
          *,
          category:expense_categories(*)
        `)
        .single();

      if (createError) throw createError;

      const newRecord = {
        ...data,
        category: Array.isArray(data.category) ? data.category[0] : data.category,
      };

      setRecords(prev => [newRecord, ...prev]);
      return { data: newRecord, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create record';
      return { data: null, error: errorMessage };
    }
  };

  const updateRecord = async (id: string, updates: Partial<FinancialRecord>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('financial_records')
        .update({
          type: updates.type,
          category_id: updates.category_id || null,
          amount: updates.amount,
          description: updates.description,
          record_date: updates.record_date,
        })
        .eq('id', id)
        .select(`
          *,
          category:expense_categories(*)
        `)
        .single();

      if (updateError) throw updateError;

      const updatedRecord = {
        ...data,
        category: Array.isArray(data.category) ? data.category[0] : data.category,
      };

      setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
      return { data: updatedRecord, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update record';
      return { data: null, error: errorMessage };
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setRecords(prev => prev.filter(r => r.id !== id));
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete record';
      return { error: errorMessage };
    }
  };

  const createCategory = async (nameEn: string, nameAr: string) => {
    try {
      const maxOrder = categories.length > 0
        ? Math.max(...categories.map(c => c.display_order))
        : 0;

      const { data, error: createError } = await supabase
        .from('expense_categories')
        .insert([{
          name_en: nameEn,
          name_ar: nameAr,
          display_order: maxOrder + 1,
        }])
        .select()
        .single();

      if (createError) throw createError;

      setCategories(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      return { data: null, error: errorMessage };
    }
  };

  const updateCategory = async (id: string, nameEn: string, nameAr: string) => {
    try {
      const { data, error: updateError } = await supabase
        .from('expense_categories')
        .update({
          name_en: nameEn,
          name_ar: nameAr,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setCategories(prev => prev.map(c => c.id === id ? data : c));
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category';
      return { data: null, error: errorMessage };
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setCategories(prev => prev.filter(c => c.id !== id));
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      return { error: errorMessage };
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    categories,
    loading,
    error,
    dateFilter,
    setDateFilter,
    refetch: fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    createCategory,
    updateCategory,
    deleteCategory,
    calculateStats,
  };
}

