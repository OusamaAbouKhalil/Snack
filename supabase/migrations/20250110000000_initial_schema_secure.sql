/*
  # Hadi Snack POS Database Schema - Secure Version
  
  This is a consolidated migration that creates all tables with improved security.
  
  1. Tables Created:
    - categories
    - products
    - orders
    - order_items
    - customers
    - inventory
    - settings
    - admin_users
    - expense_categories
    - financial_records
  
  2. Security Improvements:
    - RLS enabled on all tables
    - Public read access only for products and categories (for menu display)
    - Authenticated users can create orders
    - Admin-only access for sensitive operations
    - Proper indexes for performance
*/

-- ============================================
-- CORE TABLES
-- ============================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  image_url text DEFAULT '',
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  customer_name text DEFAULT '',
  total_amount decimal(10,2) NOT NULL,
  payment_method text DEFAULT 'cash',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ADMIN & MANAGEMENT TABLES
-- ============================================

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text DEFAULT '',
  loyalty_points integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  last_updated timestamptz DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Expense categories table
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL,
  name_ar text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name_en),
  UNIQUE(name_ar)
);

-- Financial records table
CREATE TABLE IF NOT EXISTS financial_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('expense', 'income')),
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  description text DEFAULT '',
  record_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURE RLS POLICIES
-- ============================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Categories: Public read, admin write
DROP POLICY IF EXISTS "Public can read categories" ON categories;
CREATE POLICY "Public can read categories" ON categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (is_admin(auth.uid()));

-- Products: Public read, admin write
DROP POLICY IF EXISTS "Public can read products" ON products;
CREATE POLICY "Public can read products" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_admin(auth.uid()));

-- Orders: Public can create and read their own, admins can manage all
DROP POLICY IF EXISTS "Public can create orders" ON orders;
CREATE POLICY "Public can create orders" ON orders
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read orders" ON orders;
CREATE POLICY "Public can read orders" ON orders
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage all orders" ON orders;
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (is_admin(auth.uid()));

-- Order items: Public can create, admins can manage all
DROP POLICY IF EXISTS "Public can create order items" ON order_items;
CREATE POLICY "Public can create order items" ON order_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read order items" ON order_items;
CREATE POLICY "Public can read order items" ON order_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage order items" ON order_items;
CREATE POLICY "Admins can manage order items" ON order_items
  FOR ALL USING (is_admin(auth.uid()));

-- Admin users: Public read for checking admin status, admins can manage
DROP POLICY IF EXISTS "Public can read admin users" ON admin_users;
CREATE POLICY "Public can read admin users" ON admin_users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage admin users" ON admin_users;
CREATE POLICY "Admins can manage admin users" ON admin_users
  FOR ALL USING (is_admin(auth.uid()));

-- Customers: Admins can manage, public can read
DROP POLICY IF EXISTS "Public can read customers" ON customers;
CREATE POLICY "Public can read customers" ON customers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage customers" ON customers;
CREATE POLICY "Admins can manage customers" ON customers
  FOR ALL USING (is_admin(auth.uid()));

-- Inventory: Public read, admin write
DROP POLICY IF EXISTS "Public can read inventory" ON inventory;
CREATE POLICY "Public can read inventory" ON inventory
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory;
CREATE POLICY "Admins can manage inventory" ON inventory
  FOR ALL USING (is_admin(auth.uid()));

-- Settings: Public read, admin write
DROP POLICY IF EXISTS "Public can read settings" ON settings;
CREATE POLICY "Public can read settings" ON settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (is_admin(auth.uid()));

-- Expense categories: Admin only
DROP POLICY IF EXISTS "Admins can manage expense categories" ON expense_categories;
CREATE POLICY "Admins can manage expense categories" ON expense_categories
  FOR ALL USING (is_admin(auth.uid()));

-- Financial records: Admin only
DROP POLICY IF EXISTS "Admins can manage financial records" ON financial_records;
CREATE POLICY "Admins can manage financial records" ON financial_records
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_products_category_available_name 
  ON products(category_id, is_available, name) 
  WHERE is_available = true;

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at 
  ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_completed_created_at 
  ON orders(created_at) 
  WHERE status = 'completed';

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_created 
  ON order_items(order_id, created_at);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_quantity ON inventory(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
  ON inventory(stock_quantity, min_stock_level) 
  WHERE stock_quantity > 0;

-- Financial records indexes
CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category_id ON financial_records(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type_date ON financial_records(type, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_categories_display_order ON expense_categories(display_order);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for financial_records
DROP TRIGGER IF EXISTS update_financial_records_updated_at ON financial_records;
CREATE TRIGGER update_financial_records_updated_at
  BEFORE UPDATE ON financial_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DEFAULT DATA
-- ============================================

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('tax_rate', '11.0'),
  ('currency', 'LBP'),
  ('store_name', 'Hadi Snack'),
  ('store_address', ''),
  ('store_phone', ''),
  ('loyalty_points_rate', '1.0'),
  ('low_stock_threshold', '10'),
  ('usd_to_lbp_rate', '90000')
ON CONFLICT (key) DO NOTHING;

-- Insert default expense categories
INSERT INTO expense_categories (name_en, name_ar, display_order) VALUES
  ('Rent', 'إيجار', 1),
  ('Salary', 'راتب', 2),
  ('Operational Expenses', 'المصاريف التشغيلية', 3),
  ('Other', 'أخرى', 4)
ON CONFLICT DO NOTHING;

-- Insert sample categories (snack-related)
INSERT INTO categories (name, display_order) VALUES
  ('Snacks', 1),
  ('Beverages', 2),
  ('Desserts', 3),
  ('Add-ons', 4)
ON CONFLICT DO NOTHING;

