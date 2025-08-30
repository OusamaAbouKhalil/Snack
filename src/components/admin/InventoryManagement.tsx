import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, Plus, Edit, Trash2, TrendingDown, Save, X, ArrowUpDown, Download } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

interface InventoryItem {
  id: string;
  ingredient_id: string;
  name: string;
  description: string;
  stock_quantity: number;
  min_stock_level: number;
  unit: string;
  category_name: string;
}

interface Transaction {
  id: string;
  ingredient_id: string;
  quantity_change: number;
  transaction_type: 'ADD' | 'REMOVE' | 'ADJUST';
  created_at: string;
  ingredient_name: string;
  unit: string;
}

export function InventoryManagement() {
  const { 
    inventory, 
    transactions,
    categories,
    loading, 
    error, 
    updateStock, 
    updateMinStockLevel, 
    addIngredient, 
    removeIngredient, 
    getDailyUsage
  } = useInventory();
  
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingMinStock, setEditingMinStock] = useState<string | null>(null);
  const [newStock, setNewStock] = useState('');
  const [newMinStock, setNewMinStock] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    description: '',
    unit: '',
    stock_quantity: '',
    min_stock_level: '',
    category_id: ''
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [daysFilter, setDaysFilter] = useState(7);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [inventorySortConfig, setInventorySortConfig] = useState<{
    key: keyof InventoryItem;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [transactionsSortConfig, setTransactionsSortConfig] = useState<{
    key: keyof Transaction;
    direction: 'asc' | 'desc';
  } | null>(null);

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchChartData = async () => {
      const usageData = await getDailyUsage(daysFilter);
      const aggregatedData = usageData.reduce((acc: Record<string, { date: string; usage: number }>, transaction: Transaction) => {
        const date = new Date(transaction.created_at).toLocaleDateString('en-GB');
        if (!acc[date]) {
          acc[date] = { date, usage: 0 };
        }
        if (transaction.transaction_type === 'REMOVE') {
          acc[date].usage += Math.abs(transaction.quantity_change);
        }
        return acc;
      }, {});

      const sortedData = Object.values(aggregatedData).sort((a, b) => 
        new Date(a.date.split('/').reverse().join('-')).getTime() - 
        new Date(b.date.split('/').reverse().join('-')).getTime()
      );
      setChartData(sortedData);
    };

    fetchChartData();
  }, [transactions, daysFilter, getDailyUsage]);

  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedIngredient = {
      ...newIngredient,
      stock_quantity: parseInt(newIngredient.stock_quantity) || 0,
      min_stock_level: parseInt(newIngredient.min_stock_level) || 0
    };
    if (isNaN(parsedIngredient.stock_quantity) || isNaN(parsedIngredient.min_stock_level)) {
      alert('Please enter valid numbers for stock quantity and minimum stock level');
      return;
    }
    if (!parsedIngredient.unit) {
      alert('Please specify a unit (e.g., grams, liters, units)');
      return;
    }
    const success = await addIngredient(parsedIngredient);
    if (success) {
      setShowAddModal(false);
      setNewIngredient({
        name: '',
        description: '',
        unit: '',
        stock_quantity: '',
        min_stock_level: '',
        category_id: ''
      });
    }
  };

  const handleUpdateStock = async (ingredientId: string, transactionType: 'ADD' | 'REMOVE' | 'ADJUST') => {
    const stock = parseInt(newStock);
    if (isNaN(stock) || stock < 0) {
      alert('Please enter a valid stock quantity');
      return;
    }

    const success = await updateStock(ingredientId, stock, transactionType);
    if (success) {
      setEditingItem(null);
      setNewStock('');
    }
  };

  const handleUpdateMinStock = async (ingredientId: string) => {
    const minStock = parseInt(newMinStock);
    if (isNaN(minStock) || minStock < 0) {
      alert('Please enter a valid minimum stock level');
      return;
    }

    const success = await updateMinStockLevel(ingredientId, minStock);
    if (success) {
      setEditingMinStock(null);
      setNewMinStock('');
    }
  };

  const handleRemoveIngredient = async (ingredientId: string) => {
    if (window.confirm('Are you sure you want to delete this ingredient?')) {
      await removeIngredient(ingredientId);
    }
  };

  const getStockStatus = (stock: number, minLevel: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock <= minLevel) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  const handleInventorySort = (key: keyof InventoryItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (inventorySortConfig && inventorySortConfig.key === key && inventorySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setInventorySortConfig({ key, direction });
  };

  const handleTransactionsSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (transactionsSortConfig && transactionsSortConfig.key === key && transactionsSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setTransactionsSortConfig({ key, direction });
  };

  const sortedInventory = useMemo(() => {
    if (!inventorySortConfig) return inventory;
    const sorted = [...inventory].sort((a, b) => {
      const aValue = a[inventorySortConfig.key];
      const bValue = b[inventorySortConfig.key];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return inventorySortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return inventorySortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      return 0;
    });
    return sorted;
  }, [inventory, inventorySortConfig]);

  const sortedTransactions = useMemo(() => {
    if (!transactionsSortConfig) return transactions;
    const sorted = [...transactions].sort((a, b) => {
      const aValue = a[transactionsSortConfig.key];
      const bValue = b[transactionsSortConfig.key];
      if (transactionsSortConfig.key === 'created_at') {
        return transactionsSortConfig.direction === 'asc'
          ? new Date(aValue).getTime() - new Date(bValue).getTime()
          : new Date(bValue).getTime() - new Date(aValue).getTime();
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return transactionsSortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return transactionsSortConfig.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue;
      }
      return 0;
    });
    return sorted;
  }, [transactions, transactionsSortConfig]);

  const paginatedInventory = sortedInventory.slice(
    (inventoryPage - 1) * itemsPerPage,
    inventoryPage * itemsPerPage
  );

  const paginatedTransactions = sortedTransactions.slice(
    (transactionsPage - 1) * itemsPerPage,
    transactionsPage * itemsPerPage
  );

  const totalInventoryPages = Math.ceil(inventory.length / itemsPerPage);
  const totalTransactionsPages = Math.ceil(transactions.length / itemsPerPage);

  // Excel export function
  const exportToExcel = () => {
    // Prepare inventory data for Excel
    const inventoryData = inventory.map(item => ({
      ID: item.id,
      'Ingredient Name': item.name,
      Description: item.description,
      Category: item.category_name,
      Unit: item.unit,
      'Current Stock': item.stock_quantity,
      'Minimum Stock Level': item.min_stock_level,
      Status: getStockStatus(item.stock_quantity, item.min_stock_level).label
    }));

    // Prepare transaction data for Excel
    const transactionData = transactions.map(transaction => ({
      ID: transaction.id,
      Date: new Date(transaction.created_at).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      'Ingredient Name': transaction.ingredient_name,
      'Transaction Type': transaction.transaction_type,
      'Quantity Change': transaction.quantity_change,
      Unit: transaction.unit
    }));

    // Create workbook and worksheets
    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);
    const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
    const workbook = XLSX.utils.book_new();
    
    // Add worksheets to workbook
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');

    // Generate and download Excel file
    XLSX.writeFile(workbook, `Inventory_Management_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage ingredient stock levels</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus size={20} />
            Add Ingredient
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Download size={20} />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Add New Ingredient</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddIngredient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={newIngredient.name}
                    onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    value={newIngredient.description}
                    onChange={(e) => setNewIngredient({...newIngredient, description: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    required
                  >
                    <option value="">Select a unit</option>
                    <option value="grams">Grams</option>
                    <option value="liters">Liters</option>
                    <option value="units">Units</option>
                    <option value="kilograms">Kilograms</option>
                    <option value="milliliters">Milliliters</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newIngredient.category_id}
                    onChange={(e) => setNewIngredient({...newIngredient, category_id: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  >
                    <option value="">No Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Initial Stock</label>
                  <input
                    type="number"
                    value={newIngredient.stock_quantity}
                    onChange={(e) => setNewIngredient({...newIngredient, stock_quantity: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
                  <input
                    type="number"
                    value={newIngredient.min_stock_level}
                    onChange={(e) => setNewIngredient({...newIngredient, min_stock_level: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ingredients</p>
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

      {/* Daily Usage Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Daily Usage Statistics</h2>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Show last:</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(parseInt(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="usage" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Ingredient Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('name')}
                >
                  Ingredient <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('category_name')}
                >
                  Category <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('unit')}
                >
                  Unit <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('stock_quantity')}
                >
                  Current Stock <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('min_stock_level')}
                >
                  Min Level <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInventory.map((item) => {
                const status = getStockStatus(item.stock_quantity, item.min_stock_level);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{item.category_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{item.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingItem === item.ingredient_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:border-orange-500 focus:ring-orange-500"
                            min="0"
                          />
                          <button
                            onClick={() => handleUpdateStock(item.ingredient_id, 'ADJUST')}
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
                              setEditingItem(item.ingredient_id);
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
                      {editingMinStock === item.ingredient_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newMinStock}
                            onChange={(e) => setNewMinStock(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:border-orange-500 focus:ring-orange-500"
                            min="0"
                          />
                          <button
                            onClick={() => handleUpdateMinStock(item.ingredient_id)}
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
                              setEditingMinStock(item.ingredient_id);
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(item.ingredient_id);
                            setNewStock(item.stock_quantity.toString());
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Edit Stock"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveIngredient(item.ingredient_id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Ingredient"
                        >
                          <Trash2 size={16} />
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
        {inventory.length > 0 && (
          <div className="p-4 flex justify-between items-center border-t border-gray-200">
            <button
              onClick={() => setInventoryPage(prev => Math.max(prev - 1, 1))}
              disabled={inventoryPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {inventoryPage} of {totalInventoryPages}
            </span>
            <button
              onClick={() => setInventoryPage(prev => Math.min(prev + 1, totalInventoryPages))}
              disabled={inventoryPage === totalInventoryPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleTransactionsSort('created_at')}
                >
                  Date <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleTransactionsSort('ingredient_name')}
                >
                  Ingredient <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleTransactionsSort('transaction_type')}
                >
                  Type <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleTransactionsSort('quantity_change')}
                >
                  Quantity Change <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleTransactionsSort('unit')}
                >
                  Unit <ArrowUpDown size={14} className="inline ml-1" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {new Date(transaction.created_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">{transaction.ingredient_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.transaction_type === 'REMOVE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">{transaction.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No transactions found</p>
          </div>
        )}
        {transactions.length > 0 && (
          <div className="p-4 flex justify-between items-center border-t border-gray-200">
            <button
              onClick={() => setTransactionsPage(prev => Math.max(prev - 1, 1))}
              disabled={transactionsPage === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-600">
              Page {transactionsPage} of {totalTransactionsPages}
            </span>
            <button
              onClick={() => setTransactionsPage(prev => Math.min(prev + 1, totalTransactionsPages))}
              disabled={transactionsPage === totalTransactionsPages}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}