import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Package,
  Users,
  Settings,
  FileText,
  TrendingUp,
  ShoppingCart,
  Shield,
  Home,
  DollarSign,
  History,
  Boxes,
  Gift,
  Map,
  Volume2,
  VolumeX,
  Menu as MenuIcon,
  X,
  LogOut,
  Bell,
  BellRing,
  Eye,
} from 'lucide-react';
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
import { FinancialManagement } from './FinancialManagement';
import { DeliveryZoneManagement } from './DeliveryZoneManagement';
import { RewardsManagement } from './RewardsManagement';
import { ThemeToggle } from '../ThemeToggle';
import { LanguageToggle } from '../LanguageToggle';
import { useAdminOrderFeed, isMuted, setMuted } from '../../hooks/useAdminOrderFeed';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { supabase } from '../../lib/supabase';
import { Order } from '../../types';

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
  | 'rewards'
  | 'zones'
  | 'settings'
  | 'reports'
  | 'admin-users'
  | 'financial';

interface NavItem {
  id: AdminView;
  label: string;
  icon: typeof BarChart3;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'order-management', label: 'Orders', icon: ShoppingCart },
      { id: 'orders', label: 'Order History', icon: History },
      { id: 'zones', label: 'Delivery Zones', icon: Map },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'categories', label: 'Categories', icon: FileText },
      { id: 'inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    title: 'Customers',
    items: [
      { id: 'customers', label: 'Customers', icon: Users },
      { id: 'rewards', label: 'Rewards', icon: Gift },
    ],
  },
  {
    title: 'Finance',
    items: [
      { id: 'financial', label: 'Financial', icon: DollarSign },
      { id: 'reports', label: 'Sales Reports', icon: TrendingUp },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'admin-users', label: 'Admin Users', icon: Shield },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const VIEW_TITLES: Record<AdminView, string> = {
  dashboard: 'Dashboard',
  'order-management': 'Orders',
  orders: 'Order History',
  zones: 'Delivery Zones',
  products: 'Products',
  categories: 'Categories',
  inventory: 'Inventory',
  customers: 'Customers',
  rewards: 'Rewards',
  financial: 'Financial',
  reports: 'Sales Reports',
  'admin-users': 'Admin Users',
  settings: 'Settings',
};

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [pendingCount, setPendingCount] = useState(0);
  const [orderAlert, setOrderAlert] = useState<Order | null>(null);
  const [focusOrderId, setFocusOrderId] = useState<string | null>(null);
  const { signOut } = useAuth();
  const { info } = useToast();
  const flashTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pending badge: count once, then live-update from the shell-level feed.
  const refreshPending = async () => {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count ?? 0);
  };

  useEffect(() => {
    refreshPending();
    // status changes (complete / cancel) also move the badge
    const channel = supabase
      .channel('admin-shell-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, refreshPending)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Shell-level alert: chime (in hook) + prominent popup + tab-title flash,
  // fires on every admin view since this hook lives in the shell, not a page.
  useAdminOrderFeed((order) => {
    refreshPending();
    if (order.source === 'online') {
      info(`New online order ${order.order_number} — ${order.order_type === 'delivery' ? 'delivery' : 'pickup'}`);
      flashTitle(order.order_number);

      setOrderAlert(order);
      if (alertTimer.current) clearTimeout(alertTimer.current);
      alertTimer.current = setTimeout(() => setOrderAlert(null), 12000);
    }
  });

  const viewAlertOrder = () => {
    if (!orderAlert) return;
    setFocusOrderId(orderAlert.id);
    selectView('order-management');
    setOrderAlert(null);
    if (alertTimer.current) clearTimeout(alertTimer.current);
  };

  const dismissAlert = () => {
    setOrderAlert(null);
    if (alertTimer.current) clearTimeout(alertTimer.current);
  };

  const flashTitle = (orderNumber: string) => {
    if (flashTimer.current) clearInterval(flashTimer.current);
    const original = 'Mat3amji — Admin';
    let on = false;
    flashTimer.current = setInterval(() => {
      document.title = on ? `🔔 ${orderNumber}` : original;
      on = !on;
    }, 900);
    setTimeout(() => {
      if (flashTimer.current) clearInterval(flashTimer.current);
      flashTimer.current = null;
      document.title = original;
    }, 15000);
  };

  useEffect(() => {
    document.title = 'Mat3amji — Admin';
    return () => {
      document.title = 'Mat3amji';
      if (flashTimer.current) clearInterval(flashTimer.current);
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const content = useMemo(() => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'order-management':
        return <OrderManagement focusOrderId={focusOrderId} onFocusHandled={() => setFocusOrderId(null)} />;
      case 'products': return <ProductManagement />;
      case 'categories': return <CategoryManagement />;
      case 'orders': return <OrderHistory />;
      case 'inventory': return <InventoryManagement />;
      case 'customers': return <CustomerManagement />;
      case 'rewards': return <RewardsManagement />;
      case 'zones': return <DeliveryZoneManagement />;
      case 'financial': return <FinancialManagement />;
      case 'settings': return <SettingsPanel />;
      case 'reports': return <SalesReports />;
      case 'admin-users': return <AdminUserManagement />;
      default: return <Dashboard />;
    }
  }, [activeView, focusOrderId]);

  const selectView = (view: AdminView) => {
    setActiveView(view);
    setMobileNavOpen(false);
  };

  const sidebar = (
    <div className="h-full flex flex-col bg-cocoa-950">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 p-0.5 ring-1 ring-white/10">
          <img src="/logo.png" alt="Mat3amji" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-white leading-tight font-display">Mat3amji</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-primary-400">Admin Panel</p>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="ms-auto lg:hidden p-2 rounded-lg text-stone-400 hover:bg-white/10"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500">
              {group.title}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon }) => {
                const active = activeView === id;
                return (
                  <li key={id}>
                    <button
                      onClick={() => selectView(id)}
                      className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? 'bg-primary-600 text-white font-semibold shadow-sm'
                          : 'text-stone-300 hover:bg-white/5 hover:text-white font-medium'
                      }`}
                    >
                      {active && (
                        <span className="absolute -start-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-e-full bg-primary-400" />
                      )}
                      <Icon size={18} className={active ? 'text-white' : 'text-stone-500'} />
                      <span className="truncate">{label}</span>
                      {id === 'order-management' && pendingCount > 0 && (
                        <span className={`ms-auto min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                          active ? 'bg-white text-primary-700' : 'bg-red-500 text-white'
                        }`}>
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="p-3 border-t border-white/10 space-y-0.5 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <Home size={18} className="text-stone-500" />
          Back to Store
        </button>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-gray-900 flex transition-colors duration-300">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-72 max-w-[85vw] shadow-2xl">{sidebar}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 h-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>

          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate font-display">{VIEW_TITLES[activeView]}</h1>

          <div className="ms-auto flex items-center gap-1.5">
            {pendingCount > 0 && (
              <button
                onClick={() => selectView('order-management')}
                className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                <Bell size={15} />
                <span className="hidden sm:inline">{pendingCount} pending</span>
                <span className="sm:hidden">{pendingCount}</span>
              </button>
            )}

            <button
              onClick={toggleMute}
              className={`p-2 rounded-lg transition-colors ${
                muted
                  ? 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-gray-700'
              }`}
              title={muted ? 'Order sound alerts are OFF' : 'Order sound alerts are ON'}
              aria-label={muted ? 'Unmute order alerts' : 'Mute order alerts'}
            >
              {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>

            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{content}</main>
      </div>

      {/* New online order popup — fires on every admin view, not just Orders */}
      {orderAlert && (
        <div className="fixed bottom-6 end-6 z-[60] w-full max-w-sm animate-fade-in-up">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-primary-500 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <span className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0 animate-pulse">
                <BellRing size={20} className="text-primary-600 dark:text-primary-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900 dark:text-gray-100">New Online Order</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  #{orderAlert.order_number} · {orderAlert.order_type === 'delivery' ? 'Delivery' : 'Pickup'} · ${Number(orderAlert.total_amount).toFixed(2)}
                </p>
              </div>
              <button
                onClick={dismissAlert}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
            <button
              onClick={viewAlertOrder}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-2.5 text-sm font-semibold transition-colors"
            >
              <Eye size={15} /> View Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
