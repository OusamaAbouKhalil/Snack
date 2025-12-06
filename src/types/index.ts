export interface Category {
  id: string;
  name: string;
  display_order: number;
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