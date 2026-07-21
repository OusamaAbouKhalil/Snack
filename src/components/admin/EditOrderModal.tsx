import { useEffect, useMemo, useState } from 'react';
import { Plus, Minus, Trash2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Order, Product } from '../../types';
import { useToast } from '../ui/Toast';
import { Modal, Button, Field, Input, Select, Spinner } from './ui/Kit';

interface EditItem {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
}

interface EditOrderModalProps {
  order: Order;
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}

export function EditOrderModal({ order, products, onClose, onSaved }: EditOrderModalProps) {
  const { success, error: toastError } = useToast();
  const [items, setItems] = useState<EditItem[]>([]);
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [paymentMethod, setPaymentMethod] = useState(order.payment_method);
  const [notes, setNotes] = useState(order.notes || '');
  const [deliveryFee, setDeliveryFee] = useState<number>(Number(order.delivery_fee) || 0);
  const [deliveryAddress, setDeliveryAddress] = useState(order.delivery_address || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, products (name)')
        .eq('order_id', order.id);
      if (error) {
        toastError('Could not load order items');
        onClose();
        return;
      }
      setItems(
        (data || []).map((r: any) => ({
          product_id: r.product_id,
          name: r.products?.name || 'Unknown',
          unit_price: Number(r.unit_price),
          quantity: r.quantity,
        }))
      );
      setLoading(false);
    };
    load();
  }, [order.id]);

  const addProduct = (p: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === p.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product_id: p.id, name: p.name, unit_price: p.price, quantity: 1 }];
    });
  };

  const setQty = (productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.product_id !== productId)
        : prev.map((i) => (i.product_id === productId ? { ...i, quantity: qty } : i))
    );
  };

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    [items]
  );

  const candidates = useMemo(
    () =>
      products
        .filter((p) => p.is_available && p.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 8),
    [products, search]
  );

  const save = async () => {
    if (items.length === 0) {
      toastError('Order must contain at least one item');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('edit_order', {
      p_order_id: order.id,
      p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      p_customer_name: customerName.trim() || null,
      p_payment_method: paymentMethod,
      p_notes: notes.trim() || null,
      p_delivery_fee: order.order_type === 'delivery' ? deliveryFee : null,
      p_delivery_address: deliveryAddress.trim() || null,
    });
    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }
    success('Order updated');
    onSaved();
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Order"
      subtitle={order.order_number}
      footer={
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="text-gray-900 dark:text-gray-100">
            <span className="text-sm text-gray-500 dark:text-gray-400 me-2">Total</span>
            <span className="text-lg font-bold">
              ${(subtotal + (order.order_type === 'delivery' ? deliveryFee : 0)).toFixed(2)}
            </span>
          </div>
          <Button onClick={save} disabled={saving || loading} loading={saving}>
            Save changes
          </Button>
        </div>
      }
    >
      {loading ? (
        <Spinner size={24} />
      ) : (
        <div className="space-y-4">
          {/* current items */}
          <div className="space-y-2">
            {items.map((i) => (
              <div key={i.product_id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">{i.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">${i.unit_price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setQty(i.product_id, i.quantity - 1)} className="p-1 rounded-full bg-white dark:bg-gray-600 shadow text-gray-700 dark:text-gray-200"><Minus size={13} /></button>
                  <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">{i.quantity}</span>
                  <button onClick={() => setQty(i.product_id, i.quantity + 1)} className="p-1 rounded-full bg-white dark:bg-gray-600 shadow text-gray-700 dark:text-gray-200"><Plus size={13} /></button>
                  <button onClick={() => setQty(i.product_id, 0)} className="p-1 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 ms-1"><Trash2 size={14} /></button>
                </div>
                <span className="w-16 text-end text-sm font-semibold text-gray-900 dark:text-gray-100">
                  ${(i.unit_price * i.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No items — add products below</p>
            )}
          </div>

          {/* add product */}
          <div>
            <div className="relative">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
                placeholder="Add product…"
              />
            </div>
            {search && (
              <div className="mt-1 border border-gray-200 dark:border-gray-600 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                {candidates.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { addProduct(p); setSearch(''); }}
                    className="w-full flex justify-between items-center px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
                  >
                    <span>{p.name}</span>
                    <span className="text-primary-600 dark:text-primary-400 font-medium">${p.price.toFixed(2)}</span>
                  </button>
                ))}
                {candidates.length === 0 && (
                  <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No matches</p>
                )}
              </div>
            )}
          </div>

          {/* order fields */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </Field>
            <Field label="Payment">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </Select>
            </Field>
          </div>

          {order.order_type === 'delivery' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Delivery fee ($)">
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </Field>
              <Field label="Delivery address">
                <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      )}
    </Modal>
  );
}
