/*
  # Delivery Zones + Loyalty Redemption

  1. delivery_zones: admin-defined circles (center + radius) each with its own
     delivery fee. Guests get the fee of the smallest active zone containing
     their GPS point; outside every zone the default settings.delivery_fee
     applies (quote flags it so the UI can say "out of zone").
  2. quote_delivery_fee(lat, lng): public fee preview for checkout.
  3. create_order: zone-based fee for online delivery orders + optional
     loyalty-point redemption (p_redeem_points) that discounts the total.
     Redemption is ledger-based: the existing apply_loyalty_transaction
     trigger keeps balances in sync and blocks overdrafts atomically.
  4. orders.discount / orders.redeemed_points for receipts and history.
  5. loyalty_transactions RLS: customers read their own history, admins
     read all and may insert manual adjustments.
*/

-- ── delivery zones ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  center_lat  double precision NOT NULL CHECK (center_lat BETWEEN -90 AND 90),
  center_lng  double precision NOT NULL CHECK (center_lng BETWEEN -180 AND 180),
  radius_m    numeric NOT NULL CHECK (radius_m > 0),
  fee         numeric(10,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active zones" ON public.delivery_zones;
CREATE POLICY "public read active zones" ON public.delivery_zones
  FOR SELECT USING (is_active OR is_admin());
DROP POLICY IF EXISTS "admin insert zones" ON public.delivery_zones;
CREATE POLICY "admin insert zones" ON public.delivery_zones
  FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin update zones" ON public.delivery_zones;
CREATE POLICY "admin update zones" ON public.delivery_zones
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "admin delete zones" ON public.delivery_zones;
CREATE POLICY "admin delete zones" ON public.delivery_zones
  FOR DELETE TO authenticated USING (is_admin());

-- Haversine distance in meters (good enough at city scale)
CREATE OR REPLACE FUNCTION public.haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Fee preview for checkout: smallest active zone containing the point wins;
-- outside every zone fall back to the flat settings.delivery_fee.
CREATE OR REPLACE FUNCTION public.quote_delivery_fee(
  p_lat double precision,
  p_lng double precision
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_zone record;
  v_default numeric;
BEGIN
  SELECT z.name, z.fee INTO v_zone
    FROM delivery_zones z
   WHERE z.is_active
     AND haversine_m(z.center_lat, z.center_lng, p_lat, p_lng) <= z.radius_m
   ORDER BY z.radius_m ASC
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('in_zone', true, 'fee', v_zone.fee, 'zone_name', v_zone.name);
  END IF;

  SELECT COALESCE(value::numeric, 0) INTO v_default
    FROM settings WHERE key = 'delivery_fee';

  RETURN jsonb_build_object('in_zone', false, 'fee', COALESCE(v_default, 0), 'zone_name', NULL);
END $$;

GRANT EXECUTE ON FUNCTION public.quote_delivery_fee TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haversine_m TO anon, authenticated;

-- ── order columns for redemption ────────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS redeemed_points integer NOT NULL DEFAULT 0;

-- ── settings seed: redemption rate (points per 1 USD of discount) ───────────
INSERT INTO public.settings (key, value)
SELECT 'loyalty_redeem_rate', '100'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'loyalty_redeem_rate');

-- ── loyalty_transactions RLS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "own or admin read loyalty" ON public.loyalty_transactions;
CREATE POLICY "own or admin read loyalty" ON public.loyalty_transactions
  FOR SELECT TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = loyalty_transactions.customer_id AND c.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "admin adjust loyalty" ON public.loyalty_transactions;
CREATE POLICY "admin adjust loyalty" ON public.loyalty_transactions
  FOR INSERT TO authenticated WITH CHECK (is_admin() AND type = 'adjust');

-- ── create_order v2: zone fees + redemption ─────────────────────────────────
-- Drop the old signature first so PostgREST doesn't see an ambiguous overload.
DROP FUNCTION IF EXISTS public.create_order(
  jsonb, text, text, uuid, text, numeric, text,
  double precision, double precision, text, text, text
);

CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,                        -- [{product_id, quantity}]
  p_customer_name text,
  p_payment_method text DEFAULT 'cash',
  p_customer_id uuid DEFAULT NULL,
  p_order_type text DEFAULT 'pickup',
  p_delivery_fee numeric DEFAULT NULL,  -- honored only for admins (POS)
  p_delivery_address text DEFAULT NULL,
  p_delivery_lat double precision DEFAULT NULL,
  p_delivery_lng double precision DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source text DEFAULT 'online',
  p_redeem_points integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_admin boolean := is_admin();
  v_source text;
  v_order_type text;
  v_fee numeric := 0;
  v_zone_name text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_redeem integer := 0;
  v_redeem_rate numeric;
  v_balance integer;
  v_order_id uuid;
  v_order_number text;
  v_count int := 0;
  v_attempt int := 0;
BEGIN
  -- validate items
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order must contain at least one item';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'too many items';
  END IF;

  v_source := CASE WHEN v_admin AND p_source = 'pos' THEN 'pos' ELSE 'online' END;
  v_order_type := CASE WHEN p_order_type IN ('pickup','delivery') THEN p_order_type ELSE 'pickup' END;

  -- customer link must belong to the caller (admins may attach anyone)
  IF p_customer_id IS NOT NULL AND NOT v_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM customers
      WHERE id = p_customer_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'customer does not belong to caller';
    END IF;
  END IF;

  -- delivery fee: server-authoritative for online orders.
  -- Zone circles win over the flat default when the customer shared GPS.
  IF v_order_type = 'delivery' THEN
    IF v_admin AND p_delivery_fee IS NOT NULL THEN
      v_fee := GREATEST(p_delivery_fee, 0);
    ELSE
      IF p_delivery_lat IS NOT NULL AND p_delivery_lng IS NOT NULL THEN
        SELECT z.fee, z.name INTO v_fee, v_zone_name
          FROM delivery_zones z
         WHERE z.is_active
           AND haversine_m(z.center_lat, z.center_lng, p_delivery_lat, p_delivery_lng) <= z.radius_m
         ORDER BY z.radius_m ASC
         LIMIT 1;
      END IF;
      IF v_zone_name IS NULL THEN
        SELECT COALESCE(value::numeric, 0) INTO v_fee
          FROM settings WHERE key = 'delivery_fee';
      END IF;
      v_fee := COALESCE(v_fee, 0);
    END IF;
  END IF;

  -- subtotal from trusted prices; validates products exist & are available
  SELECT COALESCE(SUM(p.price * q.quantity), 0), COUNT(*)
    INTO v_subtotal, v_count
    FROM (
      SELECT (i->>'product_id')::uuid AS product_id,
             GREATEST(LEAST(COALESCE((i->>'quantity')::int, 1), 100), 1) AS quantity
        FROM jsonb_array_elements(p_items) i
    ) q
    JOIN products p ON p.id = q.product_id AND p.is_available;

  IF v_count <> jsonb_array_length(p_items) THEN
    RAISE EXCEPTION 'one or more products are unavailable';
  END IF;

  -- loyalty redemption: signed-in customers only, capped by balance and by
  -- the subtotal (an order can be discounted to $0, never below).
  IF p_redeem_points > 0 AND p_customer_id IS NOT NULL THEN
    SELECT COALESCE(value::numeric, 100) INTO v_redeem_rate
      FROM settings WHERE key = 'loyalty_redeem_rate';
    v_redeem_rate := COALESCE(NULLIF(v_redeem_rate, 0), 100);

    SELECT loyalty_points INTO v_balance
      FROM customers WHERE id = p_customer_id FOR UPDATE;
    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'customer not found';
    END IF;

    v_redeem := LEAST(p_redeem_points, v_balance, floor(v_subtotal * v_redeem_rate)::integer);
    v_discount := round(v_redeem / v_redeem_rate, 2);
    IF v_redeem <= 0 THEN
      v_redeem := 0;
      v_discount := 0;
    END IF;
  END IF;

  -- unique server-side order number (retry on rare collision)
  LOOP
    v_attempt := v_attempt + 1;
    v_order_number := 'ORD-' || (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text;
    BEGIN
      INSERT INTO orders (
        order_number, customer_name, total_amount, payment_method, status,
        customer_id, order_type, delivery_fee, delivery_address,
        delivery_lat, delivery_lng, customer_phone, notes, source,
        discount, redeemed_points
      ) VALUES (
        v_order_number, COALESCE(NULLIF(trim(p_customer_name), ''), 'Walk-in'),
        v_subtotal + v_fee - v_discount,
        CASE WHEN p_payment_method IN ('cash','card') THEN p_payment_method ELSE 'cash' END,
        'pending',
        p_customer_id, v_order_type, v_fee, p_delivery_address,
        p_delivery_lat, p_delivery_lng, p_customer_phone, p_notes, v_source,
        v_discount, v_redeem
      ) RETURNING id INTO v_order_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 3 THEN RAISE; END IF;
      PERFORM pg_sleep(0.002);
    END;
  END LOOP;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT v_order_id, p.id, q.quantity, p.price, p.price * q.quantity
    FROM (
      SELECT (i->>'product_id')::uuid AS product_id,
             GREATEST(LEAST(COALESCE((i->>'quantity')::int, 1), 100), 1) AS quantity
        FROM jsonb_array_elements(p_items) i
    ) q
    JOIN products p ON p.id = q.product_id;

  -- ledger entry moves the cached balance and blocks overdrafts atomically
  IF v_redeem > 0 THEN
    INSERT INTO loyalty_transactions(customer_id, order_id, points, type, note)
    VALUES (p_customer_id, v_order_id, -v_redeem, 'redeem', 'redeemed at checkout');
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_subtotal + v_fee - v_discount,
    'delivery_fee', v_fee,
    'delivery_zone', v_zone_name,
    'discount', v_discount,
    'redeemed_points', v_redeem,
    'order_type', v_order_type,
    'status', 'pending'
  );
END $$;

GRANT EXECUTE ON FUNCTION public.create_order TO anon, authenticated;

-- ── track_order: expose discount for the confirmation view ─────────────────
CREATE OR REPLACE FUNCTION public.track_order(p_order_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'total_amount', o.total_amount,
    'delivery_fee', o.delivery_fee,
    'discount', o.discount,
    'redeemed_points', o.redeemed_points,
    'order_type', o.order_type,
    'created_at', o.created_at,
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', p.name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price
      ) ORDER BY oi.created_at)
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = o.id
    ), '[]'::jsonb)
  )
  FROM orders o WHERE o.id = p_order_id;
$$;

-- ── edit_order: keep the redeemed discount when admins edit pending orders ──
CREATE OR REPLACE FUNCTION public.edit_order(
  p_order_id uuid,
  p_items jsonb,                        -- [{product_id, quantity}]
  p_customer_name text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_order_type text DEFAULT NULL,
  p_delivery_fee numeric DEFAULT NULL,
  p_delivery_address text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_status text;
  v_total numeric;
  v_count int;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order must contain at least one item';
  END IF;

  SELECT status INTO v_status FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'only pending orders can be edited'; END IF;

  DELETE FROM order_items WHERE order_id = p_order_id;

  INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
  SELECT p_order_id, p.id, q.quantity, p.price, p.price * q.quantity
    FROM (
      SELECT (i->>'product_id')::uuid AS product_id,
             GREATEST(LEAST(COALESCE((i->>'quantity')::int, 1), 100), 1) AS quantity
        FROM jsonb_array_elements(p_items) i
    ) q
    JOIN products p ON p.id = q.product_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> jsonb_array_length(p_items) THEN
    RAISE EXCEPTION 'one or more products not found';
  END IF;

  SELECT COALESCE(SUM(total_price), 0) INTO v_total
    FROM order_items WHERE order_id = p_order_id;

  UPDATE orders SET
    total_amount     = GREATEST(v_total + COALESCE(p_delivery_fee, delivery_fee, 0) - COALESCE(discount, 0), 0),
    customer_name    = COALESCE(NULLIF(trim(p_customer_name), ''), customer_name),
    payment_method   = COALESCE(p_payment_method, payment_method),
    notes            = COALESCE(p_notes, notes),
    order_type       = COALESCE(p_order_type, order_type),
    delivery_fee     = COALESCE(p_delivery_fee, delivery_fee),
    delivery_address = COALESCE(p_delivery_address, delivery_address)
  WHERE id = p_order_id
  RETURNING total_amount INTO v_total;

  RETURN jsonb_build_object('id', p_order_id, 'total_amount', v_total);
END $$;
