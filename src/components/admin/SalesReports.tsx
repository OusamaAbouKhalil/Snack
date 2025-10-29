import React, { useState } from "react";
import {
  Calendar,
  TrendingUp,
  Download,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useSalesReports } from "../../hooks/useSalesReports";
import { useTheme } from "../../contexts/ThemeContext";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function SalesReports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [code, setCode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const correctCode = import.meta.env.VITE_SALES_REPORTS_CODE;
  const { reports, loading, error, refetch } = useSalesReports(
    dateRange.start,
    dateRange.end
  );

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === correctCode) {
      setIsAuthenticated(true);
      setCodeError(null);
    } else {
      setCodeError("Invalid code. Please try again.");
      setCode("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 max-w-md w-full transition-colors duration-300">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
            Enter Sales Reports Code
          </h1>
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
      <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between transition-colors duration-300">
        <span>Error: {error}</span>
        <button
          onClick={() => refetch()}
          className="bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
        >
          <Download size={14} />
          Retry
        </button>
      </div>
    );
  }

  // Line chart data for daily sales
  const lineChartDataSales = {
    labels: reports.dailySales.map((item) => item.date),
    datasets: [
      {
        label: "Sales ($)",
        data: reports.dailySales.map((item) => item.total_revenue),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Get current theme from context
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';
  const gridColor = isDarkMode ? '#374151' : '#e5e7eb';

  // Chart options that update with theme
  const lineChartOptionsSales = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: textColor,
        },
      },
      title: {
        display: true,
        text: `Daily Sales Trend (${new Date(
          dateRange.start
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${new Date(dateRange.end).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })})`,
        color: textColor,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Sales ($)",
          color: textColor,
        },
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
          color: textColor,
        },
        ticks: {
          color: textColor,
        },
        grid: {
          color: gridColor,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Sales Reports</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Analyze your sales performance and trends
          </p>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Download size={20} />
          Export Report
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-500 dark:text-gray-400" size={20} />
            <span className="font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
          </div>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange({ ...dateRange, start: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ ...dateRange, end: e.target.value })
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors duration-300"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-lg">
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${reports.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
              <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {reports.totalOrders}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg">
              <PieChart className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Order</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                ${reports.averageOrderValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-lg">
              <TrendingUp className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Items Sold</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {reports.totalItemsSold}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Selling Products
          </h3>
          <div className="space-y-4">
            {reports.topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {product.quantity_sold} sold
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    ${product.total_revenue.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Sales by Category
          </h3>
          <div className="space-y-4">
            {reports.salesByCategory.map((category) => (
              <div key={category.category_id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {category.category_name}
                  </span>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    ${category.total_revenue.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-orange-500 dark:bg-orange-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (category.total_revenue / reports.totalRevenue) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{category.total_orders} orders <br /> 
                    <span className="italic text-red-800 dark:text-red-400" >
                      *(May include multible item of the same order)
                    </span>

                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {(
                      (category.total_revenue / reports.totalRevenue) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Sales Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Daily Sales Chart
        </h3>
        <div className="h-80">
          <Line 
            key={theme} 
            data={lineChartDataSales} 
            options={lineChartOptionsSales} 
          />
        </div>
      </div>

      {/* Daily Sales Trend Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Daily Sales Trend
        </h3>
        <div className="space-y-3">
          {[...reports.dailySales]
            .slice()
            .reverse()
            .map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-300"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {day.total_orders} orders
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    ${day.total_revenue.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {day.total_items} items
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}