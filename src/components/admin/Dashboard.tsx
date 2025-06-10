import React from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Users, Package, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useDashboardStats } from '../../hooks/useDashboardStats';

export function Dashboard() {
  const { stats, loading, error, refetch } = useDashboardStats();

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
          onClick={refetch}
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
      title: 'Today\'s Sales',
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
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening at your store today.</p>
        </div>
        <button
          onClick={refetch}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                <span className="text-sm text-gray-500 ml-1">from yesterday</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-4">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">#{order.order_number}</p>
                    <p className="text-sm text-gray-600">{order.customer_name || 'Walk-in Customer'}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
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
            {stats.topProducts.map((product, index) => (
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
            ))}
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