import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, FileText, Calendar, RefreshCw } from 'lucide-react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { useLanguage } from '../../contexts/LanguageContext';
import { useFinancialRecords } from '../../hooks/useFinancialRecords';
import { FinancialStats, FinancialRecord } from '../../types';
import { Card, StatCard, Button, Select, Input, TableShell, Thead, Th, Td, Spinner } from './ui/Kit';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface FinancialDashboardProps {
  records?: FinancialRecord[];
  onRefetch?: () => void;
}

export function FinancialDashboard({ records: propsRecords, onRefetch }: FinancialDashboardProps = {}) {
  const { t, dir } = useLanguage();
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
    return <Spinner size={36} />;
  }

  const summaryCards = [
    {
      title: t('financial.totalExpenses'),
      value: `$${stats.totalExpenses.toFixed(2)}`,
      icon: TrendingDown,
      tone: 'red' as const,
    },
    {
      title: t('financial.totalProfits'),
      value: `$${stats.totalProfits.toFixed(2)}`,
      icon: TrendingUp,
      tone: 'green' as const,
    },
    {
      title: t('financial.netProfit'),
      value: `$${stats.netProfit.toFixed(2)}`,
      icon: DollarSign,
      tone: stats.netProfit >= 0 ? ('blue' as const) : ('amber' as const),
    },
    {
      title: t('financial.recordsCount'),
      value: stats.recordsCount.toString(),
      icon: FileText,
      tone: 'primary' as const,
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
    <div className="space-y-6" dir={dir}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 font-display">{t('financial.dashboard')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('financial.title')}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={() => {
            refetch();
            loadStats();
          }}
        >
          {t('common.loading').replace('...', '')}
        </Button>
      </div>

      {/* Date Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Calendar size={18} className="text-gray-400 dark:text-gray-500" />
            {t('financial.filterByMonth')}:
          </div>
          <Select
            value={filterMode === 'month' ? selectedMonth : ''}
            onChange={(e) => {
              setFilterMode('month');
              setSelectedMonth(e.target.value);
            }}
            className="w-auto"
          >
            <option value="">{t('financial.all')}</option>
            {months.map(month => (
              <option key={month} value={month}>
                {getMonthName(month)}
              </option>
            ))}
          </Select>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('financial.filterByYear')}:</span>
          <Select
            value={filterMode === 'year' ? selectedYear : ''}
            onChange={(e) => {
              setFilterMode('year');
              setSelectedYear(e.target.value);
            }}
            className="w-auto"
          >
            <option value="">{t('financial.all')}</option>
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Select>

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('financial.customDateRange')}:</span>
          <Input
            type="date"
            value={customRange.from}
            onChange={(e) => {
              setFilterMode('range');
              setCustomRange(prev => ({ ...prev, from: e.target.value }));
            }}
            className="w-auto"
            placeholder={t('financial.fromDate')}
          />
          <span className="text-gray-400 dark:text-gray-500">-</span>
          <Input
            type="date"
            value={customRange.to}
            onChange={(e) => {
              setFilterMode('range');
              setCustomRange(prev => ({ ...prev, to: e.target.value }));
            }}
            className="w-auto"
            placeholder={t('financial.toDate')}
          />

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFilterMode('all');
              setSelectedMonth('');
              setSelectedYear('');
              setCustomRange({ from: '', to: '' });
              setDateFilter({ type: 'all' });
            }}
          >
            {t('financial.all')}
          </Button>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <StatCard key={card.title} label={card.title} value={card.value} icon={card.icon} tone={card.tone} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="h-80">
            <Line data={expensesVsProfitsData} options={expensesVsProfitsOptions} />
          </div>
        </Card>
        <Card>
          <div className="h-80">
            <Bar data={expensesByCategoryData} options={expensesByCategoryOptions} />
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center justify-center" style={{ height: '320px' }}>
            <div className="w-full max-w-md">
              <Pie data={expenseDistributionData} options={expenseDistributionOptions} />
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      {stats.monthlyBreakdown.length > 0 && (
        <Card padded={false}>
          <div className="p-6 pb-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{t('financial.monthlyBreakdown')}</h3>
          </div>
          <TableShell>
            <Thead>
              <Th>{t('common.date')}</Th>
              <Th align="end">{t('financial.totalExpenses')}</Th>
              <Th align="end">{t('financial.totalProfits')}</Th>
              <Th align="end">{t('financial.netProfit')}</Th>
            </Thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stats.monthlyBreakdown.map((item) => (
                <tr key={item.month} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="text-gray-900 dark:text-gray-100">{getMonthName(item.month)}</Td>
                  <Td align="end" className="text-red-600 dark:text-red-400 font-semibold tabular-nums">${item.expenses.toFixed(2)}</Td>
                  <Td align="end" className="text-green-600 dark:text-green-400 font-semibold tabular-nums">${item.profits.toFixed(2)}</Td>
                  <Td align="end" className={`font-semibold tabular-nums ${item.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${item.net.toFixed(2)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      )}
    </div>
  );
}
