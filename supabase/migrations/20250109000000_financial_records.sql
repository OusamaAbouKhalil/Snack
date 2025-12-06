/*
  # Financial Records Management System

  1. New Tables
    - `expense_categories`
      - `id` (uuid, primary key)
      - `name_en` (text) - English name
      - `name_ar` (text) - Arabic name
      - `display_order` (integer)
      - `created_at` (timestamptz)
    
    - `financial_records`
      - `id` (uuid, primary key)
      - `type` (text) - 'expense' or 'income'
      - `category_id` (uuid, foreign key to expense_categories)
      - `amount` (decimal 10,2)
      - `description` (text)
      - `record_date` (date)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (matching existing pattern)
*/

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

-- Enable RLS
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_categories
CREATE POLICY "Allow public read access to expense_categories" ON expense_categories
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on expense_categories" ON expense_categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on expense_categories" ON expense_categories
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on expense_categories" ON expense_categories
  FOR DELETE USING (true);

-- RLS Policies for financial_records
CREATE POLICY "Allow public read access to financial_records" ON financial_records
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on financial_records" ON financial_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on financial_records" ON financial_records
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on financial_records" ON financial_records
  FOR DELETE USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_records_record_date ON financial_records(record_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_category_id ON financial_records(category_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type_date ON financial_records(type, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_categories_display_order ON expense_categories(display_order);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_financial_records_updated_at
  BEFORE UPDATE ON financial_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories
INSERT INTO expense_categories (name_en, name_ar, display_order) VALUES
  ('Rent', 'إيجار', 1),
  ('Salary', 'راتب', 2),
  ('Operational Expenses', 'المصاريف التشغيلية', 3),
  ('Other', 'أخرى', 4)
ON CONFLICT DO NOTHING;

