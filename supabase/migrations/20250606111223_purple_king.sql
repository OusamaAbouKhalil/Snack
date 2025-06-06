/*
  # Admin System Database Extensions

  1. New Tables
    - `customers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `phone` (text)
      - `loyalty_points` (integer)
      - `created_at` (timestamp)
    
    - `inventory`
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key)
      - `stock_quantity` (integer)
      - `min_stock_level` (integer)
      - `last_updated` (timestamp)
    
    - `settings`
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (text)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all new tables
    - Add policies for admin access
*/

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

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (adjust based on your auth requirements)
CREATE POLICY "Allow public read access to customers" ON customers
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on customers" ON customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on customers" ON customers
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to inventory" ON inventory
  FOR SELECT USING (true);

CREATE POLICY "Allow public update on inventory" ON inventory
  FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to settings" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Allow public update on settings" ON settings
  FOR UPDATE USING (true);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('tax_rate', '8.0'),
  ('currency', 'USD'),
  ('store_name', 'Crêpe Café'),
  ('store_address', '123 Main Street, City, State 12345'),
  ('store_phone', '(555) 123-4567'),
  ('loyalty_points_rate', '1.0'),
  ('low_stock_threshold', '10')
ON CONFLICT (key) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (name, email, phone, loyalty_points) VALUES
  ('John Smith', 'john@example.com', '(555) 123-4567', 1250),
  ('Sarah Johnson', 'sarah@example.com', '(555) 234-5678', 890),
  ('Mike Davis', 'mike@example.com', '(555) 345-6789', 450),
  ('Emily Brown', 'emily@example.com', '(555) 456-7890', 320),
  ('David Wilson', 'david@example.com', '(555) 567-8901', 180)
ON CONFLICT (email) DO NOTHING;

-- Insert inventory records for existing products
INSERT INTO inventory (product_id, stock_quantity, min_stock_level)
SELECT id, 
       FLOOR(RANDOM() * 50) + 10 as stock_quantity,
       10 as min_stock_level
FROM products
ON CONFLICT DO NOTHING;