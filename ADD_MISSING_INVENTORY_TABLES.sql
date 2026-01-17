-- ============================================
-- ADD MISSING INVENTORY TABLES
-- Run this script in Supabase SQL Editor to add missing tables
-- ============================================

-- ============================================
-- CREATE MISSING TABLES
-- ============================================

-- Ingredient categories table
CREATE TABLE IF NOT EXISTS ingredient_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  unit text NOT NULL,
  category_id uuid REFERENCES ingredient_categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Drop old inventory table if it exists with product_id
-- WARNING: This will delete all existing inventory data!
-- If you need to preserve data, export it first before running this script
DROP TABLE IF EXISTS inventory CASCADE;

-- Inventory table (ingredient-based)
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  stock_quantity integer DEFAULT 0,
  min_stock_level integer DEFAULT 10,
  unit text NOT NULL,
  last_updated timestamptz DEFAULT now(),
  submitted_at timestamptz DEFAULT now()
);

-- Inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity_change integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('ADD', 'REMOVE', 'ADJUST')),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (if any)
-- ============================================

DROP POLICY IF EXISTS "Public can read ingredient categories" ON ingredient_categories;
DROP POLICY IF EXISTS "Admins can manage ingredient categories" ON ingredient_categories;
DROP POLICY IF EXISTS "Public can read ingredients" ON ingredients;
DROP POLICY IF EXISTS "Admins can manage ingredients" ON ingredients;
DROP POLICY IF EXISTS "Public can read inventory" ON inventory;
DROP POLICY IF EXISTS "Admins can manage inventory" ON inventory;
DROP POLICY IF EXISTS "Public can read inventory transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Admins can manage inventory transactions" ON inventory_transactions;

-- ============================================
-- CREATE HELPER FUNCTION (if not exists)
-- ============================================

CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Ingredient categories: Public read, admin write
CREATE POLICY "Public can read ingredient categories" ON ingredient_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage ingredient categories" ON ingredient_categories
  FOR ALL USING (is_admin(auth.uid()));

-- Ingredients: Public read, admin write
CREATE POLICY "Public can read ingredients" ON ingredients
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage ingredients" ON ingredients
  FOR ALL USING (is_admin(auth.uid()));

-- Inventory: Public read, admin write
CREATE POLICY "Public can read inventory" ON inventory
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage inventory" ON inventory
  FOR ALL USING (is_admin(auth.uid()));

-- Inventory transactions: Public read, admin write
CREATE POLICY "Public can read inventory transactions" ON inventory_transactions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage inventory transactions" ON inventory_transactions
  FOR ALL USING (is_admin(auth.uid()));

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Ingredient categories indexes
CREATE INDEX IF NOT EXISTS idx_ingredient_categories_name ON ingredient_categories(name);

-- Ingredients indexes
CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category_id ON ingredients(category_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_ingredient_id ON inventory(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_quantity ON inventory(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
  ON inventory(stock_quantity, min_stock_level) 
  WHERE stock_quantity > 0;

-- Inventory transactions indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_id 
  ON inventory_transactions(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at 
  ON inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_created 
  ON inventory_transactions(ingredient_id, created_at DESC);

-- ============================================
-- VERIFY SETUP
-- ============================================

SELECT 
  'Missing inventory tables created successfully!' as status,
  (SELECT COUNT(*) FROM ingredient_categories) as ingredient_categories_count,
  (SELECT COUNT(*) FROM ingredients) as ingredients_count,
  (SELECT COUNT(*) FROM inventory) as inventory_count,
  (SELECT COUNT(*) FROM inventory_transactions) as transactions_count;

