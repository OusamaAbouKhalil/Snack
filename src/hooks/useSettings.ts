import { useState, useEffect } from 'react';

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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      // For now, we'll use default settings
      // In a real implementation, you'd have a settings table
      const defaultSettings: Settings = {
        tax_rate: 11.0,
        currency: 'USD',
        store_name: 'Crêpe Café',
        store_address: '123 Main Street, City, State 12345',
        store_phone: '(555) 123-4567',
        loyalty_points_rate: 1.0,
        low_stock_threshold: 10
      };

      setSettings(defaultSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>): Promise<boolean> => {
    try {
      // In a real implementation, you'd update the database
      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  return { settings, loading, updateSettings, refetch: fetchSettings };
}