import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Settings {
  tax_rate: number;
  currency: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  loyalty_points_rate: number;
  low_stock_threshold: number;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('settings')
        .select('key, value');

      if (fetchError) throw fetchError;

      // Convert array of key-value pairs to settings object
      const settingsObj: any = {};
      data?.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });

      // Parse numeric values
      const parsedSettings: Settings = {
        tax_rate: parseFloat(settingsObj.tax_rate || '11.0'),
        currency: settingsObj.currency || 'LBP',
        store_name: settingsObj.store_name || 'CraveBites',
        store_address: settingsObj.store_address || '',
        store_phone: settingsObj.store_phone || '',
        loyalty_points_rate: parseFloat(settingsObj.loyalty_points_rate || '1.0'),
        low_stock_threshold: parseInt(settingsObj.low_stock_threshold || '10')
      };

      setSettings(parsedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Convert settings object to array of key-value pairs for upsert
      const updates = Object.entries(newSettings).map(([key, value]) => ({
        key,
        value: value.toString(),
        updated_at: new Date().toISOString()
      }));

      // Upsert each setting
      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });

        if (error) throw error;
      }

      // Update local state
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      console.error('Error updating settings:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, error, updateSettings, refetch: fetchSettings };
}