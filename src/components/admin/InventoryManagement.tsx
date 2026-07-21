import React, { useState, useEffect, useMemo } from 'react';
import { Package, AlertTriangle, Plus, Edit, Trash2, TrendingDown, Save, X, ArrowUpDown, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { useToast } from '../ui/Toast';
import { useConfirm } from '../ui/ConfirmDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import {
  Card, PageHeader, StatCard, Button, IconButton, Badge, Field, Input, Select, Modal,
  EmptyState, Spinner, TableShell, Thead, Th, Td,
} from './ui/Kit';

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

  const toast = useToast();
  const confirm = useConfirm();
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
      toast.error('Please enter valid numbers for stock quantity and minimum stock level');
      return;
    }
    if (!parsedIngredient.unit) {
      toast.error('Please specify a unit (e.g., grams, liters, units)');
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
      toast.error('Please enter a valid stock quantity');
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
      toast.error('Please enter a valid minimum stock level');
      return;
    }

    const success = await updateMinStockLevel(ingredientId, minStock);
    if (success) {
      setEditingMinStock(null);
      setNewMinStock('');
    }
  };

  const handleRemoveIngredient = async (ingredientId: string) => {
    if (await confirm({ message: 'Are you sure you want to delete this ingredient?', danger: true })) {
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
    if (stock === 0) return { label: 'Out of Stock', tone: 'danger' as const };
    if (stock <= minLevel) return { label: 'Low Stock', tone: 'warning' as const };
    return { label: 'In Stock', tone: 'success' as const };
  };

  const filteredAndSortedInventory = useMemo(() => {
    let filtered = [...inventory];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category_name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = getStockStatus(item.stock_quantity, item.min_stock_level);
        if (statusFilter === 'in-stock') return status.label === 'In Stock';
        if (statusFilter === 'low-stock') return status.label === 'Low Stock';
        if (statusFilter === 'out-of-stock') return status.label === 'Out of Stock';
        return true;
      });
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category_name === categoryFilter);
    }

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

  useEffect(() => {
    setInventoryPage(1);
  }, [searchQuery, statusFilter, categoryFilter]);
  const totalTransactionsPages = Math.ceil(transactions.length / itemsPerPage);

  const exportToExcel = () => {
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

    const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);
    const transactionSheet = XLSX.utils.json_to_sheet(transactionData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');

    XLSX.writeFile(workbook, `Inventory_Management_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <Card className="!bg-red-50 dark:!bg-red-900/30 !border-red-200 dark:!border-red-800">
        <p className="text-red-700 dark:text-red-300 text-sm">Error: {error}</p>
      </Card>
    );
  }

  const lowStockCount = inventory.filter(item => item.stock_quantity <= item.min_stock_level && item.stock_quantity > 0).length;
  const outOfStockCount = inventory.filter(item => item.stock_quantity === 0).length;

  const sortHeader = (label: string, key: keyof InventoryItem) => (
    <button onClick={() => handleInventorySort(key)} className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
      {label} <ArrowUpDown size={13} />
    </button>
  );

  const sortTxHeader = (label: string, key: keyof Transaction) => (
    <button onClick={() => handleTransactionsSort(key)} className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200">
      {label} <ArrowUpDown size={13} />
    </button>
  );

  const paginationBar = (page: number, totalPages: number, setPage: (n: number) => void, count: number, label: string) => (
    <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, count)} of {count} {label}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1}>
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="text-sm text-gray-600 dark:text-gray-400 px-2">Page {page} of {totalPages || 1}</span>
        <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page === totalPages || totalPages === 0}>
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        subtitle="Track and manage ingredient stock levels"
        actions={
          <>
            <Button icon={Plus} onClick={() => setShowAddModal(true)}>
              <span className="hidden sm:inline">Add Ingredient</span>
            </Button>
            <Button variant="secondary" icon={Download} onClick={exportToExcel}>
              <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        }
      />

      {/* Stock Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard label="Total Ingredients" value={inventory.length} icon={Package} tone="green" />
        <StatCard label="Low Stock Items" value={lowStockCount} icon={AlertTriangle} tone="amber" />
        <StatCard label="Out of Stock" value={outOfStockCount} icon={TrendingDown} tone="red" />
      </div>

      {/* Daily Usage Chart */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Daily Usage Statistics</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Show last:</label>
            <Select value={daysFilter} onChange={(e) => setDaysFilter(parseInt(e.target.value))} className="w-auto py-1.5">
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </Select>
          </div>
        </div>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="usage" fill="#c18141" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Inventory Table */}
      <Card padded={false}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Ingredient Inventory</h2>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:min-w-[200px]">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  type="text"
                  placeholder="Search ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>

              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-auto">
                <option value="all">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </Select>

              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
                <option value="all">All Categories</option>
                {[...new Set(inventory.map(item => item.category_name))].map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {filteredAndSortedInventory.length === 0 ? (
          <EmptyState
            icon={Package}
            title={searchQuery || statusFilter !== 'all' || categoryFilter !== 'all' ? 'No inventory items match your filters' : 'No inventory items found'}
            action={
              (searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
                <Button variant="ghost" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); }}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableShell>
              <Thead>
                <Th>{sortHeader('Ingredient', 'name')}</Th>
                <Th>{sortHeader('Category', 'category_name')}</Th>
                <Th>{sortHeader('Unit', 'unit')}</Th>
                <Th>{sortHeader('Current Stock', 'stock_quantity')}</Th>
                <Th>{sortHeader('Min Level', 'min_stock_level')}</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedInventory.map((item) => {
                  const status = getStockStatus(item.stock_quantity, item.min_stock_level);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <Td>
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="text-primary-600 dark:text-primary-400" size={17} />
                          </span>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</div>
                          </div>
                        </div>
                      </Td>
                      <Td className="text-gray-700 dark:text-gray-200">{item.category_name}</Td>
                      <Td className="text-gray-700 dark:text-gray-200">{item.unit}</Td>
                      <Td>
                        {editingItem === item.ingredient_id ? (
                          <div className="flex items-center gap-1.5">
                            <Input type="number" value={newStock} onChange={(e) => setNewStock(e.target.value)} className="w-20 !py-1.5" min="0" />
                            <IconButton icon={Save} label="Save stock" tone="primary" onClick={() => handleUpdateStock(item.ingredient_id, 'ADJUST')} />
                            <IconButton icon={X} label="Cancel" onClick={() => { setEditingItem(null); setNewStock(''); }} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{item.stock_quantity}</span>
                            <IconButton
                              icon={Edit}
                              label="Edit stock"
                              tone="primary"
                              onClick={() => { setEditingItem(item.ingredient_id); setNewStock(item.stock_quantity.toString()); }}
                            />
                          </div>
                        )}
                      </Td>
                      <Td>
                        {editingMinStock === item.ingredient_id ? (
                          <div className="flex items-center gap-1.5">
                            <Input type="number" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} className="w-20 !py-1.5" min="0" />
                            <IconButton icon={Save} label="Save minimum" tone="primary" onClick={() => handleUpdateMinStock(item.ingredient_id)} />
                            <IconButton icon={X} label="Cancel" onClick={() => { setEditingMinStock(null); setNewMinStock(''); }} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 dark:text-gray-100 tabular-nums">{item.min_stock_level}</span>
                            <IconButton
                              icon={Edit}
                              label="Edit minimum"
                              tone="primary"
                              onClick={() => { setEditingMinStock(item.ingredient_id); setNewMinStock(item.min_stock_level.toString()); }}
                            />
                          </div>
                        )}
                      </Td>
                      <Td><Badge tone={status.tone}>{status.label}</Badge></Td>
                      <Td>
                        <div className="flex gap-1">
                          <IconButton
                            icon={Edit}
                            label="Edit stock"
                            tone="primary"
                            onClick={() => { setEditingItem(item.ingredient_id); setNewStock(item.stock_quantity.toString()); }}
                          />
                          <IconButton icon={Trash2} label="Delete ingredient" tone="danger" onClick={() => handleRemoveIngredient(item.ingredient_id)} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
            {paginationBar(inventoryPage, totalInventoryPages, setInventoryPage, filteredAndSortedInventory.length, 'items')}
          </>
        )}
      </Card>

      {/* Transaction History Table */}
      <Card padded={false}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <EmptyState icon={ArrowUpDown} title="No transactions found" />
        ) : (
          <>
            <TableShell>
              <Thead>
                <Th>{sortTxHeader('Date', 'created_at')}</Th>
                <Th>{sortTxHeader('Ingredient', 'ingredient_name')}</Th>
                <Th>{sortTxHeader('Type', 'transaction_type')}</Th>
                <Th>{sortTxHeader('Quantity Change', 'quantity_change')}</Th>
                <Th>{sortTxHeader('Unit', 'unit')}</Th>
              </Thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <Td className="text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {new Date(transaction.created_at).toLocaleString('en-GB', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </Td>
                    <Td className="text-gray-900 dark:text-gray-100">{transaction.ingredient_name}</Td>
                    <Td><Badge tone={transaction.transaction_type === 'REMOVE' ? 'danger' : 'success'}>{transaction.transaction_type}</Badge></Td>
                    <Td className={`tabular-nums font-medium ${transaction.quantity_change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                    </Td>
                    <Td className="text-gray-700 dark:text-gray-200">{transaction.unit}</Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
            {paginationBar(transactionsPage, totalTransactionsPages, setTransactionsPage, transactions.length, 'transactions')}
          </>
        )}
      </Card>

      {/* Add Ingredient Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Ingredient" maxWidth="max-w-2xl">
        <form onSubmit={handleAddIngredient} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name" required>
              <Input type="text" value={newIngredient.name} onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })} required />
            </Field>
            <Field label="Description">
              <Input type="text" value={newIngredient.description} onChange={(e) => setNewIngredient({ ...newIngredient, description: e.target.value })} />
            </Field>
            <Field label="Unit" required>
              <Select value={newIngredient.unit} onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })} required>
                <option value="">Select a unit</option>
                <option value="grams">Grams</option>
                <option value="liters">Liters</option>
                <option value="units">Units</option>
                <option value="kilograms">Kilograms</option>
                <option value="milliliters">Milliliters</option>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={newIngredient.category_id} onChange={(e) => setNewIngredient({ ...newIngredient, category_id: e.target.value })}>
                <option value="">No Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Initial Stock" required>
              <Input type="number" value={newIngredient.stock_quantity} onChange={(e) => setNewIngredient({ ...newIngredient, stock_quantity: e.target.value })} min="0" required />
            </Field>
            <Field label="Min Stock Level" required>
              <Input type="number" value={newIngredient.min_stock_level} onChange={(e) => setNewIngredient({ ...newIngredient, min_stock_level: e.target.value })} min="0" required />
            </Field>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
