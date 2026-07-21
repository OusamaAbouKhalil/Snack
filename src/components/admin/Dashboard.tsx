import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  Clock,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card, PageHeader, StatCard, Button, Select } from './ui/Kit';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const BRAND = '#c18141';
const BRAND_SOFT = 'rgba(193, 129, 65, 0.15)';
const GREEN = '#059669';
const GREEN_SOFT = 'rgba(5, 150, 105, 0.12)';
const PALETTE = ['#c18141', '#059669', '#2563eb', '#dc2626', '#7c3aed'];

const gridColor = 'rgba(148, 163, 184, 0.15)';

const baseScales = {
  y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0 } },
  x: { grid: { display: false } },
};

export function Dashboard() {
  const { stats, loading, error, refetch } = useDashboardStats();
  const [selectedDays, setSelectedDays] = useState('7');

  const handleDaysChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDays = parseInt(event.target.value);
    setSelectedDays(event.target.value);
    refetch(newDays);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-80 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <span className="text-red-700 dark:text-red-300">Error: {error}</span>
        <Button variant="danger" size="sm" icon={RefreshCw} onClick={() => refetch()}>Retry</Button>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Today's Sales",
      value: `$${stats.todaySales.toFixed(2)}`,
      icon: DollarSign,
      tone: 'green' as const,
    },
    {
      title: 'Orders Today',
      value: stats.todayOrders.toString(),
      icon: ShoppingCart,
      tone: 'blue' as const,
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      tone: 'amber' as const,
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems.toString(),
      icon: AlertTriangle,
      tone: 'red' as const,
    },
    {
      title: 'Items Ordered Today',
      value: stats.totalItemsOrdered.toString(),
      icon: Package,
      tone: 'primary' as const,
    },
    {
      title: 'Online Orders Today',
      value: stats.onlineOrdersToday.toString(),
      icon: Globe,
      tone: 'blue' as const,
    },
  ];

  const lineChartDataItems = {
    labels: stats.dailyItemsOrdered.map((item) => item.date),
    datasets: [
      {
        label: 'Items Ordered',
        data: stats.dailyItemsOrdered.map((item) => item.quantity),
        borderColor: BRAND,
        backgroundColor: BRAND_SOFT,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: BRAND,
      },
    ],
  };

  const lineChartDataSales = {
    labels: stats.dailySales.map((item) => item.date),
    datasets: [
      {
        label: 'Sales ($)',
        data: stats.dailySales.map((item) => item.total),
        borderColor: GREEN,
        backgroundColor: GREEN_SOFT,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: GREEN,
      },
    ],
  };

  const lineChartDataCustomers = {
    labels: stats.newCustomersDaily.map((item) => item.date),
    datasets: [
      {
        label: 'Total Customers',
        data: stats.newCustomersDaily.map((item) => item.cumulative),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#2563eb',
      },
    ],
  };

  const barChartData = {
    labels: stats.topProductsByDate.map((product) => product.name),
    datasets: [
      {
        label: 'Total Sold',
        data: stats.topProductsByDate.map((product) => product.total_sold),
        backgroundColor: PALETTE,
        borderRadius: 8,
        maxBarThickness: 48,
      },
    ],
  };

  const chartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title, font: { size: 13, weight: 'normal' as const }, color: '#94a3b8' },
    },
    scales: baseScales,
  });

  const quickStats = [
    { icon: Users, tone: 'blue' as const, value: stats.totalCustomers, label: 'Total Customers' },
    { icon: TrendingUp, tone: 'green' as const, value: `$${stats.todaySales.toFixed(0)}`, label: "Today's Revenue" },
    { icon: Package, tone: 'amber' as const, value: stats.lowStockItems, label: 'Low Stock' },
    { icon: Clock, tone: 'primary' as const, value: stats.pendingOrders, label: 'Pending Orders' },
  ];

  const quickStatTone: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    primary: 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="What's happening at your store today."
        actions={
          <>
            <Select value={selectedDays} onChange={handleDaysChange} aria-label="Date range" className="w-auto">
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </Select>
            <Button icon={RefreshCw} onClick={() => refetch(parseInt(selectedDays))}>Refresh</Button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <StatCard key={stat.title} label={stat.title} value={stat.value} icon={stat.icon} tone={stat.tone} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Daily Sales</h3>
          <div className="h-72">
            <Line data={lineChartDataSales} options={chartOptions(`Last ${selectedDays} days`)} />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Items Ordered</h3>
          <div className="h-72">
            <Line data={lineChartDataItems} options={chartOptions(`Last ${selectedDays} days`)} />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Customer Growth</h3>
          <div className="h-72">
            <Line data={lineChartDataCustomers} options={chartOptions(`Total customers — last ${selectedDays} days`)} />
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Top Products</h3>
          <div className="h-72">
            <Bar data={barChartData} options={chartOptions(`By units sold — last ${selectedDays} days`)} />
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 font-mono text-sm">#{order.order_number}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{order.customer_name || 'Walk-in Customer'}</p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold mt-1 ${
                        order.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                          : order.status === 'pending'
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">${order.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{order.payment_method}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <ShoppingCart size={40} className="mx-auto mb-3 opacity-40" />
                <p>No recent orders</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Top Selling Products</h3>
          <div className="space-y-3">
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <p className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{product.total_sold} sold</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                      ${(product.total_sold * product.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <Package size={40} className="mx-auto mb-3 opacity-40" />
                <p>No top selling products</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick stats strip */}
      <Card>
        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map(({ icon: Icon, tone, value, label }) => (
            <div key={label} className="text-center">
              <div className={`${quickStatTone[tone]} p-3 rounded-xl w-fit mx-auto mb-2`}>
                <Icon size={22} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
