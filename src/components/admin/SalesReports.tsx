import { useState } from "react";
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
import { Card, PageHeader, StatCard, Button, Input, Spinner } from './ui/Kit';

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
  const { reports, loading, error, refetch } = useSalesReports(
    dateRange.start,
    dateRange.end
  );

  if (loading) {
    return <Spinner size={40} />;
  }

  if (error) {
    return (
      <Card className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <span className="text-red-700 dark:text-red-300">Error: {error}</span>
        <Button variant="danger" size="sm" icon={Download} onClick={() => refetch()}>Retry</Button>
      </Card>
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
      <PageHeader
        title="Sales Reports"
        subtitle="Analyze your sales performance and trends"
        actions={<Button icon={Download}>Export Report</Button>}
      />

      {/* Date Range Selector */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-500 dark:text-gray-400" size={20} />
            <span className="font-medium text-gray-700 dark:text-gray-300">Date Range:</span>
          </div>
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange({ ...dateRange, start: e.target.value })
            }
            className="w-auto"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange({ ...dateRange, end: e.target.value })
            }
            className="w-auto"
          />
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`$${reports.totalRevenue.toFixed(2)}`} icon={TrendingUp} tone="green" />
        <StatCard label="Total Orders" value={reports.totalOrders} icon={BarChart3} tone="blue" />
        <StatCard label="Average Order" value={`$${reports.averageOrderValue.toFixed(2)}`} icon={PieChart} tone="primary" />
        <StatCard label="Items Sold" value={reports.totalItemsSold} icon={TrendingUp} tone="amber" />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Top Selling Products
          </h3>
          <div className="space-y-3">
            {reports.topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {product.quantity_sold} sold
                    </p>
                  </div>
                </div>
                <div className="text-end flex-shrink-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    ${product.total_revenue.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sales by Category */}
        <Card>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Sales by Category
          </h3>
          <div className="space-y-4">
            {reports.salesByCategory.map((category) => (
              <div key={category.category_id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {category.category_name}
                  </span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400 tabular-nums">
                    ${category.total_revenue.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-500 dark:bg-primary-600 h-2 rounded-full"
                    style={{
                      width: `${
                        (category.total_revenue / reports.totalRevenue) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{category.total_orders} orders <br />
                    <span className="italic text-red-700 dark:text-red-400" >
                      *(May include multiple items of the same order)
                    </span>
                  </span>
                  <span className="font-medium text-green-600 dark:text-green-400 tabular-nums">
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
        </Card>
      </div>

      {/* Daily Sales Chart */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Daily Sales Chart
        </h3>
        <div className="h-80">
          <Line
            key={theme}
            data={lineChartDataSales}
            options={lineChartOptionsSales}
          />
        </div>
      </Card>

      {/* Daily Sales Trend Table */}
      <Card>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
          Daily Sales Trend
        </h3>
        <div className="space-y-3">
          {[...reports.dailySales]
            .slice()
            .reverse()
            .map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/60 rounded-xl"
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {day.total_orders} orders
                  </p>
                </div>
                <div className="text-end">
                  <p className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                    ${day.total_revenue.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                    {day.total_items} items
                  </p>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}
