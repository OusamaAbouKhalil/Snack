import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, Edit, TrendingDown, Save, X } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';

export function InventoryManagement() {
  const { inventory, loading, error, updateStock, updateMinStockLevel } = useInventory();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null);
  const [newStock, setNewStock] = useState('');
  const [newMinStock, setNewMinStock] = useState('');

  const handleUpdateStock = async (productId: string) => {
    const stock = parseInt(newStock);
    if (isNaN(stock) || stock < 0) return;

    const success = await updateStock(productId, stock);
    if (success) {
      setEditingItem(null);
      setNewStock('');
    }
  };

  const handleUpdateMinStock = async (productId: string) => {
    const minStock = parseInt(newMinStock);
    if (isNaN(minStock) || minStock < 0) return;

    const success = await updateMinStockLevel(productId, minStock);
    if (success) {
      setEditingMinStock(null);
      setNewMinStock('');
    }
  };

  const getStockStatus = (stock: number, minLevel: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock <= minLevel) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
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

  const lowStockCount = inventory.filter(item => item.stock_quantity <= item.min_stock_level && item.stock_quantity > 0).length;
  const outOfStockCount = inventory.filter(item => item.stock_quantity === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage product stock levels</p>
        </div>
      </div>

      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <AlertTriangle className="text-yellow-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Product Inventory</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => {
                const status = getStockStatus(item.stock_quantity, item.min_stock_level);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Package className="text-orange-600" size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{item.category_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingItem === item.product_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                          />
                          <button
                            onClick={() => handleUpdateStock(item.product_id)}
                            className="text-green-600 hover:text-green-800 p-1"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(null);
                              setNewStock('');
                            }}
                            className="text-gray-600 hover:text-gray-800 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{item.stock_quantity}</span>
                          <button
                            onClick={() => {
                              setEditingItem(item.product_id);
                              setNewStock(item.stock_quantity.toString());
                            }}
                            className="text-orange-600 hover:text-orange-800 p-1"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingMinStock === item.product_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newMinStock}
                            onChange={(e) => setNewMinStock(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                          />
                          <button
                            onClick={() => handleUpdateMinStock(item.product_id)}
                            className="text-green-600 hover:text-green-800 p-1"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMinStock(null);
                              setNewMinStock('');
                            }}
                            className="text-gray-600 hover:text-gray-800 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{item.min_stock_level}</span>
                          <button
                            onClick={() => {
                              setEditingMinStock(item.product_id);
                              setNewMinStock(item.min_stock_level.toString());
                            }}
                            className="text-orange-600 hover:text-orange-800 p-1"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">${item.price.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item.product_id);
                            setNewStock(item.stock_quantity.toString());
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Edit Stock"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {inventory.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>No inventory items found</p>
          </div>
        )}
      </div>
    </div>
  );
}