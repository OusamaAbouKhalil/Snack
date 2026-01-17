import React, { useState, useMemo } from 'react';
import { Users, Star, Plus, Search, Gift, Edit, Trash2, X, Save } from 'lucide-react';
import { useCustomers } from '../../hooks/useCustomers';

export function CustomerManagement() {
  const { customers, loading, error, createCustomer, updateCustomer, deleteCustomer, updateLoyaltyPoints } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [showAddPoints, setShowAddPoints] = useState<string | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    loyalty_points: 0
  });

  // Memoize filtered customers to avoid recalculation on every render
  const filteredCustomers = useMemo(() => 
    customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [customers, searchTerm]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let success = false;
    if (editingCustomer) {
      success = await updateCustomer(editingCustomer, formData);
    } else {
      success = await createCustomer(formData);
    }

    if (success) {
      setShowAddCustomer(false);
      setEditingCustomer(null);
      setFormData({ name: '', email: '', phone: '', loyalty_points: 0 });
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer.id);
    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyalty_points: customer.loyalty_points
    });
    setShowAddCustomer(true);
  };

  const handleDelete = async (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await deleteCustomer(customerId);
    }
  };

  const handleAddPoints = async (customerId: string) => {
    const points = parseInt(pointsToAdd);
    if (isNaN(points)) return;

    const success = await updateLoyaltyPoints(customerId, points);
    if (success) {
      setShowAddPoints(null);
      setPointsToAdd('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Customer Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage customer information and loyalty points</p>
        </div>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Customer
        </button>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
              <Users className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-lg">
              <Star className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">VIP Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {customers.filter(c => c.loyalty_points >= 1000).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
              <Gift className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Points Issued</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {customers.reduce((sum, c) => sum + c.loyalty_points, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Loyalty Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center">
                        <Users className="text-primary-600 dark:text-primary-400" size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{customer.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Member since {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-gray-100">{customer.email}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Star className="text-yellow-500 dark:text-yellow-400" size={16} />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{customer.loyalty_points}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900 dark:text-gray-100">{customer.total_orders}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900 dark:text-gray-100">${customer.total_spent.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {showAddPoints === customer.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={pointsToAdd}
                            onChange={(e) => setPointsToAdd(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                            placeholder="Points"
                          />
                          <button
                            onClick={() => handleAddPoints(customer.id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 transition-colors duration-200"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setShowAddPoints(null);
                              setPointsToAdd('');
                            }}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 p-1 transition-colors duration-200"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowAddPoints(customer.id)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 p-1 transition-colors duration-200"
                            title="Add Points"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 transition-colors duration-200"
                            title="Edit Customer"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 transition-colors duration-200"
                            title="Delete Customer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No customers found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full transition-colors duration-300">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Initial Loyalty Points
                  </label>
                  <input
                    type="number"
                    value={formData.loyalty_points}
                    onChange={(e) => setFormData({ ...formData, loyalty_points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                    min="0"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCustomer(false);
                      setEditingCustomer(null);
                      setFormData({ name: '', email: '', phone: '', loyalty_points: 0 });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-500 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-700 transition-colors"
                  >
                    {editingCustomer ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}