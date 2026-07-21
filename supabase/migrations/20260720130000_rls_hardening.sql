/*
  # RLS Hardening

  Before this migration every table was world-readable/writable with the anon
  key (public policies USING true). Now:

  - products / categories / settings: public read, admin write
  - customers: own row (authenticated) + admin; guest checkout creates NO row
  - loyalty_transactions: own read + admin insert; immutable ledger
  - orders / order_items: admin all, customers read their own;
    creation goes exclusively through the create_order RPC (SECURITY DEFINER),
    guest tracking through track_order
  - financial / inventory / admin_users tables: admin only
  - storage product-images: public read, admin write

  is_admin() (SECURITY DEFINER) distinguishes staff from signed-up customers —
  plain `authenticated` is NOT enough once customers have accounts.
*/

-- Drop every existing policy on the tables we are re-securing
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE (schemaname = 'public' AND tablename IN (
      'products','categories','settings','customers','loyalty_transactions',
      'orders','order_items','financial_records','expense_categories',
      'inventory','ingredients','ingredient_categories','inventory_transactions',
      'admin_users'
    ))
    OR (schemaname = 'storage' AND tablename = 'objects'
        AND policyname LIKE '%product-images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ── public catalog ─────────────────────────────────────────────────────────
CREATE POLICY "public read products" ON public.products
  FOR SELECT USING (true);
CREATE POLICY "admin write products" ON public.products
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "public read categories" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "admin write categories" ON public.categories
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "public read settings" ON public.settings
  FOR SELECT USING (true);
CREATE POLICY "admin write settings" ON public.settings
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ── customers ──────────────────────────────────────────────────────────────
CREATE POLICY "own or admin read customers" ON public.customers
  FOR SELECT TO authenticated USING (is_admin() OR user_id = auth.uid());
CREATE POLICY "own or admin insert customers" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (is_admin() OR user_id = auth.uid());
CREATE POLICY "own or admin update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (is_admin() OR user_id = auth.uid())
  WITH CHECK (is_admin() OR user_id = auth.uid());
CREATE POLICY "admin delete customers" ON public.customers
  FOR DELETE TO authenticated USING (is_admin());

-- ── loyalty ledger (immutable) ─────────────────────────────────────────────
CREATE POLICY "own or admin read loyalty" ON public.loyalty_transactions
  FOR SELECT TO authenticated
  USING (
    is_admin() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );
CREATE POLICY "admin insert loyalty" ON public.loyalty_transactions
  FOR INSERT TO authenticated WITH CHECK (is_admin());
-- no UPDATE / DELETE policies: ledger rows are immutable

-- ── orders ─────────────────────────────────────────────────────────────────
CREATE POLICY "own or admin read orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    is_admin() OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );
CREATE POLICY "admin update orders" ON public.orders
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin delete orders" ON public.orders
  FOR DELETE TO authenticated USING (is_admin());
-- no INSERT policy: create_order RPC (SECURITY DEFINER) is the only path

CREATE POLICY "own or admin read order_items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.id = order_items.order_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "admin write order_items" ON public.order_items
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ── staff-only tables ──────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'financial_records','expense_categories',
    'inventory','ingredients','ingredient_categories','inventory_transactions'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY "admin only" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', t);
  END LOOP;
END $$;

-- ── admin_users ────────────────────────────────────────────────────────────
CREATE POLICY "self or admin read admin_users" ON public.admin_users
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "admin insert admin_users" ON public.admin_users
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin update admin_users" ON public.admin_users
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin delete admin_users" ON public.admin_users
  FOR DELETE TO authenticated USING (is_admin());

-- ── storage: product images public-read, admin-write ───────────────────────
CREATE POLICY "Public read product-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin insert product-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND is_admin());
CREATE POLICY "Admin update product-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND is_admin());
CREATE POLICY "Admin delete product-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND is_admin());

-- Make sure RLS is on everywhere (idempotent)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','categories','settings','customers','loyalty_transactions',
    'orders','order_items','financial_records','expense_categories',
    'inventory','ingredients','ingredient_categories','inventory_transactions',
    'admin_users'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
