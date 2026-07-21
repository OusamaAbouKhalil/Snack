/*
  # Online Ordering & Loyalty Schema

  1. orders: link to customers, delivery/pickup fields, order source
  2. customers: link to auth.users, address + location fields, email optional
  3. loyalty_transactions: append-only points ledger
     - trigger keeps customers.loyalty_points in sync, blocks negative balances
     - reconciliation trigger on orders auto-earns points on completion
       (target = floor((total - delivery_fee) * loyalty_points_rate); 0 when
       not completed — handles cancel-after-complete and edits automatically)
  4. orders added to realtime publication (admin live order feed)
*/

-- 1. orders ------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'pickup'
    CHECK (order_type IN ('pickup','delivery')),
  ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_lat double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng double precision,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'pos'
    CHECK (source IN ('pos','online'));

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- 2. customers ---------------------------------------------------------------
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS location_lat double precision,
  ADD COLUMN IF NOT EXISTS location_lng double precision;

ALTER TABLE public.customers ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_city ON public.customers(city);

-- 3. loyalty ledger ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  points      integer NOT NULL CHECK (points <> 0),
  type        text NOT NULL CHECK (type IN ('earn','redeem','adjust')),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS loyalty_earn_once_per_order
  ON public.loyalty_transactions(order_id) WHERE type = 'earn';
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_order ON public.loyalty_transactions(order_id);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Balance maintenance: every ledger insert moves the cached balance;
-- negative balances are rejected (redeem more than owned fails atomically).
CREATE OR REPLACE FUNCTION public.apply_loyalty_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE new_balance integer;
BEGIN
  UPDATE customers SET loyalty_points = loyalty_points + NEW.points
   WHERE id = NEW.customer_id
   RETURNING loyalty_points INTO new_balance;
  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'customer % not found', NEW.customer_id;
  END IF;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'loyalty balance cannot go negative (attempted %)', new_balance;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_loyalty ON public.loyalty_transactions;
CREATE TRIGGER trg_apply_loyalty
AFTER INSERT ON public.loyalty_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_loyalty_transaction();

-- Reconciliation: for an order with a customer, ledger earn+adjust always
-- equals floor((total - delivery_fee) * rate) when completed, 0 otherwise.
CREATE OR REPLACE FUNCTION public.sync_order_loyalty()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  rate numeric; target integer; ledger integer; delta integer;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(value::numeric, 1) INTO rate
    FROM settings WHERE key = 'loyalty_points_rate';
  rate := COALESCE(rate, 1);

  target := CASE WHEN NEW.status = 'completed'
    THEN floor(GREATEST(COALESCE(NEW.total_amount,0) - COALESCE(NEW.delivery_fee,0), 0) * rate)::integer
    ELSE 0 END;

  SELECT COALESCE(SUM(points),0) INTO ledger
    FROM loyalty_transactions
   WHERE order_id = NEW.id AND type IN ('earn','adjust');

  delta := target - ledger;
  IF delta = 0 THEN RETURN NEW; END IF;

  IF NOT EXISTS (SELECT 1 FROM loyalty_transactions
                  WHERE order_id = NEW.id AND type = 'earn') THEN
    INSERT INTO loyalty_transactions(customer_id, order_id, points, type, note)
    VALUES (NEW.customer_id, NEW.id, delta, 'earn', 'auto: order completed');
  ELSE
    INSERT INTO loyalty_transactions(customer_id, order_id, points, type, note)
    VALUES (NEW.customer_id, NEW.id, delta, 'adjust', 'auto: order status/total change');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_order_loyalty ON public.orders;
CREATE TRIGGER trg_sync_order_loyalty
AFTER INSERT OR UPDATE OF status, total_amount, customer_id ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_order_loyalty();

-- 4. realtime ------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
