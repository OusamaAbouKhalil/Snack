import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LoyaltyTransaction } from '../types';

export interface LoyaltyTransactionRow extends LoyaltyTransaction {
  customers?: { name: string } | null;
  orders?: { order_number: string } | null;
}

export function useLoyalty(limit = 50) {
  const [transactions, setTransactions] = useState<LoyaltyTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select('*, customers(name), orders(order_number)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) setError(error.message);
    else setTransactions((data as LoyaltyTransactionRow[]) || []);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Manual adjustment: insert into the ledger; DB trigger updates the cached
  // balance and rejects adjustments that would push it negative.
  const adjustPoints = async (customerId: string, points: number, note: string) => {
    const { error } = await supabase.from('loyalty_transactions').insert({
      customer_id: customerId,
      points,
      type: 'adjust',
      note: note || 'manual adjustment',
    });
    if (!error) await fetchTransactions();
    return { error };
  };

  return { transactions, loading, error, adjustPoints, refetch: fetchTransactions };
}
