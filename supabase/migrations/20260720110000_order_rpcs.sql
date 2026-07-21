/*
  # Order RPCs + is_admin helper

  - is_admin(): active row in admin_users for auth.uid()
  - create_order: single trusted order-creation path (POS + online + guest).
    Prices come from the products table (client-sent prices are ignored),
    status is forced to 'pending', order number generated server-side.
  - track_order: minimal order status view for guests (uuid = capability)
  - edit_order: admin-only atomic edit of a pending order
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid() AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,                        -- [{product_id, quantity}]
  p_customer_name text,
  p_payment_method text DEFAULT 'cash',
  p_customer_id uuid DEFAULT NULL,
  p_order_type text DEFAULT 'pickup',
  p_delivery_fee numeric DEFAULT NULL,  -- honored only for admins (POS); online uses settings
  p_delivery_address text DEFAULT NULL,
  p_delivery_lat double precision DEFAULT NULL,
  p_delivery_lng double precision DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source text DEFAULT 'online'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_admin boolean := is_admin();
  v_source text;
  v_order_type text;
  v_fee numeric := 0;
  v_subtotal numeric := 0;
  v_order_id uuid;
  v_order_number text;
  v_item record;
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

  -- delivery fee: server-authoritative for online orders
  IF v_order_type = 'delivery' THEN
    IF v_admin AND p_delivery_fee IS NOT NULL THEN
      v_fee := GREATEST(p_delivery_fee, 0);
    ELSE
      SELECT COALESCE(value::numeric, 0) INTO v_fee
        FROM settings WHERE key = 'delivery_fee';
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

  -- unique server-side order number (retry on rare collision)
  LOOP
    v_attempt := v_attempt + 1;
    v_order_number := 'ORD-' || (extract(epoch FROM clock_timestamp()) * 1000)::bigint::text;
    BEGIN
      INSERT INTO orders (
        order_number, customer_name, total_amount, payment_method, status,
        customer_id, order_type, delivery_fee, delivery_address,
        delivery_lat, delivery_lng, customer_phone, notes, source
      ) VALUES (
        v_order_number, COALESCE(NULLIF(trim(p_customer_name), ''), 'Walk-in'),
        v_subtotal + v_fee,
        CASE WHEN p_payment_method IN ('cash','card') THEN p_payment_method ELSE 'cash' END,
        'pending',
        p_customer_id, v_order_type, v_fee, p_delivery_address,
        p_delivery_lat, p_delivery_lng, p_customer_phone, p_notes, v_source
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

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_amount', v_subtotal + v_fee,
    'delivery_fee', v_fee,
    'order_type', v_order_type,
    'status', 'pending'
  );
END $$;

CREATE OR REPLACE FUNCTION public.track_order(p_order_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'order_number', o.order_number,
    'status', o.status,
    'total_amount', o.total_amount,
    'delivery_fee', o.delivery_fee,
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
    total_amount     = v_total + COALESCE(p_delivery_fee, delivery_fee, 0),
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

-- Anyone may call create_order / track_order; edit_order self-guards via is_admin().
GRANT EXECUTE ON FUNCTION public.create_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon, authenticated;
