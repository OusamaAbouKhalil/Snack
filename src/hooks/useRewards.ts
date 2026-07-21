import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Reward, RewardProgress } from '../types';

export type RewardInput = Omit<Reward, 'id' | 'created_at'>;

export function useRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setRewards((data as Reward[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const createReward = async (input: RewardInput) => {
    const { error } = await supabase.from('rewards').insert(input);
    if (!error) await fetchRewards();
    return { error };
  };

  const updateReward = async (id: string, input: Partial<RewardInput>) => {
    const { error } = await supabase.from('rewards').update(input).eq('id', id);
    if (!error) await fetchRewards();
    return { error };
  };

  const deleteReward = async (id: string) => {
    const { error } = await supabase.from('rewards').delete().eq('id', id);
    if (!error) await fetchRewards();
    return { error };
  };

  const getRewardProgress = async (customerId: string, rewardId: string): Promise<RewardProgress | null> => {
    const { data, error } = await supabase.rpc('get_reward_progress', {
      p_customer_id: customerId,
      p_reward_id: rewardId,
    });
    if (error) return null;
    return data as RewardProgress;
  };

  return { rewards, loading, error, createReward, updateReward, deleteReward, getRewardProgress, refetch: fetchRewards };
}
