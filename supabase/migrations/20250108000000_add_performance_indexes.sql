/*
  # Add Performance Indexes
  
  This migration adds indexes to improve query performance and prevent 500 errors.
  Indexes are critical for:
  - ORDER BY clauses (prevent slow sorting)
  - WHERE clauses (faster filtering)
  - JOIN operations (faster lookups)
  
  All indexes use IF NOT EXISTS to be safe on re-runs.
*/

-- ============================================
-- PRODUCTS TABLE INDEXES
-- ============================================

-- Index on name for ORDER BY (CRITICAL - fixes 500 errors on product queries)
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Index on category_id for filtering products by category
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Index on is_available for filtering available products
CREATE INDEX IF NOT EXISTS idx_products_is_available ON products(is_available);

-- Composite index for common query: category + availability + name sorting
CREATE INDEX IF NOT EXISTS idx_products_category_available_name 
  ON products(category_id, is_available, name) 
  WHERE is_available = true;

-- ============================================
-- CATEGORIES TABLE INDEXES
-- ============================================

-- Index on display_order for ORDER BY (already used for sorting)
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);

-- ============================================
-- ORDERS TABLE INDEXES
-- ============================================

-- Index on created_at for ORDER BY (most common order query)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Index on status for filtering by status
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index on customer_name for customer lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);

-- Composite index for common query: status + created_at (for recent orders by status)
CREATE INDEX IF NOT EXISTS idx_orders_status_created_at 
  ON orders(status, created_at DESC);

-- Index on status + created_at for completed orders with date range
CREATE INDEX IF NOT EXISTS idx_orders_completed_created_at 
  ON orders(created_at) 
  WHERE status = 'completed';

-- ============================================
-- ORDER_ITEMS TABLE INDEXES
-- ============================================

-- Index on order_id for joining with orders (CRITICAL - prevents N+1 queries)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Index on product_id for product lookups
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Index on created_at for date range queries
CREATE INDEX IF NOT EXISTS idx_order_items_created_at ON order_items(created_at);

-- Composite index for common query: order_id + created_at (for order details)
CREATE INDEX IF NOT EXISTS idx_order_items_order_created 
  ON order_items(order_id, created_at);

-- ============================================
-- CUSTOMERS TABLE INDEXES
-- ============================================

-- Index on created_at for ORDER BY
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);

-- Index on name for searching customers
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- ============================================
-- INVENTORY TABLE INDEXES
-- ============================================

-- Index on ingredient_id for lookups
CREATE INDEX IF NOT EXISTS idx_inventory_ingredient_id ON inventory(ingredient_id);

-- Index on stock_quantity for low stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_stock_quantity ON inventory(stock_quantity);

-- Composite index for low stock filtering
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
  ON inventory(stock_quantity, min_stock_level) 
  WHERE stock_quantity > 0;

-- ============================================
-- INGREDIENT_CATEGORIES TABLE INDEXES
-- ============================================

-- Index on name for ordering
CREATE INDEX IF NOT EXISTS idx_ingredient_categories_name ON ingredient_categories(name);

-- ============================================
-- INVENTORY_TRANSACTIONS TABLE INDEXES
-- ============================================

-- Index on ingredient_id for filtering
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_id 
  ON inventory_transactions(ingredient_id);

-- Index on created_at for date range queries and ORDER BY
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at 
  ON inventory_transactions(created_at DESC);

-- Composite index for common query: ingredient + date range
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_ingredient_created 
  ON inventory_transactions(ingredient_id, created_at DESC);

