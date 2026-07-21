import React, { useMemo, useState } from 'react';
import {
  Gift, Sparkles, TrendingUp, TrendingDown, SlidersHorizontal, Search, Plus, Minus, Award,
  ReceiptText, Truck, Percent, DollarSign, Stamp, Pencil, Trash2, Power, Tag,
} from 'lucide-react';
import { useLoyalty } from '../../hooks/useLoyalty';
import { useCustomers } from '../../hooks/useCustomers';
import { useSettings } from '../../hooks/useSettings';
import { useRewards, RewardInput } from '../../hooks/useRewards';
import { useProducts } from '../../hooks/useProducts';
import { Reward, RewardType } from '../../types';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import {
  Card, PageHeader, StatCard, Button, IconButton, Badge, Field, Input, Select, Switch, Modal,
  EmptyState, Spinner, TableShell, Thead, Th, Td,
} from './ui/Kit';

const REWARD_META: Record<RewardType, { label: string; icon: React.ElementType; iconWrap: string; iconColor: string }> = {
  free_delivery: { label: 'Free Delivery', icon: Truck, iconWrap: 'bg-blue-100 dark:bg-blue-900/40', iconColor: 'text-blue-600 dark:text-blue-400' },
  discount_percent: { label: '% Discount', icon: Percent, iconWrap: 'bg-green-100 dark:bg-green-900/40', iconColor: 'text-green-600 dark:text-green-400' },
  discount_amount: { label: 'Flat Discount', icon: DollarSign, iconWrap: 'bg-amber-100 dark:bg-amber-900/40', iconColor: 'text-amber-600 dark:text-amber-400' },
  punch_card: { label: 'Punch Card', icon: Stamp, iconWrap: 'bg-primary-100 dark:bg-primary-900/40', iconColor: 'text-primary-600 dark:text-primary-400' },
};

const emptyReward = {
  name: '',
  description: '',
  type: 'punch_card' as RewardType,
  is_active: true,
  sort_order: '0',
  percent: '10',
  amount: '2',
  threshold: '8',
  count_by: 'orders' as 'orders' | 'items',
  product_id: '',
  punch_reward_type: 'free_delivery' as 'free_delivery' | 'discount_amount',
};

function describeReward(r: Reward): string {
  switch (r.type) {
    case 'free_delivery':
      return 'Delivery fee waived at checkout';
    case 'discount_percent':
      return `${r.config.percent ?? 0}% off the order subtotal`;
    case 'discount_amount':
      return `$${(r.config.amount ?? 0).toFixed(2)} off the order`;
    case 'punch_card': {
      const unit = r.config.count_by === 'items' ? 'items bought' : 'completed orders';
      const prize = r.config.reward_type === 'free_delivery' ? 'free delivery' : `$${(r.config.amount ?? 0).toFixed(2)} off`;
      return `Every ${r.config.threshold ?? 0} ${unit} → ${prize}`;
    }
    default:
      return '';
  }
}

export function RewardsManagement() {
  const { transactions, loading: loadingTx, adjustPoints } = useLoyalty(100);
  const { customers } = useCustomers();
  const { settings, updateSettings } = useSettings();
  const { rewards, loading: loadingRewards, createReward, updateReward, deleteReward } = useRewards();
  const { products } = useProducts();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();

  const [earnRate, setEarnRate] = useState<string | null>(null);
  const [redeemRate, setRedeemRate] = useState<string | null>(null);
  const [savingRates, setSavingRates] = useState(false);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [form, setForm] = useState(emptyReward);
  const [savingReward, setSavingReward] = useState(false);

  const earnValue = earnRate ?? settings?.loyalty_points_rate?.toString() ?? '1';
  const redeemValue = redeemRate ?? settings?.loyalty_redeem_rate?.toString() ?? '100';

  const stats = useMemo(() => {
    const totalPoints = customers.reduce((s, c) => s + (c.loyalty_points || 0), 0);
    const earned = transactions.filter((t) => t.points > 0).reduce((s, t) => s + t.points, 0);
    const redeemed = transactions.filter((t) => t.points < 0).reduce((s, t) => s - t.points, 0);
    return { totalPoints, earned, redeemed, members: customers.filter((c) => c.loyalty_points > 0).length };
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)).slice(0, 8);
  }, [customers, query]);

  const selected = customers.find((c) => c.id === selectedId) || null;

  const saveRates = async () => {
    const earn = parseFloat(earnValue);
    const redeem = parseFloat(redeemValue);
    if (Number.isNaN(earn) || earn < 0) return toastError('Earn rate must be 0 or more');
    if (Number.isNaN(redeem) || redeem <= 0) return toastError('Redeem rate must be greater than 0');
    setSavingRates(true);
    const ok = await updateSettings({ loyalty_points_rate: earn, loyalty_redeem_rate: redeem });
    setSavingRates(false);
    if (ok) success('Reward rates saved');
    else toastError('Failed to save rates');
  };

  const submitAdjustment = async (sign: 1 | -1) => {
    if (!selected) return toastError('Pick a customer first');
    const points = Math.abs(parseInt(delta)) * sign;
    if (!points || Number.isNaN(points)) return toastError('Enter a points amount');
    setAdjusting(true);
    const { error } = await adjustPoints(selected.id, points, note.trim());
    setAdjusting(false);
    if (error) {
      toastError(error.message.includes('negative') ? 'Not enough points on this account' : error.message);
    } else {
      success(`${sign > 0 ? 'Added' : 'Removed'} ${Math.abs(points)} points ${sign > 0 ? 'to' : 'from'} ${selected.name}`);
      setDelta('');
      setNote('');
    }
  };

  const typeBadge = (type: string, points: number) => {
    if (type === 'redeem' || points < 0) return 'warning';
    if (type === 'adjust') return 'info';
    return 'success';
  };

  // ── rewards catalog ──────────────────────────────────────────────────────
  const openCreateReward = () => {
    setEditing(null);
    setForm(emptyReward);
    setModalOpen(true);
  };

  const openEditReward = (r: Reward) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description || '',
      type: r.type,
      is_active: r.is_active,
      sort_order: String(r.sort_order),
      percent: String(r.config.percent ?? 10),
      amount: String(r.config.amount ?? 2),
      threshold: String(r.config.threshold ?? 8),
      count_by: r.config.count_by ?? 'orders',
      product_id: r.config.product_id ?? '',
      punch_reward_type: r.config.reward_type ?? 'free_delivery',
    });
    setModalOpen(true);
  };

  const submitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toastError('Reward name is required');

    let config: Reward['config'] = {};
    if (form.type === 'discount_percent') {
      const percent = parseFloat(form.percent);
      if (Number.isNaN(percent) || percent <= 0 || percent > 100) return toastError('Percent must be between 1 and 100');
      config = { percent };
    } else if (form.type === 'discount_amount') {
      const amount = parseFloat(form.amount);
      if (Number.isNaN(amount) || amount <= 0) return toastError('Amount must be greater than 0');
      config = { amount };
    } else if (form.type === 'punch_card') {
      const threshold = parseInt(form.threshold);
      if (Number.isNaN(threshold) || threshold <= 0) return toastError('Threshold must be a positive number');
      config = {
        threshold,
        count_by: form.count_by,
        product_id: form.count_by === 'items' && form.product_id ? form.product_id : null,
        reward_type: form.punch_reward_type,
      };
      if (form.punch_reward_type === 'discount_amount') {
        const amount = parseFloat(form.amount);
        if (Number.isNaN(amount) || amount <= 0) return toastError('Amount must be greater than 0');
        config.amount = amount;
      }
    }

    const input: RewardInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      config,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order) || 0,
    };

    setSavingReward(true);
    const { error } = editing ? await updateReward(editing.id, input) : await createReward(input);
    setSavingReward(false);

    if (error) toastError(error.message);
    else {
      success(editing ? 'Reward updated' : 'Reward created');
      setModalOpen(false);
    }
  };

  const handleDeleteReward = async (r: Reward) => {
    const ok = await confirm({ title: 'Delete reward', message: `"${r.name}" will be removed and can no longer be redeemed.`, confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await deleteReward(r.id);
    if (error) toastError(error.message);
    else success('Reward deleted');
  };

  const toggleRewardActive = async (r: Reward) => {
    const { error } = await updateReward(r.id, { is_active: !r.is_active });
    if (error) toastError(error.message);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Rewards" subtitle="Loyalty points, a redeemable rewards catalog, and the full points ledger." />

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Points in circulation" value={stats.totalPoints.toLocaleString()} icon={Sparkles} />
        <StatCard label="Members with points" value={stats.members.toLocaleString()} icon={Award} tone="blue" />
        <StatCard label="Earned (recent)" value={`+${stats.earned.toLocaleString()}`} icon={TrendingUp} tone="green" />
        <StatCard label="Redeemed (recent)" value={`−${stats.redeemed.toLocaleString()}`} icon={TrendingDown} tone="amber" />
      </div>

      {/* Rewards catalog */}
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
            <Tag size={19} className="text-primary-600 dark:text-primary-400" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Rewards Catalog</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Free delivery, discounts, or punch cards like "every 8 orders → 1 free"</p>
          </div>
          <Button size="sm" icon={Plus} onClick={openCreateReward} className="ms-auto flex-shrink-0">Add Reward</Button>
        </div>

        {loadingRewards ? (
          <Spinner size={24} />
        ) : rewards.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No rewards yet"
            message="Create a punch card, a free-delivery perk, or a discount customers can redeem at checkout."
            action={<Button icon={Plus} onClick={openCreateReward}>Add your first reward</Button>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {rewards.map((r) => {
              const meta = REWARD_META[r.type];
              const Icon = meta.icon;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    r.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.iconWrap}`}>
                        <Icon size={15} className={meta.iconColor} />
                      </span>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm">{r.name}</h3>
                    </div>
                    <Badge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Off'}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{meta.label}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{describeReward(r)}</p>
                  {r.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{r.description}</p>}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => toggleRewardActive(r)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        r.is_active
                          ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      <Power size={13} />
                      {r.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <div className="flex-1" />
                    <IconButton icon={Pencil} label={`Edit ${r.name}`} tone="primary" onClick={() => openEditReward(r)} />
                    <IconButton icon={Trash2} label={`Delete ${r.name}`} tone="danger" onClick={() => handleDeleteReward(r)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rates */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <SlidersHorizontal size={19} className="text-primary-600 dark:text-primary-400" />
            </span>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Program Rates</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">How points are earned and what they're worth</p>
            </div>
          </div>

          <div className="space-y-4">
            <Field
              label="Earn rate — points per $1 spent"
              helper={`A $10 order earns ${Math.floor(10 * (parseFloat(earnValue) || 0)).toLocaleString()} points (delivery fee excluded). Applied automatically when an order is completed.`}
            >
              <Input type="number" min="0" step="0.1" value={earnValue} onChange={(e) => setEarnRate(e.target.value)} />
            </Field>

            <Field
              label="Redeem rate — points per $1 of discount"
              helper={`${(parseFloat(redeemValue) || 100).toLocaleString()} points = $1 off. Customers redeem at checkout; the discount never exceeds the order subtotal.`}
            >
              <Input type="number" min="1" step="1" value={redeemValue} onChange={(e) => setRedeemRate(e.target.value)} />
            </Field>

            <Button onClick={saveRates} loading={savingRates} className="w-full">Save Rates</Button>
          </div>
        </Card>

        {/* Manual adjustment */}
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <Gift size={19} className="text-primary-600 dark:text-primary-400" />
            </span>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">Adjust Customer Points</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bonuses, compensations, corrections</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedId('');
                }}
                className="ps-10"
                placeholder="Search customer by name or phone…"
              />
            </div>

            {!selected && query.trim() && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-xl divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                {filteredCustomers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No customers match</p>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedId(c.id);
                        setQuery(c.name);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors text-start"
                    >
                      <span className="font-medium text-gray-900 dark:text-gray-100">{c.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">{c.loyalty_points.toLocaleString()} pts</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {selected && (
              <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl px-4 py-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{selected.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selected.phone}</p>
                </div>
                <p className="font-bold text-primary-700 dark:text-primary-300 tabular-nums">{selected.loyalty_points.toLocaleString()} pts</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input type="number" min="1" step="1" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Points" />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => submitAdjustment(1)} disabled={adjusting || !selected} icon={Plus} className="!bg-green-600 hover:!bg-green-700">
                Add Points
              </Button>
              <Button onClick={() => submitAdjustment(-1)} disabled={adjusting || !selected} icon={Minus} className="!bg-amber-600 hover:!bg-amber-700">
                Remove Points
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Ledger */}
      <Card padded={false}>
        <div className="flex items-center gap-3 p-6 pb-4">
          <span className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
            <ReceiptText size={19} className="text-primary-600 dark:text-primary-400" />
          </span>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Points Ledger</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Latest {transactions.length} transactions — earns, redemptions and manual adjustments</p>
          </div>
        </div>

        {loadingTx ? (
          <Spinner size={24} />
        ) : transactions.length === 0 ? (
          <p className="px-6 pb-8 text-sm text-gray-500 dark:text-gray-400">No transactions yet — points appear here when orders complete or you adjust balances.</p>
        ) : (
          <TableShell>
            <Thead>
              <Th>Customer</Th>
              <Th>Type</Th>
              <Th align="end">Points</Th>
              <Th>Order</Th>
              <Th>Note</Th>
              <Th align="end">Date</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="font-medium text-gray-900 dark:text-gray-100">{tx.customers?.name || '—'}</Td>
                  <Td><Badge tone={typeBadge(tx.type, tx.points) as any}>{tx.type}</Badge></Td>
                  <Td align="end" className={`font-bold tabular-nums ${tx.points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {tx.points >= 0 ? '+' : ''}{tx.points.toLocaleString()}
                  </Td>
                  <Td className="text-gray-500 dark:text-gray-400 font-mono text-xs">{tx.orders?.order_number || '—'}</Td>
                  <Td className="text-gray-500 dark:text-gray-400 max-w-[220px] truncate">{tx.note || '—'}</Td>
                  <Td align="end" className="text-gray-500 dark:text-gray-400 whitespace-nowrap tabular-nums">
                    {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Reward' : 'New Reward'} subtitle="Choose what the reward gives and when a customer can claim it.">
        <form onSubmit={submitReward} className="space-y-4">
          <Field label="Reward name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Snack Loyalty Card" required />
          </Field>

          <Field label="Type" required>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as RewardType })}>
              <option value="punch_card">Punch card — every N orders/items → free reward</option>
              <option value="free_delivery">Free delivery</option>
              <option value="discount_percent">Percentage discount</option>
              <option value="discount_amount">Flat discount</option>
            </Select>
          </Field>

          {form.type === 'discount_percent' && (
            <Field label="Discount percent" required helper="Applied to the order subtotal at checkout.">
              <Input type="number" min="1" max="100" step="1" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} />
            </Field>
          )}

          {form.type === 'discount_amount' && (
            <Field label="Discount amount (USD)" required>
              <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
          )}

          {form.type === 'punch_card' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Count by" required>
                  <Select value={form.count_by} onChange={(e) => setForm({ ...form, count_by: e.target.value as 'orders' | 'items' })}>
                    <option value="orders">Completed orders</option>
                    <option value="items">Items bought</option>
                  </Select>
                </Field>
                <Field label="Threshold" required helper="e.g. 8 for &quot;every 8 snacks&quot;">
                  <Input type="number" min="1" step="1" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} />
                </Field>
              </div>

              {form.count_by === 'items' && (
                <Field label="Product (optional)" helper="Leave blank to count items from any product.">
                  <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                    <option value="">Any product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
              )}

              <Field label="Prize" required>
                <Select value={form.punch_reward_type} onChange={(e) => setForm({ ...form, punch_reward_type: e.target.value as 'free_delivery' | 'discount_amount' })}>
                  <option value="free_delivery">Free delivery</option>
                  <option value="discount_amount">Flat discount</option>
                </Select>
              </Field>

              {form.punch_reward_type === 'discount_amount' && (
                <Field label="Prize amount (USD)" required helper="e.g. the price of one free item">
                  <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </Field>
              )}
            </>
          )}

          <Field label="Description (optional)">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Shown to customers" />
          </Field>

          <div className="flex items-center justify-between gap-4">
            <div className="w-28">
              <Field label="Sort order">
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
              </Field>
            </div>
            <div className="pb-2.5">
              <Switch checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={savingReward} className="flex-1">{editing ? 'Save Changes' : 'Create Reward'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
