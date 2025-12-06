import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, FileText, Calendar, RefreshCw } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancialRecords } from '../../hooks/useFinancialRecords';
import { FinancialStats, FinancialRecord } from '../../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface FinancialDashboardProps {
  records?: FinancialRecord[];
  onRefetch?: () => void;
}

export function FinancialDashboard({ records: propsRecords, onRefetch }: FinancialDashboardProps = {}) {
  const { t, dir, language } = useLanguage();
  const hookData = useFinancialRecords();
  const { records: hookRecords, calculateStats, dateFilter, setDateFilter, refetch: hookRefetch } = hookData;
  
  // Use props records if provided, otherwise use hook records
  const records = propsRecords || hookRecords;
  const refetch = onRefetch || hookRefetch;
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Set default to current month
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState('');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'year' | 'range'>('month');
  
  // Initialize with current month on mount
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    setSelectedMonth(currentMonth);
    setFilterMode('month');
    setDateFilter({ type: 'month', value: currentMonth });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStats();
  }, [dateFilter, records, calculateStats]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Ensure we have the latest records before calculating
      const calculatedStats = await calculateStats();
      setStats(calculatedStats);
    } catch (err) {
      console.error('Error calculating stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    if (filterMode === 'month' && selectedMonth) {
      setDateFilter({ type: 'month', value: selectedMonth });
    } else if (filterMode === 'year' && selectedYear) {
      setDateFilter({ type: 'year', value: selectedYear });
    } else if (filterMode === 'range' && customRange.from && customRange.to) {
      setDateFilter({ type: 'range', value: customRange });
    } else {
      setDateFilter({ type: 'all' });
    }
  };

  useEffect(() => {
    handleFilterChange();
  }, [filterMode, selectedMonth, selectedYear, customRange.from, customRange.to]);

  const getMonthName = (monthNum: string) => {
    const months = [
      t('financial.january'), t('financial.february'), t('financial.march'),
      t('financial.april'), t('financial.may'), t('financial.june'),
      t('financial.july'), t('financial.august'), t('financial.september'),
      t('financial.october'), t('financial.november'), t('financial.december'),
    ];
    const monthIndex = parseInt(monthNum.split('-')[1]) - 1;
    return months[monthIndex] || monthNum;
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const summaryCards = [
    {
      title: t('financial.totalExpenses'),
      value: `$${stats.totalExpenses.toFixed(2)}`,
      icon: TrendingDown,
      color: 'bg-red-500',
      change: stats.totalExpenses > 0 ? '+' : '0',
    },
    {
      title: t('financial.totalProfits'),
      value: `$${stats.totalProfits.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: stats.totalProfits > 0 ? '+' : '0',
    },
    {
      title: t('financial.netProfit'),
      value: `$${stats.netProfit.toFixed(2)}`,
      icon: DollarSign,
      color: stats.netProfit >= 0 ? 'bg-blue-500' : 'bg-orange-500',
      change: stats.netProfit >= 0 ? '+' : '',
    },
    {
      title: t('financial.recordsCount'),
      value: stats.recordsCount.toString(),
      icon: FileText,
      color: 'bg-purple-500',
      change: '',
    },
  ];

  // Expenses vs Profits Line Chart
  const expensesVsProfitsData = {
    labels: stats.expensesOverTime.map(item => new Date(item.date).toLocaleDateString()),
    datasets: [
      {
        label: t('financial.expense'),
        data: stats.expensesOverTime.map(item => item.expenses),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t('financial.totalProfits'),
        data: stats.expensesOverTime.map(item => item.profits),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const expensesVsProfitsOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: t('financial.expensesVsProfits'),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: t('common.amount'),
        },
      },
    },
  };

  // Expenses by Category Bar Chart
  const expensesByCategoryData = {
    labels: stats.expensesByCategory.map(item => item.category_name),
    datasets: [
      {
        label: t('financial.expense'),
        data: stats.expensesByCategory.map(item => item.total),
        backgroundColor: [
          '#ef4444', '#f97316', '#eab308', '#22c55e',
          '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
        ],
        borderColor: [
          '#dc2626', '#ea580c', '#ca8a04', '#16a34a',
          '#2563eb', '#7c3aed', '#db2777', '#0d9488',
        ],
        borderWidth: 1,
      },
    ],
  };

  const expensesByCategoryOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: t('financial.expensesByCategory'),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: t('common.amount'),
        },
      },
    },
  };

  // Expense Distribution Pie Chart
  const expenseDistributionData = {
    labels: stats.expensesByCategory.map(item => item.category_name),
    datasets: [
      {
        data: stats.expensesByCategory.map(item => item.total),
        backgroundColor: [
          '#ef4444', '#f97316', '#eab308', '#22c55e',
          '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const expenseDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: t('financial.expenseDistribution'),
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
          },
        },
      },
    },
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    return `${currentYear}-${month}`;
  });

  return (
    <div className="space-y-8" dir={dir}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('financial.dashboard')}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {t('financial.title')}
          </p>
        </div>
        <button
          onClick={() => {
            refetch();
            loadStats();
          }}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          {t('common.loading').replace('...', '')}
        </button>
      </div>

      {/* Date Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('financial.filterByMonth')}:
            </span>
          </div>
          <select
            value={filterMode === 'month' ? selectedMonth : ''}
            onChange={(e) => {
              setFilterMode('month');
              setSelectedMonth(e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('financial.all')}</option>
            {months.map(month => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('financial.filterByYear')}:
            </span>
          </div>
          <select
            value={filterMode === 'year' ? selectedYear : ''}
            onChange={(e) => {
              setFilterMode('year');
              setSelectedYear(e.target.value);
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('financial.all')}</option>
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('financial.customDateRange')}:
            </span>
          </div>
          <input
            type="date"
            value={customRange.from}
            onChange={(e) => {
              setFilterMode('range');
              setCustomRange(prev => ({ ...prev, from: e.target.value }));
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder={t('financial.fromDate')}
          />
          <span className="text-gray-500 dark:text-gray-400">-</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) => {
              setFilterMode('range');
              setCustomRange(prev => ({ ...prev, to: e.target.value }));
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            placeholder={t('financial.toDate')}
          />

          <button
            onClick={() => {
              setFilterMode('all');
              setSelectedMonth('');
              setSelectedYear('');
              setCustomRange({ from: '', to: '' });
              setDateFilter({ type: 'all' });
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('financial.all')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="h-80">
            <Line data={expensesVsProfitsData} options={expensesVsProfitsOptions} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="h-80">
            <Bar data={expensesByCategoryData} options={expensesByCategoryOptions} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col items-center justify-center" style={{ height: '320px' }}>
            <div className="w-full max-w-md">
              <Pie data={expenseDistributionData} options={expenseDistributionOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      {stats.monthlyBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('financial.monthlyBreakdown')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('common.date')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('financial.totalExpenses')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('financial.totalProfits')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('financial.netProfit')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stats.monthlyBreakdown.map((item) => (
                  <tr key={item.month} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {getMonthName(item.month)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400 font-medium">
                      ${item.expenses.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400 font-medium">
                      ${item.profits.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${
                      item.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      ${item.net.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

