import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface BusinessHoursRow {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export function useBusinessHours() {
  const [hours, setHours] = useState<BusinessHoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHours = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week', { ascending: true });
    if (error) setError(error.message);
    else setHours((data as BusinessHoursRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHours();
  }, [fetchHours]);

  const saveHours = async (rows: BusinessHoursRow[]) => {
    const { error } = await supabase.from('business_hours').upsert(rows, { onConflict: 'day_of_week' });
    if (!error) await fetchHours();
    return { error };
  };

  return { hours, loading, error, saveHours, refetch: fetchHours };
}
