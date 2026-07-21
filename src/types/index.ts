export interface Category {
  id: string;
  name: string;
  display_order: number;
  is_available: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string; // Optional - lazy loaded for better egress performance
  price: number;
  category_id: string;
  image_url?: string; // Optional - lazy loaded for better egress performance
  is_available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  customer_id?: string | null;
  order_type?: 'pickup' | 'delivery';
  delivery_fee?: number;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  customer_phone?: string | null;
  notes?: string | null;
  source?: 'pos' | 'online';
  discount?: number;
  redeemed_points?: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeliveryZone {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number | null;
  polygon: LatLng[] | null;
  area_m2: number | null;
  fee: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface DeliveryQuote {
  in_zone: boolean;
  fee: number;
  zone_name: string | null;
}

export type RewardType = 'free_delivery' | 'discount_percent' | 'discount_amount' | 'punch_card';

export interface RewardConfig {
  percent?: number;
  amount?: number;
  threshold?: number;
  count_by?: 'orders' | 'items';
  product_id?: string | null;
  reward_type?: 'free_delivery' | 'discount_amount';
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  type: RewardType;
  config: RewardConfig;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface RewardProgress {
  progress: number;
  threshold: number;
  eligible: boolean;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  loyalty_points: number;
  user_id?: string | null;
  address?: string | null;
  city?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  created_at: string;
  total_orders?: number;
  total_spent?: number;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  order_id: string | null;
  points: number;
  type: 'earn' | 'redeem' | 'adjust';
  note: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ExpenseCategory {
  id: string;
  name_en: string;
  name_ar: string;
  display_order: number;
  created_at: string;
}

export interface FinancialRecord {
  id: string;
  type: 'expense' | 'income';
  category_id: string | null;
  amount: number;
  description: string;
  record_date: string;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface FinancialStats {
  totalExpenses: number;
  totalProfits: number;
  netProfit: number;
  recordsCount: number;
  expensesByCategory: Array<{
    category_id: string | null;
    category_name: string;
    total: number;
  }>;
  expensesOverTime: Array<{
    date: string;
    expenses: number;
    profits: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    expenses: number;
    profits: number;
    net: number;
  }>;
  yearlyBreakdown: Array<{
    year: string;
    expenses: number;
    profits: number;
    net: number;
  }>;
}