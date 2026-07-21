import React, { useEffect, useState } from 'react';
import { Save, Percent, DollarSign, Store, Bell, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useBusinessHours, BusinessHoursRow } from '../../hooks/useBusinessHours';
import { useToast } from '../ui/Toast';
import { Card, PageHeader, Button, Field, Input, Select, Textarea, Switch, Spinner } from './ui/Kit';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function SettingsPanel() {
  const { settings, loading, error, updateSettings } = useSettings();
  const { hours, loading: hoursLoading, saveHours } = useBusinessHours();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<BusinessHoursRow[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    if (hours.length > 0) setHoursDraft(hours);
  }, [hours]);

  const updateDay = (day: number, patch: Partial<BusinessHoursRow>) => {
    setHoursDraft((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)));
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    const { error } = await saveHours(hoursDraft);
    setSavingHours(false);
    if (error) toast.error(error.message);
    else toast.success('Business hours updated');
  };
  const [formData, setFormData] = useState({
    tax_rate: settings?.tax_rate?.toString() || '11',
    currency: settings?.currency || 'LBP',
    store_name: settings?.store_name || 'Mat3amji',
    store_address: settings?.store_address || '',
    store_phone: settings?.store_phone || '',
    loyalty_points_rate: settings?.loyalty_points_rate?.toString() || '1',
    low_stock_threshold: settings?.low_stock_threshold?.toString() || '10',
    usd_to_lbp_rate: settings?.usd_to_lbp_rate?.toString() || '90000',
    delivery_fee: settings?.delivery_fee?.toString() || '0'
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
        usd_to_lbp_rate: settings.usd_to_lbp_rate.toString(),
        delivery_fee: settings.delivery_fee.toString()
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
      usd_to_lbp_rate: parseFloat(formData.usd_to_lbp_rate),
      delivery_fee: parseFloat(formData.delivery_fee)
    };

    const success = await updateSettings(settingsData);
    if (success) {
      toast.success('Settings updated successfully!');
    } else {
      toast.error('Failed to update settings. Please try again.');
    }

    setSaving(false);
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
        <AlertCircle size={20} />
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Configure your store settings and preferences" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Information */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <Store className="text-blue-600 dark:text-blue-400" size={19} />
            </span>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Store Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Store Name">
              <Input type="text" value={formData.store_name} onChange={(e) => setFormData({ ...formData, store_name: e.target.value })} required />
            </Field>

            <Field label="Phone Number">
              <Input type="tel" value={formData.store_phone} onChange={(e) => setFormData({ ...formData, store_phone: e.target.value })} />
            </Field>

            <div className="md:col-span-2">
              <Field label="Store Address">
                <Textarea value={formData.store_address} onChange={(e) => setFormData({ ...formData, store_address: e.target.value })} rows={3} />
              </Field>
            </div>
          </div>
        </Card>

        {/* Financial Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
              <DollarSign className="text-green-600 dark:text-green-400" size={19} />
            </span>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Financial Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Field label="Tax Rate (%)">
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  className="pe-8"
                  required
                />
                <Percent className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={16} />
              </div>
            </Field>

            <Field label="Primary Currency">
              <Select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="LBP">LBP (LBP)</option>
              </Select>
            </Field>

            <Field label="USD to LBP Rate" helper="Exchange rate for dual currency display">
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  value={formData.usd_to_lbp_rate}
                  onChange={(e) => setFormData({ ...formData, usd_to_lbp_rate: e.target.value })}
                  className="pe-8"
                  required
                />
                <TrendingUp className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={16} />
              </div>
            </Field>

            <Field label="Loyalty Points Rate" helper="Points per dollar spent">
              <Input
                type="number"
                step="0.1"
                min="0"
                value={formData.loyalty_points_rate}
                onChange={(e) => setFormData({ ...formData, loyalty_points_rate: e.target.value })}
                required
              />
            </Field>

            <Field label="Delivery Fee ($)" helper="Flat fee charged on delivery orders">
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
                  className="pe-8"
                  required
                />
                <DollarSign className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" size={16} />
              </div>
            </Field>
          </div>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
              <Bell className="text-amber-600 dark:text-amber-400" size={19} />
            </span>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Inventory Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Low Stock Threshold" helper="Alert when stock falls below this number">
              <Input
                type="number"
                min="0"
                value={formData.low_stock_threshold}
                onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                required
              />
            </Field>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" loading={saving} icon={Save} size="md">
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>

      {/* Business Hours — separate save action, its own table */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
            <Clock className="text-primary-600 dark:text-primary-400" size={19} />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Business Hours</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Online orders are blocked while closed — the POS still works for walk-ins.</p>
          </div>
        </div>

        {hoursLoading ? (
          <Spinner size={24} />
        ) : (
          <div className="space-y-2.5">
            {hoursDraft.map((row) => (
              <div
                key={row.day_of_week}
                className={`flex flex-wrap items-center gap-3 p-3 rounded-xl transition-colors ${
                  row.is_closed ? 'bg-gray-50 dark:bg-gray-900/30 opacity-60' : 'bg-gray-50 dark:bg-gray-900/40'
                }`}
              >
                <span className="w-28 flex-shrink-0 font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {DAY_NAMES[row.day_of_week]}
                </span>
                <input
                  type="time"
                  value={row.open_time.slice(0, 5)}
                  disabled={row.is_closed}
                  onChange={(e) => updateDay(row.day_of_week, { open_time: e.target.value })}
                  className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm disabled:opacity-50"
                />
                <span className="text-gray-400 dark:text-gray-500 text-sm">to</span>
                <input
                  type="time"
                  value={row.close_time.slice(0, 5)}
                  disabled={row.is_closed}
                  onChange={(e) => updateDay(row.day_of_week, { close_time: e.target.value })}
                  className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm disabled:opacity-50"
                />
                <div className="ms-auto">
                  <Switch
                    checked={!row.is_closed}
                    onChange={(v) => updateDay(row.day_of_week, { is_closed: !v })}
                    label={row.is_closed ? 'Closed' : 'Open'}
                  />
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <Button icon={Save} loading={savingHours} onClick={handleSaveHours}>
                {savingHours ? 'Saving...' : 'Save Hours'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
