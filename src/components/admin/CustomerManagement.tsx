import React, { useState, useMemo } from 'react';
import { Users, Star, Plus, Search, Gift, Edit, Trash2, X, Save, MapPin, Minus } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { Customer } from '../../types';
import {
  Card, PageHeader, StatCard, Button, IconButton, Field, Input, Select, Modal,
  TableShell, Thead, Th, Td, EmptyState, Spinner,
} from './ui/Kit';

const emptyForm = { name: '', email: '', phone: '', address: '', city: '' };

export function CustomerManagement() {
  const { customers, loading, error, createCustomer, updateCustomer, deleteCustomer, adjustLoyaltyPoints } = useCustomers();
  const { success, error: toastError } = useToast();
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [pointsFor, setPointsFor] = useState<string | null>(null);
  const [pointsValue, setPointsValue] = useState('');
  const [pointsMode, setPointsMode] = useState<'add' | 'redeem'>('add');
  const [formData, setFormData] = useState(emptyForm);

  const cities = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => c.city && set.add(c.city));
    return Array.from(set).sort();
  }, [customers]);

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          customer.name.toLowerCase().includes(q) ||
          (customer.email || '').toLowerCase().includes(q) ||
          (customer.phone || '').includes(searchTerm) ||
          (customer.city || '').toLowerCase().includes(q);
        const matchesCity = cityFilter === 'all' || customer.city === cityFilter;
        return matchesSearch && matchesCity;
      }),
    [customers, searchTerm, cityFilter]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim(),
      address: formData.address.trim() || null,
      city: formData.city.trim() || null,
    };

    const ok = editingCustomer
      ? await updateCustomer(editingCustomer, payload)
      : await createCustomer(payload as any);

    if (ok) {
      success(editingCustomer ? 'Customer updated' : 'Customer created');
      setShowAddCustomer(false);
      setEditingCustomer(null);
      setFormData(emptyForm);
    } else {
      toastError('Could not save customer');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer.id);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
    });
    setShowAddCustomer(true);
  };

  const handleDelete = async (customer: Customer) => {
    const ok = await confirm({
      title: 'Delete customer?',
      message: `${customer.name} and their loyalty history will be removed. Orders are kept.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    if (await deleteCustomer(customer.id)) success('Customer deleted');
    else toastError('Could not delete customer');
  };

  const handlePoints = async (customerId: string) => {
    const raw = Math.abs(parseInt(pointsValue));
    if (isNaN(raw) || raw === 0) {
      toastError('Enter a points amount');
      return;
    }
    const points = pointsMode === 'redeem' ? -raw : raw;
    const result = await adjustLoyaltyPoints(customerId, points);
    if (result.ok) {
      success(pointsMode === 'redeem' ? `Redeemed ${raw} points` : `Added ${raw} points`);
      setPointsFor(null);
      setPointsValue('');
    } else {
      toastError(result.message || 'Could not update points');
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
        Error: {error}
      </div>
    );
  }

  const closeModal = () => {
    setShowAddCustomer(false);
    setEditingCustomer(null);
    setFormData(emptyForm);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Management"
        subtitle="Customers, locations and loyalty rewards"
        actions={<Button icon={Plus} onClick={() => setShowAddCustomer(true)}>Add Customer</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Customers" value={customers.length} icon={Users} tone="blue" />
        <StatCard label="VIP Customers (1000+ pts)" value={customers.filter((c) => c.loyalty_points >= 1000).length} icon={Star} tone="amber" />
        <StatCard label="Outstanding Points" value={customers.reduce((sum, c) => sum + c.loyalty_points, 0).toLocaleString()} icon={Gift} tone="green" />
      </div>

      {/* Search + city filter */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <Input
              type="text"
              placeholder="Search by name, email, phone or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
          <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="sm:w-48">
            <option value="all">All locations</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card padded={false}>
        {filteredCustomers.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" />
        ) : (
          <TableShell>
            <Thead>
              <Th>Customer</Th>
              <Th>Contact</Th>
              <Th>Location</Th>
              <Th>Points</Th>
              <Th>Orders</Th>
              <Th>Spent</Th>
              <Th align="end">Actions</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="text-primary-600 dark:text-primary-400" size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                          Since {new Date(customer.created_at).toLocaleDateString()}
                          {customer.user_id && (
                            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              App user
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="text-gray-900 dark:text-gray-100">{customer.email || '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{customer.phone || '—'}</div>
                  </Td>
                  <Td>
                    <div className="text-gray-900 dark:text-gray-100">{customer.city || '—'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 max-w-[180px]">
                      <span className="truncate">{customer.address || ''}</span>
                      {customer.location_lat && customer.location_lng && (
                        <a
                          href={`https://maps.google.com/?q=${customer.location_lat},${customer.location_lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary-600 dark:text-primary-400 hover:underline flex items-center flex-shrink-0"
                          title="Open in Google Maps"
                        >
                          <MapPin size={13} />
                        </a>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Star className="text-amber-500 dark:text-amber-400" size={15} />
                      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{customer.loyalty_points}</span>
                    </div>
                  </Td>
                  <Td className="tabular-nums">{customer.total_orders}</Td>
                  <Td className="font-semibold tabular-nums">${(customer.total_spent || 0).toFixed(2)}</Td>
                  <Td align="end">
                    {pointsFor === customer.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                          <button
                            onClick={() => setPointsMode('add')}
                            className={`px-1.5 py-1 ${pointsMode === 'add' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}
                            title="Add points"
                          >
                            <Plus size={13} />
                          </button>
                          <button
                            onClick={() => setPointsMode('redeem')}
                            className={`px-1.5 py-1 ${pointsMode === 'redeem' ? 'bg-red-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-500'}`}
                            title="Redeem points"
                          >
                            <Minus size={13} />
                          </button>
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={pointsValue}
                          onChange={(e) => setPointsValue(e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="Points"
                        />
                        <IconButton icon={Save} label="Save points" tone="primary" onClick={() => handlePoints(customer.id)} />
                        <IconButton icon={X} label="Cancel" onClick={() => { setPointsFor(null); setPointsValue(''); }} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        <IconButton icon={Gift} label="Add / redeem points" tone="primary" onClick={() => { setPointsFor(customer.id); setPointsMode('add'); }} />
                        <IconButton icon={Edit} label="Edit customer" tone="primary" onClick={() => handleEdit(customer)} />
                        <IconButton icon={Trash2} label="Delete customer" tone="danger" onClick={() => handleDelete(customer)} />
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showAddCustomer} onClose={closeModal} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'} maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Customer Name" required>
            <Input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </Field>

          <Field label="Phone">
            <Input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </Field>

          <Field label="Email (optional)">
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="City / Area">
              <Input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Aytit" />
            </Field>
            <Field label="Address">
              <Input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Street, building" />
            </Field>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{editingCustomer ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
