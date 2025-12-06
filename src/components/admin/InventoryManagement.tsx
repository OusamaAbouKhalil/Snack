import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, Plus, Edit, Trash2, TrendingDown, Save, X, ArrowUpDown, Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  const getStockStatus = (stock: number, minLevel: number) => {
    if (stock === 0) return { 
      label: 'Out of Stock', 
      color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
    };
    if (stock <= minLevel) return { 
      label: 'Low Stock', 
      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' 
    };
    return { 
      label: 'In Stock', 
      color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
    };
  };

  const filteredAndSortedInventory = useMemo(() => {
    let filtered = [...inventory];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category_name.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = getStockStatus(item.stock_quantity, item.min_stock_level);
        if (statusFilter === 'in-stock') return status.label === 'In Stock';
        if (statusFilter === 'low-stock') return status.label === 'Low Stock';
        if (statusFilter === 'out-of-stock') return status.label === 'Out of Stock';
        return true;
      });
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category_name === categoryFilter);
    }

    // Apply sorting
    if (inventorySortConfig) {
      filtered.sort((a, b) => {
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
    }

    return filtered;
  }, [inventory, inventorySortConfig, searchQuery, statusFilter, categoryFilter]);

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

  const paginatedInventory = filteredAndSortedInventory.slice(
    (inventoryPage - 1) * itemsPerPage,
    inventoryPage * itemsPerPage
  );

  const paginatedTransactions = sortedTransactions.slice(
    (transactionsPage - 1) * itemsPerPage,
    transactionsPage * itemsPerPage
  );

  const totalInventoryPages = Math.ceil(filteredAndSortedInventory.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setInventoryPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);
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
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Track and manage ingredient stock levels</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Ingredient</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Download size={20} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl transition-colors duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">Add New Ingredient</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddIngredient} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">Name</label>
                  <input
                    type="text"
                    value={newIngredient.name}
                    onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">Description</label>
                  <input
                    type="text"
                    value={newIngredient.description}
                    onChange={(e) => setNewIngredient({...newIngredient, description: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">Unit</label>
                  <select
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">Category</label>
                  <select
                    value={newIngredient.category_id}
                    onChange={(e) => setNewIngredient({...newIngredient, category_id: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
                  >
                    <option value="">No Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">Initial Stock</label>
                  <input
                    type="number"
                    value={newIngredient.stock_quantity}
                    onChange={(e) => setNewIngredient({...newIngredient, stock_quantity: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors duration-300">Min Stock Level</label>
                  <input
                    type="number"
                    value={newIngredient.min_stock_level}
                    onChange={(e) => setNewIngredient({...newIngredient, min_stock_level: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 shadow-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <Package className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors duration-300">Total Ingredients</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">{inventory.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors duration-300">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">{lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              <TrendingDown className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors duration-300">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors duration-300">{outOfStockCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Usage Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">Daily Usage Statistics</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Show last:</label>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(parseInt(e.target.value))}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 shadow-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">Ingredient Inventory</h2>
            
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
                />
              </div>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
              >
                <option value="all">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
              
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-orange-500 dark:focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 transition-colors duration-300"
              >
                <option value="all">All Categories</option>
                {[...new Set(inventory.map(item => item.category_name))].map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('name')}
                >
                  Ingredient <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('category_name')}
                >
                  Category <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('unit')}
                >
                  Unit <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('stock_quantity')}
                >
                  Current Stock <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleInventorySort('min_stock_level')}
                >
                  Min Level <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedInventory.map((item) => {
                const status = getStockStatus(item.stock_quantity, item.min_stock_level);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                          <Package className="text-orange-600 dark:text-orange-400" size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{item.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{item.category_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{item.unit}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingItem === item.ingredient_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value)}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-orange-500 dark:focus:ring-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                            min="0"
                          />
                          <button
                            onClick={() => handleUpdateStock(item.ingredient_id, 'ADJUST')}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 transition-colors duration-200"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingItem(null);
                              setNewStock('');
                            }}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-1 transition-colors duration-200"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">{item.stock_quantity}</span>
                          <button
                            onClick={() => {
                              setEditingItem(item.ingredient_id);
                              setNewStock(item.stock_quantity.toString());
                            }}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 p-1 transition-colors duration-200"
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
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm focus:border-orange-500 dark:focus:border-orange-600 focus:ring-orange-500 dark:focus:ring-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
                            min="0"
                          />
                          <button
                            onClick={() => handleUpdateMinStock(item.ingredient_id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 transition-colors duration-200"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMinStock(null);
                              setNewMinStock('');
                            }}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-1 transition-colors duration-200"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-gray-100 transition-colors duration-300">{item.min_stock_level}</span>
                          <button
                            onClick={() => {
                              setEditingMinStock(item.ingredient_id);
                              setNewMinStock(item.min_stock_level.toString());
                            }}
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 p-1 transition-colors duration-200"
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
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 p-1 transition-colors duration-200"
                          title="Edit Stock"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveIngredient(item.ingredient_id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 transition-colors duration-200"
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
        {filteredAndSortedInventory.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto mb-4 opacity-50 text-gray-400 dark:text-gray-500" />
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' 
                ? 'No inventory items match your filters' 
                : 'No inventory items found'}
            </p>
            {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="mt-4 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors duration-200"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
        {filteredAndSortedInventory.length > 0 && (
          <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((inventoryPage - 1) * itemsPerPage) + 1} to {Math.min(inventoryPage * itemsPerPage, filteredAndSortedInventory.length)} of {filteredAndSortedInventory.length} items
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInventoryPage(prev => Math.max(prev - 1, 1))}
                disabled={inventoryPage === 1}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                Page {inventoryPage} of {totalInventoryPages}
              </span>
              <button
                onClick={() => setInventoryPage(prev => Math.min(prev + 1, totalInventoryPages))}
                disabled={inventoryPage === totalInventoryPages}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 transition-colors duration-300">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  onClick={() => handleTransactionsSort('created_at')}
                >
                  Date <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  onClick={() => handleTransactionsSort('ingredient_name')}
                >
                  Ingredient <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  onClick={() => handleTransactionsSort('transaction_type')}
                >
                  Type <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  onClick={() => handleTransactionsSort('quantity_change')}
                >
                  Quantity Change <ArrowUpDown size={14} className="inline ml-1" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                  onClick={() => handleTransactionsSort('unit')}
                >
                  Unit <ArrowUpDown size={14} className="inline ml-1" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 transition-colors duration-300">
                    {new Date(transaction.created_at).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 transition-colors duration-300">{transaction.ingredient_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.transaction_type === 'REMOVE' 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    } transition-colors duration-300`}>
                      {transaction.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 transition-colors duration-300">
                    <span className={transaction.quantity_change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 transition-colors duration-300">{transaction.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
          </div>
        )}
        {transactions.length > 0 && (
          <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {((transactionsPage - 1) * itemsPerPage) + 1} to {Math.min(transactionsPage * itemsPerPage, transactions.length)} of {transactions.length} transactions
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTransactionsPage(prev => Math.max(prev - 1, 1))}
                disabled={transactionsPage === 1}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
                Page {transactionsPage} of {totalTransactionsPages}
              </span>
              <button
                onClick={() => setTransactionsPage(prev => Math.min(prev + 1, totalTransactionsPages))}
                disabled={transactionsPage === totalTransactionsPages}
                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}