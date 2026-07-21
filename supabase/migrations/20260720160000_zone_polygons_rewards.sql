/*
  # Polygon Delivery Zones + Rewards Catalog

  1. delivery_zones: add `polygon` (jsonb array of {lat,lng}) and `area_m2`.
     Zones may now be a drawn polygon OR the legacy circle (center + radius).
     point_in_polygon() does ray-casting for polygon zones; haversine_m()
     (existing) still serves circle zones. match_delivery_zone() picks the
     smallest matching zone (by area) the same way the old circle-only logic
     picked the smallest radius.
  2. rewards: admin-defined catalog — free_delivery, discount_percent,
     discount_amount, punch_card (e.g. "every 8 orders/crepes -> 1 free").
     reward_redemptions is the ledger a punch card counts progress against
     (count since the last redemption).
  3. get_reward_progress(customer, reward): progress/threshold/eligible for
     punch cards, used by both admin preview and checkout.
  4. create_order gains p_reward_id — validates + applies the reward
     (free delivery / percent / flat discount) and logs the redemption.
*/

-- ── polygon support on delivery_zones ────────────────────────────────────────
ALTER TABLE public.delivery_zones ALTER COLUMN radius_m DROP NOT NULL;
ALTER TABLE public.delivery_zones DROP CONSTRAINT IF EXISTS delivery_zones_radius_m_check;
ALTER TABLE public.delivery_zones ADD CONSTRAINT delivery_zones_radius_m_check
  CHECK (radius_m IS NULL OR radius_m > 0);

ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS polygon jsonb;
ALTER TABLE public.delivery_zones ADD COLUMN IF NOT EXISTS area_m2 numeric;

ALTER TABLE public.delivery_zones DROP CONSTRAINT IF EXISTS delivery_zones_polygon_check;
ALTER TABLE public.delivery_zones ADD CONSTRAINT delivery_zones_polygon_check
  CHECK (polygon IS NULL OR jsonb_typeof(polygon) = 'array');

ALTER TABLE public.delivery_zones DROP CONSTRAINT IF EXISTS delivery_zones_shape_check;
ALTER TABLE public.delivery_zones ADD CONSTRAINT delivery_zones_shape_check
  CHECK (polygon IS NOT NULL OR radius_m IS NOT NULL);

-- Ray-casting point-in-polygon. polygon = [{"lat":..,"lng":..}, ...], closed ring implied.
CREATE OR REPLACE FUNCTION public.point_in_polygon(
  p_lat double precision,
  p_lng double precision,
  p_polygon jsonb
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  n int := jsonb_array_length(p_polygon);
  i int; j int;
  xi double precision; yi double precision;
  xj double precision; yj double precision;
  inside boolean := false;
BEGIN
  IF n < 3 THEN RETURN false; END IF;
  j := n - 1;
  FOR i IN 0..n - 1 LOOP
    yi := (p_polygon -> i ->> 'lat')::double precision;
    xi := (p_polygon -> i ->> 'lng')::double precision;
    yj := (p_polygon -> j ->> 'lat')::double precision;
    xj := (p_polygon -> j ->> 'lng')::double precision;
    IF ((yi > p_lat) <> (yj > p_lat))
       AND (p_lng < (xj - xi) * (p_lat - yi) / NULLIF(yj - yi, 0) + xi) THEN
      inside := NOT inside;
    END IF;
    j := i;
  END LOOP;
  RETURN inside;
END $$;

GRANT EXECUTE ON FUNCTION public.point_in_polygon TO anon, authenticated;

-- Smallest matching zone wins (area_m2 for polygons, pi*r^2 for circles).
CREATE OR REPLACE FUNCTION public.match_delivery_zone(
  p_lat double precision,
  p_lng double precision
) RETURNS TABLE(zone_id uuid, zone_name text, fee numeric) LANGUAGE sql STABLE AS $$
  SELECT z.id, z.name, z.fee
    FROM delivery_zones z
   WHERE z.is_active
     AND (
       (z.polygon IS NOT NULL AND public.point_in_polygon(p_lat, p_lng, z.polygon))
       OR (z.polygon IS NULL AND z.radius_m IS NOT NULL
           AND public.haversine_m(z.center_lat, z.center_lng, p_lat, p_lng) <= z.radius_m)
     )
   ORDER BY COALESCE(z.area_m2, pi() * power(z.radius_m, 2)) ASC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.match_delivery_zone TO anon, authenticated;

-- quote_delivery_fee now delegates matching to match_delivery_zone.
CREATE OR REPLACE FUNCTION public.quote_delivery_fee(
  p_lat double precision,
  p_lng double precision
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_zone record;
  v_default numeric;
BEGIN
  SELECT * INTO v_zone FROM public.match_delivery_zone(p_lat, p_lng);

  IF FOUND THEN
    RETURN jsonb_build_object('in_zone', true, 'fee', v_zone.fee, 'zone_name', v_zone.zone_name);
  END IF;

  SELECT COALESCE(value::numeric, 0) INTO v_default
    FROM settings WHERE key = 'delivery_fee';

  RETURN jsonb_build_object('in_zone', false, 'fee', COALESCE(v_default, 0), 'zone_name', NULL);
END $$;

-- ── rewards catalog ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rewards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  type        text NOT NULL CHECK (type IN ('free_delivery', 'discount_percent', 'discount_amount', 'punch_card')),
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active rewards" ON public.rewards;
CREATE POLICY "public read active rewards" ON public.rewards
  FOR SELECT USING (is_active OR is_admin());
DROP POLICY IF EXISTS "admin write rewards" ON public.rewards;
CREATE POLICY "admin write rewards" ON public.rewards
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id   uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_lookup
  ON public.reward_redemptions(customer_id, reward_id, created_at DESC);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own or admin read redemptions" ON public.reward_redemptions;
CREATE POLICY "own or admin read redemptions" ON public.reward_redemptions
  FOR SELECT TO authenticated USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = reward_redemptions.customer_id AND c.user_id = auth.uid()
    )
  );
-- No direct INSERT policy: rows are written only via the SECURITY DEFINER
-- create_order function, which validates eligibility server-side.

-- Punch-card progress: completed orders (or item quantity) since the
-- customer's last redemption of this reward.
CREATE OR REPLACE FUNCTION public.get_reward_progress(
  p_customer_id uuid,
  p_reward_id uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_reward record;
  v_last_redeemed timestamptz;
  v_threshold int;
  v_count_by text;
  v_product_id uuid;
  v_progress int;
BEGIN
  SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active;
  IF NOT FOUND OR v_reward.type <> 'punch_card' THEN
    RETURN jsonb_build_object('progress', 0, 'threshold', 0, 'eligible', false);
  END IF;

  v_threshold := GREATEST(COALESCE((v_reward.config ->> 'threshold')::int, 0), 0);
  v_count_by := COALESCE(v_reward.config ->> 'count_by', 'orders');
  v_product_id := NULLIF(v_reward.config ->> 'product_id', '')::uuid;

  SELECT MAX(created_at) INTO v_last_redeemed
    FROM reward_redemptions WHERE customer_id = p_customer_id AND reward_id = p_reward_id;

  IF v_count_by = 'items' THEN
    SELECT COALESCE(SUM(oi.quantity), 0) INTO v_progress
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
     WHERE o.customer_id = p_customer_id
       AND o.status = 'completed'
       AND (v_product_id IS NULL OR oi.product_id = v_product_id)
       AND (v_last_redeemed IS NULL OR o.created_at > v_last_redeemed);
  ELSE
    SELECT COUNT(*) INTO v_progress
      FROM orders o
     WHERE o.customer_id = p_customer_id
       AND o.status = 'completed'
       AND (v_last_redeemed IS NULL OR o.created_at > v_last_redeemed);
  END IF;

  RETURN jsonb_build_object(
    'progress', v_progress,
    'threshold', v_threshold,
    'eligible', v_threshold > 0 AND v_progress >= v_threshold
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_reward_progress TO anon, authenticated;

-- ── create_order v3: + reward redemption ────────────────────────────────────
-- Adding a trailing parameter changes the function's identity (argument type
-- list), so CREATE OR REPLACE alone would leave two overloads behind instead
-- of replacing this one — drop the old 13-arg signature first.
DROP FUNCTION IF EXISTS public.create_order(
  jsonb, text, text, uuid, text, numeric, text,
  double precision, double precision, text, text, text, integer
);

CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,
  p_customer_name text,
  p_payment_method text DEFAULT 'cash',
  p_customer_id uuid DEFAULT NULL,
  p_order_type text DEFAULT 'pickup',
  p_delivery_fee numeric DEFAULT NULL,
  p_delivery_address text DEFAULT NULL,
  p_delivery_lat double precision DEFAULT NULL,
  p_delivery_lng double precision DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source text DEFAULT 'online',
  p_redeem_points integer DEFAULT 0,
  p_reward_id uuid DEFAULT NULL
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
  v_reward record;
  v_reward_kind text;
  v_reward_progress jsonb;
  v_reward_discount numeric := 0;
  v_free_delivery boolean := false;
  v_reward_applied boolean := false;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'order must contain at least one item';
  END IF;
  IF jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'too many items';
  END IF;

  v_source := CASE WHEN v_admin AND p_source = 'pos' THEN 'pos' ELSE 'online' END;
  v_order_type := CASE WHEN p_order_type IN ('pickup', 'delivery') THEN p_order_type ELSE 'pickup' END;

  IF p_customer_id IS NOT NULL AND NOT v_admin THEN
    IF NOT EXISTS (
      SELECT 1 FROM customers
      WHERE id = p_customer_id AND user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'customer does not belong to caller';
    END IF;
  END IF;

  IF v_order_type = 'delivery' THEN
    IF v_admin AND p_delivery_fee IS NOT NULL THEN
      v_fee := GREATEST(p_delivery_fee, 0);
    ELSE
      IF p_delivery_lat IS NOT NULL AND p_delivery_lng IS NOT NULL THEN
        SELECT m.fee, m.zone_name INTO v_fee, v_zone_name
          FROM public.match_delivery_zone(p_delivery_lat, p_delivery_lng) m;
      END IF;
      IF v_zone_name IS NULL THEN
        SELECT COALESCE(value::numeric, 0) INTO v_fee
          FROM settings WHERE key = 'delivery_fee';
      END IF;
      v_fee := COALESCE(v_fee, 0);
    END IF;
  END IF;

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

  -- reward redemption: free delivery / percent / flat discount, punch cards
  -- require the progress threshold to already be met.
  IF p_reward_id IS NOT NULL AND p_customer_id IS NOT NULL THEN
    SELECT * INTO v_reward FROM rewards WHERE id = p_reward_id AND is_active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'reward not available';
    END IF;

    IF v_reward.type = 'punch_card' THEN
      v_reward_progress := public.get_reward_progress(p_customer_id, p_reward_id);
      IF NOT (v_reward_progress ->> 'eligible')::boolean THEN
        RAISE EXCEPTION 'reward not yet earned';
      END IF;
      v_reward_kind := COALESCE(v_reward.config ->> 'reward_type', 'discount_amount');
    ELSE
      v_reward_kind := v_reward.type;
    END IF;

    IF v_reward_kind = 'free_delivery' THEN
      v_free_delivery := true;
    ELSIF v_reward_kind = 'discount_percent' THEN
      v_reward_discount := round(v_subtotal * COALESCE((v_reward.config ->> 'percent')::numeric, 0) / 100, 2);
    ELSIF v_reward_kind = 'discount_amount' THEN
      v_reward_discount := GREATEST(COALESCE((v_reward.config ->> 'amount')::numeric, 0), 0);
    END IF;
    v_reward_applied := true;
  END IF;

  IF v_free_delivery THEN
    v_fee := 0;
  END IF;

  -- loyalty point redemption stacks with the reward discount, capped at subtotal+fee.
  IF p_redeem_points > 0 AND p_customer_id IS NOT NULL THEN
    SELECT COALESCE(value::numeric, 100) INTO v_redeem_rate
      FROM settings WHERE key = 'loyalty_redeem_rate';
    v_redeem_rate := COALESCE(NULLIF(v_redeem_rate, 0), 100);

    SELECT loyalty_points INTO v_balance
      FROM customers WHERE id = p_customer_id FOR UPDATE;
    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'customer not found';
    END IF;

    v_redeem := LEAST(p_redeem_points, v_balance, floor(GREATEST(v_subtotal - v_reward_discount, 0) * v_redeem_rate)::integer);
    IF v_redeem > 0 THEN
      v_discount := round(v_redeem / v_redeem_rate, 2);
    END IF;
  END IF;

  v_discount := LEAST(v_discount + v_reward_discount, v_subtotal + v_fee);

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
        GREATEST(v_subtotal + v_fee - v_discount, 0),
        CASE WHEN p_payment_method IN ('cash', 'card') THEN p_payment_method ELSE 'cash' END,
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

  IF v_redeem > 0 THEN
    INSERT INTO loyalty_transactions(customer_id, order_id, points, type, note)
    VALUES (p_customer_id, v_order_id, -v_redeem, 'redeem', 'redeemed at checkout');
  END IF;

  IF v_reward_applied THEN
    INSERT INTO reward_redemptions(reward_id, customer_id, order_id)
    VALUES (p_reward_id, p_customer_id, v_order_id);
  END IF;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_amount', GREATEST(v_subtotal + v_fee - v_discount, 0),
    'delivery_fee', v_fee,
    'delivery_zone', v_zone_name,
    'discount', v_discount,
    'redeemed_points', v_redeem,
    'reward_id', CASE WHEN v_reward_applied THEN p_reward_id ELSE NULL END,
    'order_type', v_order_type,
    'status', 'pending'
  );
END $$;

GRANT EXECUTE ON FUNCTION public.create_order TO anon, authenticated;
