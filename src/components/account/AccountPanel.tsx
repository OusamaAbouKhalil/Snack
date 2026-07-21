import { useEffect, useState } from 'react';
import { X, LogOut, MapPin, Loader2, Gift, ReceiptText, UserCircle, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoyaltyTransaction, Order } from '../../types';

interface AccountPanelProps {
  onClose: () => void;
}

type Tab = 'profile' | 'rewards' | 'orders';

export function AccountPanel({ onClose }: AccountPanelProps) {
  const { customer, signOut, updateCustomerProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('profile');

  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [city, setCity] = useState(customer?.city || '');
  const [gpsBusy, setGpsBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ledger, setLedger] = useState<LoyaltyTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setName(customer.name || '');
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setCity(customer.city || '');
  }, [customer]);

  useEffect(() => {
    if (!customer || tab === 'profile') return;
    setLoadingData(true);
    const load = async () => {
      if (tab === 'rewards') {
        const { data } = await supabase
          .from('loyalty_transactions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(50);
        setLedger((data as LoyaltyTransaction[]) || []);
      } else {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, total_amount, status, order_type, created_at, payment_method, customer_name')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(30);
        setOrders((data as Order[]) || []);
      }
      setLoadingData(false);
    };
    load();
  }, [tab, customer]);

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toastError(t('guest.locationNotSupported'));
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await updateCustomerProfile({
          location_lat: pos.coords.latitude,
          location_lng: pos.coords.longitude,
        });
        setGpsBusy(false);
        if (error) toastError(t('guest.locationSaveFailed'));
        else success(t('guest.locationSaved'));
      },
      () => {
        toastError(t('guest.locationFailed'));
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      toastError(t('guest.nameRequired'));
      return;
    }
    setSaving(true);
    const { error } = await updateCustomerProfile({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
    });
    setSaving(false);
    if (error) toastError(t('guest.profileSaveFailed'));
    else success(t('guest.profileSaved'));
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const inputClass =
    'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm';

  const statusBadge = (status: string) =>
    status === 'completed'
      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400'
      : status === 'cancelled'
        ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
        : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <UserCircle size={22} className="text-primary-500" />
              {t('guest.myAccount')}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-300" aria-label={t('common.close')}>
              <X size={20} />
            </button>
          </div>

          <div className="mt-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{t('guest.loyaltyPoints')}</p>
              <p className="text-3xl font-bold">{customer?.loyalty_points ?? 0}</p>
            </div>
            <Gift size={36} className="opacity-80" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['profile', 'rewards', 'orders'] as Tab[]).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  tab === tabKey
                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {t(`guest.tab.${tabKey}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'profile' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('guest.name')}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('guest.phone')}</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('guest.cityArea')}</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder={t('guest.cityPlaceholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t('guest.address')}</label>
                <textarea value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputClass} resize-none`} rows={2} placeholder={t('guest.addressShortPlaceholder')} />
              </div>

              <button
                onClick={shareLocation}
                disabled={gpsBusy}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  customer?.location_lat
                    ? 'border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-primary-400'
                }`}
              >
                {gpsBusy ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                {customer?.location_lat ? t('guest.gpsSaved') : t('guest.shareLocation')}
              </button>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('guest.saveProfile')}
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg font-medium transition-colors"
              >
                <LogOut size={16} />
                {t('guest.signOut')}
              </button>
            </div>
          )}

          {tab === 'rewards' && (
            <div className="space-y-2">
              {loadingData ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-500" /></div>
              ) : ledger.length === 0 ? (
                <div className="text-center py-10">
                  <Gift className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
                  <p className="text-gray-600 dark:text-gray-300 text-sm">
                    {t('guest.noPointsYet')}<br />{t('guest.pointsAutoNote')}
                  </p>
                </div>
              ) : (
                ledger.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 capitalize">{tx.type}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(tx.created_at).toLocaleDateString()} {tx.note ? `· ${tx.note}` : ''}
                      </p>
                    </div>
                    <span className={`font-bold ${tx.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-2">
              {loadingData ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-500" /></div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10">
                  <ReceiptText className="mx-auto mb-3 text-gray-300 dark:text-gray-600" size={40} />
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{t('guest.noOrdersYet')}</p>
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{o.order_number}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(o.status)}`}>{o.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(o.created_at).toLocaleString()} · {o.order_type === 'delivery' ? `🛵 ${t('guest.delivery')}` : `🏪 ${t('guest.pickup')}`}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">${Number(o.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
