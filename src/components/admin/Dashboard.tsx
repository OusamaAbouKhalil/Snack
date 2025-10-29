
import React, { useState } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

export function Dashboard() {
  const { stats, loading, error, refetch } = useDashboardStats();
  const [selectedDays, setSelectedDays] = useState('7');
  const [code, setCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const correctCode = import.meta.env.VITE_DASHBOARD_CODE;

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === correctCode) {
      setIsAuthenticated(true);
      setCodeError(null);
    } else {
      setCodeError('Invalid code. Please try again.');
      setCode('');
    }
  };

  const handleDaysChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDays = parseInt(event.target.value);
    setSelectedDays(event.target.value);
    refetch(newDays);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 max-w-md w-full transition-colors duration-300">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Enter Dashboard Code</h1>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter access code"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300"
              />
              {codeError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-2">{codeError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              Submit
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
        <span>Error: {error}</span>
        <button
          onClick={() => refetch()}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Today's Sales",
      value: `$${stats.todaySales.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      change: '+12%'
    },
    {
      title: 'Orders Today',
      value: stats.todayOrders.toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
      change: '+8%'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toString(),
      icon: Clock,
      color: 'bg-yellow-500',
      change: `${stats.pendingOrders} pending`
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems.toString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: 'Need attention'
    },
    {
      title: 'Items Ordered Today',
      value: stats.totalItemsOrdered.toString(),
      icon: Package,
      color: 'bg-purple-500',
      change: `${stats.totalItemsOrdered} items`
    }
  ];

  // Line chart data for daily items ordered
  const lineChartDataItems = {
    labels: stats.dailyItemsOrdered.map(item => item.date),
    datasets: [
      {
        label: 'Items Ordered',
        data: stats.dailyItemsOrdered.map(item => item.quantity),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const lineChartOptionsItems = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: `Items Ordered Per Day (Last ${selectedDays} Days)`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Items Ordered'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  // Line chart data for daily sales
  const lineChartDataSales = {
    labels: stats.dailySales.map(item => item.date),
    datasets: [
      {
        label: 'Sales ($)',
        data: stats.dailySales.map(item => item.total),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const lineChartOptionsSales = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: `Daily Sales (Last ${selectedDays} Days)`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Sales ($)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  // Bar chart data for top products by date
  const barChartData = {
    labels: stats.topProductsByDate.map(product => product.name),
    datasets: [
      {
        label: 'Total Sold',
        data: stats.topProductsByDate.map(product => product.total_sold),
        backgroundColor: ['#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6'],
        borderColor: ['#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6'],
        borderWidth: 1
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: `Top Products Sales (Last ${selectedDays} Days)`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Items Sold'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Product'
        }
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300">Welcome back! Here's what's happening at your store today.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="daysFilter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Show last:
            </label>
            <select
              id="daysFilter"
              value={selectedDays}
              onChange={handleDaysChange}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
          <button
            onClick={() => refetch()}
            className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">{stat.change}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">from yesterday</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Items Ordered Trend</h3>
          <div className="h-80">
            <Line data={lineChartDataItems} options={lineChartOptionsItems} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Sales Trend</h3>
          <div className="h-80">
            <Line data={lineChartDataSales} options={lineChartOptionsSales} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Products Sales</h3>
          <div className="h-80">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Orders</h3>
          <div className="space-y-4">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-300">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">#{order.order_number}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{order.customer_name || 'Walk-in Customer'}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 transition-colors duration-300 ${
                      order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' :
                      order.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' :
                      'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${order.total_amount.toFixed(2)}</p>
                    <p className="text-sm text-gray-600 capitalize">{order.payment_method}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                <p>No recent orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
          <div className="space-y-4">
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{product.total_sold} sold</p>
                    <p className="text-sm text-gray-600">${(product.total_sold * product.price).toFixed(2)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package size={48} className="mx-auto mb-4 opacity-50" />
                <p>No top selling products</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="bg-blue-100 p-3 rounded-lg w-fit mx-auto mb-2">
              <Users className="text-blue-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
            <p className="text-sm text-gray-600">Total Customers</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 p-3 rounded-lg w-fit mx-auto mb-2">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-gray-900">${stats.todaySales.toFixed(0)}</p>
            <p className="text-sm text-gray-600">Today's Revenue</p>
          </div>
          <div className="text-center">
            <div className="bg-yellow-100 p-3 rounded-lg w-fit mx-auto mb-2">
              <Package className="text-yellow-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
            <p className="text-sm text-gray-600">Low Stock</p>
          </div>
          <div className="text-center">
            <div className="bg-orange-100 p-3 rounded-lg w-fit mx-auto mb-2">
              <Clock className="text-orange-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
            <p className="text-sm text-gray-600">Pending Orders</p>
          </div>
        </div>
      </div>
    </div>
  );
}
