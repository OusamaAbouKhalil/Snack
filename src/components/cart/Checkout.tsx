import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Loader2, CheckCircle2, Clock, XCircle, Gift, Store, Bike, Banknote, Sparkles, MessageCircle } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { useSettings } from '../../hooks/useSettings';
import { useOrderTracking } from '../../hooks/useOrderTracking';
import { useToast } from '../ui/Toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { DeliveryQuote } from '../../types';
import { roundLbpCash } from '../../lib/currency';
import { whatsappLink, buildOrderWhatsAppMessage } from '../../lib/whatsapp';
import { useBusinessHours } from '../../hooks/useBusinessHours';
import { computeStoreStatus, formatTime } from '../../lib/storeHours';

interface CheckoutProps {
  onBack: () => void;
  onRequestSignIn: () => void;
}

const PLACED_ORDER_KEY = 'besweet_last_order_id';

export function Checkout({ onBack, onRequestSignIn }: CheckoutProps) {
  const { items, subtotal, clear } = useCart();
  const { user, customer, refreshCustomer } = useAuth();
  const { createOrder, loading } = useOrders();
  const { settings } = useSettings();
  const { error: toastError } = useToast();
  const { t } = useLanguage();
  const { hours } = useBusinessHours();
  const { isOpen: storeOpen, today: todayHours } = computeStoreStatus(hours);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [redeem, setRedeem] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(
    () => sessionStorage.getItem(PLACED_ORDER_KEY)
  );
  const { order: tracked } = useOrderTracking(placedOrderId);

  // Prefill from account profile
  useEffect(() => {
    if (customer) {
      setName((v) => v || customer.name || '');
      setPhone((v) => v || customer.phone || '');
      setAddress((v) => v || customer.address || '');
    }
  }, [customer]);

  // Zone-based delivery fee: when the customer shares GPS we ask the server
  // which admin-defined circle the point falls in; otherwise the flat default.
  useEffect(() => {
    if (orderType !== 'delivery' || !gps) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    supabase
      .rpc('quote_delivery_fee', { p_lat: gps.lat, p_lng: gps.lng })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setQuote(data as DeliveryQuote);
      });
    return () => {
      cancelled = true;
    };
  }, [gps, orderType]);

  const rate = Number(settings?.usd_to_lbp_rate) || 90000;
  const deliveryFee =
    orderType === 'delivery'
      ? quote
        ? Number(quote.fee) || 0
        : Number(settings?.delivery_fee) || 0
      : 0;

  // Loyalty redemption: capped by balance and by the subtotal value.
  const redeemRate = Number(settings?.loyalty_redeem_rate) || 100;
  const balance = customer?.loyalty_points ?? 0;
  const redeemablePoints = Math.min(balance, Math.floor(subtotal * redeemRate));
  const discount = redeem && redeemablePoints > 0 ? Math.round((redeemablePoints / redeemRate) * 100) / 100 : 0;

  const total = Math.max(subtotal + deliveryFee - discount, 0);
  const fmt = (n: number, cash = false) =>
    `$${n.toFixed(2)} / ${(cash ? roundLbpCash(n * rate) : Math.round(n * rate)).toLocaleString()} LBP`;

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toastError(t('guest.locationNotSupported'));
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsBusy(false);
      },
      () => {
        toastError(t('guest.locationFailedTypeAddress'));
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const placeOrder = async () => {
    if (items.length === 0) return;
    if (!storeOpen) {
      toastError(t('guest.orderingDisabled'));
      return;
    }
    if (!name.trim()) {
      toastError(t('guest.enterName'));
      return;
    }
    if (!phone.trim()) {
      toastError(t('guest.enterPhone'));
      return;
    }
    if (orderType === 'delivery' && !address.trim() && !gps) {
      toastError(t('guest.enterAddressOrLocation'));
      return;
    }

    const created = await createOrder({
      items,
      customerName: name.trim(),
      paymentMethod: 'cash',
      customerId: customer?.id ?? null,
      orderType,
      deliveryAddress: orderType === 'delivery' ? address.trim() || null : null,
      deliveryLat: orderType === 'delivery' ? gps?.lat ?? null : null,
      deliveryLng: orderType === 'delivery' ? gps?.lng ?? null : null,
      customerPhone: phone.trim(),
      notes: notes.trim() || null,
      source: 'online',
      redeemPoints: redeem && customer ? redeemablePoints : 0,
    });

    if (created) {
      clear();
      setRedeem(false);
      if (created.redeemed_points > 0) refreshCustomer();
      sessionStorage.setItem(PLACED_ORDER_KEY, created.id);
      setPlacedOrderId(created.id);
    } else {
      toastError(t('guest.orderFailed'));
    }
  };

  // Let the customer forward their own order to the store's WhatsApp —
  // handy for confirming delivery details or a quick human follow-up.
  const sendOrderToWhatsApp = () => {
    if (!tracked) return;
    if (!settings?.store_phone) {
      toastError('Store phone number is not set up yet — ask the store to add it in Settings.');
      return;
    }
    const message = buildOrderWhatsAppMessage({
      orderNumber: tracked.order_number,
      customerName: name.trim() || 'there',
      items: tracked.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      total: Number(tracked.total_amount),
      orderType,
      deliveryAddress: orderType === 'delivery' ? address.trim() || null : null,
    });
    const link = whatsappLink(settings.store_phone, message);
    if (link) window.open(link, '_blank', 'noopener,noreferrer');
  };

  // ---- confirmation / live tracking view ----
  if (placedOrderId) {
    const status = tracked?.status || 'pending';
    const statusUi =
      status === 'completed'
        ? { icon: <CheckCircle2 className="w-14 h-14 text-green-500" />, label: t('guest.orderReady'), tone: 'text-green-600 dark:text-green-400' }
        : status === 'cancelled'
          ? { icon: <XCircle className="w-14 h-14 text-red-500" />, label: t('guest.orderCancelled'), tone: 'text-red-600 dark:text-red-400' }
          : { icon: <Clock className="w-14 h-14 text-primary-500 animate-pulse" />, label: t('guest.orderReceived'), tone: 'text-primary-600 dark:text-primary-400' };

    return (
      <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
        <div className="flex justify-center">{statusUi.icon}</div>
        <p className={`font-bold text-lg ${statusUi.tone}`}>{statusUi.label}</p>
        {tracked && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('guest.order')} <span className="font-mono font-semibold">{tracked.order_number}</span>
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-left space-y-1">
              {tracked.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-sm text-gray-700 dark:text-gray-200">
                  <span>{i.quantity}× {i.name}</span>
                  <span>${i.total_price.toFixed(2)}</span>
                </div>
              ))}
              {tracked.delivery_fee > 0 && (
                <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 pt-1">
                  <span>{t('guest.delivery')}</span>
                  <span>${Number(tracked.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              {Number(tracked.discount) > 0 && (
                <div className="flex justify-between text-sm font-medium text-green-600 dark:text-green-400 pt-1">
                  <span>{t('guest.discount')}</span>
                  <span>−${Number(tracked.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                <span>{t('guest.total')}</span>
                <span>{fmt(Number(tracked.total_amount), true)}</span>
              </div>
            </div>
          </>
        )}
        {tracked && (
          <button
            onClick={sendOrderToWhatsApp}
            className="w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-600 dark:text-green-400 rounded-xl py-3 text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            <MessageCircle size={18} />
            {t('guest.sendViaWhatsApp')}
          </button>
        )}
        {!user && status === 'pending' && (
          <button
            onClick={onRequestSignIn}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 rounded-xl py-3 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <Gift size={18} />
            {t('guest.joinEarnPoints')}
          </button>
        )}
        <button
          onClick={() => {
            sessionStorage.removeItem(PLACED_ORDER_KEY);
            setPlacedOrderId(null);
            onBack();
          }}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          {t('guest.orderSomethingElse')}
        </button>
      </div>
    );
  }

  // ---- checkout form ----
  const inputClass =
    'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm';

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600"
      >
        <ArrowLeft size={16} /> {t('guest.backToCart')}
      </button>

      {!user && (
        <button
          onClick={onRequestSignIn}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 rounded-xl py-2.5 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        >
          <Gift size={16} />
          {t('guest.signInEarnPoints')}
        </button>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{t('guest.name')} *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t('guest.yourName')} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{t('guest.phone')} *</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder={t('guest.phoneNumber')} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{t('guest.orderType')}</label>
        <div className="grid grid-cols-2 gap-2">
          {(['pickup', 'delivery'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                orderType === type
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-primary-400'
              }`}
            >
              {type === 'pickup' ? <Store size={17} /> : <Bike size={17} />}
              {type === 'pickup' ? t('guest.pickup') : t('guest.delivery')}
            </button>
          ))}
        </div>
      </div>

      {orderType === 'delivery' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t('guest.deliveryAddress')} *</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`${inputClass} resize-none`}
            rows={2}
            placeholder={t('guest.addressPlaceholder')}
          />
          <button
            onClick={shareLocation}
            disabled={gpsBusy}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              gps
                ? 'border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-primary-400'
            }`}
          >
            {gpsBusy ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            {gps ? t('guest.locationShared') : t('guest.shareLocation')}
          </button>
          {quote && (
            quote.in_zone ? (
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {t('guest.deliveryZone')}: {quote.zone_name}
              </p>
            ) : (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t('guest.outOfZone')}</p>
            )
          )}
          {deliveryFee > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('guest.deliveryFee')}: {fmt(deliveryFee)}</p>
          )}
        </div>
      )}

      {customer && balance > 0 && (
        <button
          type="button"
          onClick={() => setRedeem(!redeem)}
          disabled={redeemablePoints <= 0}
          aria-pressed={redeem}
          className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-all duration-200 ${
            redeem
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-primary-400'
          }`}
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
              <Sparkles size={15} className="text-primary-600 dark:text-primary-400" />
            </span>
            <span className="text-start">
              <span className="block font-bold text-gray-900 dark:text-gray-100">{t('guest.redeemPoints')}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {t('guest.yourPoints')}: {balance.toLocaleString()} {t('guest.pointsShort')}
              </span>
            </span>
          </span>
          <span className={`font-bold tabular-nums ${redeem ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
            −${(Math.round((redeemablePoints / redeemRate) * 100) / 100).toFixed(2)}
          </span>
        </button>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1.5">{t('guest.notes')}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} resize-none`}
          rows={2}
          placeholder={t('guest.notesPlaceholder')}
        />
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-1.5">
        <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200">
          <span>{t('guest.subtotal')}</span>
          <span>{fmt(subtotal)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-gray-700 dark:text-gray-200">
            <span>{t('guest.deliveryFee')}{quote?.in_zone && quote.zone_name ? ` — ${quote.zone_name}` : ''}</span>
            <span>{fmt(deliveryFee)}</span>
          </div>
        )}
        {discount > 0 && (
          <div className="flex justify-between text-sm font-medium text-green-600 dark:text-green-400">
            <span>{t('guest.discount')} ({redeemablePoints.toLocaleString()} {t('guest.pointsShort')})</span>
            <span>−{fmt(discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-600 pt-2 mt-1">
          <span>{t('guest.total')}</span>
          <span>{fmt(total, true)}</span>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 pt-1">
          <Banknote size={14} className="text-primary-500 flex-shrink-0" />
          {orderType === 'pickup' ? t('guest.payCashPickup') : t('guest.payCashDelivery')}
        </p>
      </div>

      {!storeOpen && hours.length > 0 && (
        <div className="flex items-center gap-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm">
          <Clock size={16} className="flex-shrink-0" />
          <span>
            {t('guest.storeClosed')}
            {todayHours && !todayHours.is_closed && ` — ${t('guest.storeClosedOpensAt')} ${formatTime(todayHours.open_time)}`}
          </span>
        </div>
      )}

      <button
        onClick={placeOrder}
        disabled={loading || items.length === 0 || !storeOpen}
        className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white py-3.5 rounded-full font-bold shadow-md shadow-primary-600/20 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {storeOpen ? `${t('guest.placeOrder')} — ${fmt(total, true)}` : t('guest.orderingDisabled')}
      </button>
    </div>
  );
}
