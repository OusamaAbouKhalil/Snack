import React, { useState } from 'react';
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

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
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
          <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1">Manage customer information and loyalty points</p>
        </div>
        <button
          onClick={() => setShowAddCustomer(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Customer
        </button>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Star className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">VIP Customers</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.filter(c => c.loyalty_points >= 1000).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Gift className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Points Issued</p>
              <p className="text-2xl font-bold text-gray-900">
                {customers.reduce((sum, c) => sum + c.loyalty_points, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loyalty Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Users className="text-orange-600" size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          Member since {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{customer.email}</div>
                    <div className="text-sm text-gray-500">{customer.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Star className="text-yellow-500" size={16} />
                      <span className="font-semibold text-gray-900">{customer.loyalty_points}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{customer.total_orders}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">${customer.total_spent.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {showAddPoints === customer.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={pointsToAdd}
                            onChange={(e) => setPointsToAdd(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Points"
                          />
                          <button
                            onClick={() => handleAddPoints(customer.id)}
                            className="text-green-600 hover:text-green-800 p-1"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setShowAddPoints(null);
                              setPointsToAdd('');
                            }}
                            className="text-gray-600 hover:text-gray-800 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowAddPoints(customer.id)}
                            className="text-orange-600 hover:text-orange-900 p-1"
                            title="Add Points"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit Customer"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="text-red-600 hover:text-red-900 p-1"
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
          <div className="text-center py-12 text-gray-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No customers found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Customer Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Loyalty Points
                  </label>
                  <input
                    type="number"
                    value={formData.loyalty_points}
                    onChange={(e) => setFormData({ ...formData, loyalty_points: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
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