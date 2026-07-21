/*
  # Business Hours

  1. business_hours: one row per weekday (0=Sunday..6=Saturday), each with an
     open/close time and an is_closed override for full-day closures.
     Seeded with sensible defaults so the table is never empty.
  2. is_store_open(): true/false right now, in the store's local timezone
     (Asia/Beirut). Handles overnight ranges (e.g. open 18:00, close 02:00).
  3. create_order: online orders are rejected while closed. POS orders are
     exempt — staff can still ring up a walk-in/phone order after hours.
*/

CREATE TABLE IF NOT EXISTS public.business_hours (
  day_of_week integer PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  open_time   time NOT NULL DEFAULT '09:00',
  close_time  time NOT NULL DEFAULT '22:00',
  is_closed   boolean NOT NULL DEFAULT false
);

INSERT INTO public.business_hours (day_of_week)
SELECT d FROM generate_series(0, 6) AS d
WHERE NOT EXISTS (SELECT 1 FROM public.business_hours WHERE day_of_week = d);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read business_hours" ON public.business_hours;
CREATE POLICY "public read business_hours" ON public.business_hours
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin write business_hours" ON public.business_hours;
CREATE POLICY "admin write business_hours" ON public.business_hours
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.is_store_open()
RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_local timestamp := now() AT TIME ZONE 'Asia/Beirut';
  v_row record;
BEGIN
  SELECT * INTO v_row FROM business_hours WHERE day_of_week = EXTRACT(DOW FROM v_local)::int;
  IF NOT FOUND OR v_row.is_closed THEN
    RETURN false;
  END IF;

  -- Overnight ranges (close_time <= open_time, e.g. 18:00 -> 02:00) wrap past midnight.
  IF v_row.close_time > v_row.open_time THEN
    RETURN v_local::time BETWEEN v_row.open_time AND v_row.close_time;
  ELSE
    RETURN v_local::time >= v_row.open_time OR v_local::time <= v_row.close_time;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.is_store_open TO anon, authenticated;

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

  -- Online orders are blocked while the store is closed; POS (in-person /
  -- phone orders rung up by staff) is exempt.
  IF v_source = 'online' AND NOT is_store_open() THEN
    RAISE EXCEPTION 'store is currently closed';
  END IF;

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
