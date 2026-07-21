import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { DeliveryZone, DeliveryQuote } from '../types';

export type DeliveryZoneInput = Omit<DeliveryZone, 'id' | 'created_at'>;

export function useDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) setError(error.message);
    else setZones((data as DeliveryZone[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const createZone = async (input: DeliveryZoneInput) => {
    const { error } = await supabase.from('delivery_zones').insert(input);
    if (!error) await fetchZones();
    return { error };
  };

  const updateZone = async (id: string, input: Partial<DeliveryZoneInput>) => {
    const { error } = await supabase.from('delivery_zones').update(input).eq('id', id);
    if (!error) await fetchZones();
    return { error };
  };

  const deleteZone = async (id: string) => {
    const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
    if (!error) await fetchZones();
    return { error };
  };

  const quotePoint = async (lat: number, lng: number): Promise<DeliveryQuote | null> => {
    const { data, error } = await supabase.rpc('quote_delivery_fee', { p_lat: lat, p_lng: lng });
    if (error) return null;
    return data as DeliveryQuote;
  };

  return { zones, loading, error, createZone, updateZone, deleteZone, quotePoint, refetch: fetchZones };
}
