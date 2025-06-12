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

      // Parse numeric values with validation
      const parsedSettings: Settings = {
        tax_rate: Math.max(0, parseFloat(settingsObj.tax_rate || '8.0')),
        currency: settingsObj.currency || 'USD',
        store_name: settingsObj.store_name || 'Crêpe Café',
        store_address: settingsObj.store_address || '',
        store_phone: settingsObj.store_phone || '',
        loyalty_points_rate: Math.max(0, parseFloat(settingsObj.loyalty_points_rate || '1.0')),
        low_stock_threshold: Math.max(0, parseInt(settingsObj.low_stock_threshold || '10'))
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

      // Validate settings before updating
      const validatedSettings: any = {};
      
      Object.entries(newSettings).forEach(([key, value]) => {
        if (key === 'tax_rate' || key === 'loyalty_points_rate') {
          const numValue = parseFloat(value as string);
          if (isNaN(numValue) || numValue < 0) {
            throw new Error(`${key} must be a valid positive number`);
          }
          validatedSettings[key] = numValue;
        } else if (key === 'low_stock_threshold') {
          const numValue = parseInt(value as string);
          if (isNaN(numValue) || numValue < 0) {
            throw new Error(`${key} must be a valid positive integer`);
          }
          validatedSettings[key] = numValue;
        } else {
          validatedSettings[key] = value;
        }
      });

      // Convert settings object to array of key-value pairs for upsert
      const updates = Object.entries(validatedSettings).map(([key, value]) => ({
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
      setSettings(prev => prev ? { ...prev, ...validatedSettings } : null);
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