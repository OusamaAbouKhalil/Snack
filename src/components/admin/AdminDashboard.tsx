import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, Package, Users, Settings, FileText, TrendingUp, ShoppingCart, Shield, Home } from 'lucide-react';
import { Dashboard } from './Dashboard';
import { ProductManagement } from './ProductManagement';
import { CategoryManagement } from './CategoryManagement';
import { OrderHistory } from './OrderHistory';
import { InventoryManagement } from './InventoryManagement';
import { CustomerManagement } from './CustomerManagement';
import { SettingsPanel } from './SettingsPanel';
import { SalesReports } from './SalesReports';
import { AdminUserManagement } from './AdminUserManagement';
import { OrderManagement } from './OrderManagement';

interface AdminDashboardProps {
  onClose: () => void;
}

type AdminView = 
  | 'dashboard' 
  | 'products' 
  | 'categories' 
  | 'orders' 
  | 'order-management' 
  | 'inventory' 
  | 'customers' 
  | 'settings' 
  | 'reports' 
  | 'admin-users';

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [collapsed, setCollapsed] = useState(true); // <-- collapsed by default

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'order-management', label: 'Order Mgmt', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: FileText },
    { id: 'orders', label: 'Order History', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Sales Reports', icon: TrendingUp },
    { id: 'admin-users', label: 'Admin Users', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'order-management': return <OrderManagement />;
      case 'products': return <ProductManagement />;
      case 'categories': return <CategoryManagement />;
      case 'orders': return <OrderHistory />;
      case 'inventory': return <InventoryManagement />;
      case 'customers': return <CustomerManagement />;
      case 'settings': return <SettingsPanel />;
      case 'reports': return <SalesReports />;
      case 'admin-users': return <AdminUserManagement />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${collapsed ? 'w-20' : 'w-64'} bg-white shadow-lg transition-all duration-300`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!collapsed && <h2 className="text-lg font-bold text-gray-800">Admin Panel</h2>}
          <div className="flex gap-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            {!collapsed && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Main Site"
              >
                <Home size={20} />
              </button>
            )}
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveView(item.id as AdminView)}
                    className={`w-full flex items-center rounded-lg px-4 py-3 transition-colors 
                      ${activeView === item.id 
                        ? 'bg-primary-100 text-primary-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <Icon size={20} />
                    {!collapsed && <span className="ml-3">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
