import React, { useState } from 'react';
import { Save, Percent, DollarSign, Store, Bell, AlertCircle, TrendingUp } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';

export function SettingsPanel() {
  const { settings, loading, error, updateSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tax_rate: settings?.tax_rate?.toString() || '11',
    currency: settings?.currency || 'LBP',
    store_name: settings?.store_name || 'BeSweet',
    store_address: settings?.store_address || '',
    store_phone: settings?.store_phone || '',
    loyalty_points_rate: settings?.loyalty_points_rate?.toString() || '1',
    low_stock_threshold: settings?.low_stock_threshold?.toString() || '10',
    usd_to_lbp_rate: settings?.usd_to_lbp_rate?.toString() || '90000'
  });

  // Update form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData({
        tax_rate: settings.tax_rate.toString(),
        currency: settings.currency,
        store_name: settings.store_name,
        store_address: settings.store_address,
        store_phone: settings.store_phone,
        loyalty_points_rate: settings.loyalty_points_rate.toString(),
        low_stock_threshold: settings.low_stock_threshold.toString(),
        usd_to_lbp_rate: settings.usd_to_lbp_rate.toString()
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const settingsData = {
      tax_rate: parseFloat(formData.tax_rate),
      currency: formData.currency,
      store_name: formData.store_name,
      store_address: formData.store_address,
      store_phone: formData.store_phone,
      loyalty_points_rate: parseFloat(formData.loyalty_points_rate),
      low_stock_threshold: parseInt(formData.low_stock_threshold),
      usd_to_lbp_rate: parseFloat(formData.usd_to_lbp_rate)
    };

    const success = await updateSettings(settingsData);
    if (success) {
      alert('Settings updated successfully!');
    } else {
      alert('Failed to update settings. Please try again.');
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2 transition-colors duration-300">
        <AlertCircle size={20} />
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1 transition-colors duration-300">Configure your store settings and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Store Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg transition-colors duration-300">
              <Store className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">Store Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                Store Name
              </label>
              <input
                type="text"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.store_phone}
                onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                Store Address
              </label>
              <textarea
                value={formData.store_address}
                onChange={(e) => setFormData({ ...formData, store_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg transition-colors duration-300">
              <DollarSign className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">Financial Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                  required
                />
                <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                Primary Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="LBP">LBP (LBP)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                USD to LBP Rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={formData.usd_to_lbp_rate}
                  onChange={(e) => setFormData({ ...formData, usd_to_lbp_rate: e.target.value })}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                  required
                />
                <TrendingUp className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">Exchange rate for dual currency display</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                Loyalty Points Rate
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.loyalty_points_rate}
                onChange={(e) => setFormData({ ...formData, loyalty_points_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">Points per dollar spent</p>
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-lg transition-colors duration-300">
              <Bell className="text-yellow-600 dark:text-yellow-400" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">Inventory Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 transition-colors duration-300">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">Alert when stock falls below this number</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}