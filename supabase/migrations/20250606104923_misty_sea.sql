/*
  # Crepe Store POS Database Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `display_order` (integer)
      - `created_at` (timestamp)
    
    - `products`
      - `id` (uuid, primary key) 
      - `name` (text)
      - `description` (text)
      - `price` (decimal)
      - `category_id` (uuid, foreign key)
      - `image_url` (text)
      - `is_available` (boolean)
      - `created_at` (timestamp)
    
    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique)
      - `customer_name` (text)
      - `total_amount` (decimal)
      - `payment_method` (text)
      - `status` (text)
      - `created_at` (timestamp)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_price` (decimal)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access to categories and products
    - Add policies for order management
*/

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

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to categories" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access to products" ON products
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on orders" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to orders" ON orders
  FOR SELECT USING (true);

CREATE POLICY "Allow public update on orders" ON orders
  FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on order_items" ON order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access to order_items" ON order_items
  FOR SELECT USING (true);

-- Insert sample data
INSERT INTO categories (name, display_order) VALUES
  ('Sweet Crepes', 1),
  ('Savory Crepes', 2),
  ('Beverages', 3),
  ('Add-ons', 4);

INSERT INTO products (name, description, price, category_id, image_url, is_available) VALUES
  ('Classic Nutella', 'Traditional crepe with Nutella spread', 8.50, (SELECT id FROM categories WHERE name = 'Sweet Crepes'), 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg', true),
  ('Strawberry Banana', 'Fresh strawberries and banana slices with whipped cream', 9.75, (SELECT id FROM categories WHERE name = 'Sweet Crepes'), 'https://images.pexels.com/photos/1639565/pexels-photo-1639565.jpeg', true),
  ('Lemon Sugar', 'Simple and delicious with fresh lemon and sugar', 7.25, (SELECT id FROM categories WHERE name = 'Sweet Crepes'), 'https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg', true),
  ('Ham & Cheese', 'Savory crepe with ham and melted cheese', 10.50, (SELECT id FROM categories WHERE name = 'Savory Crepes'), 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg', true),
  ('Mushroom Spinach', 'Sautéed mushrooms with fresh spinach and cheese', 11.25, (SELECT id FROM categories WHERE name = 'Savory Crepes'), 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg', true),
  ('Coffee', 'Premium roasted coffee', 3.50, (SELECT id FROM categories WHERE name = 'Beverages'), 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg', true),
  ('Orange Juice', 'Fresh squeezed orange juice', 4.25, (SELECT id FROM categories WHERE name = 'Beverages'), 'https://images.pexels.com/photos/161559/background-berries-berry-blackberry-161559.jpeg', true),
  ('Extra Nutella', 'Additional Nutella spread', 1.50, (SELECT id FROM categories WHERE name = 'Add-ons'), '', true),
  ('Whipped Cream', 'Fresh whipped cream', 1.25, (SELECT id FROM categories WHERE name = 'Add-ons'), '', true);