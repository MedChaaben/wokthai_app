-- Checkout invité (sans compte), promo livraison 1re commande (côté app), points fidélité à la livraison.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS guest_delivery_label text,
  ADD COLUMN IF NOT EXISTS guest_delivery_address text,
  ADD COLUMN IF NOT EXISTS guest_delivery_city text,
  ADD COLUMN IF NOT EXISTS guest_lat double precision,
  ADD COLUMN IF NOT EXISTS guest_lng double precision,
  ADD COLUMN IF NOT EXISTS delivery_promo text,
  ADD COLUMN IF NOT EXISTS loyalty_points_credited boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_guest_delivery_city_chk;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_guest_delivery_city_chk
  CHECK (guest_delivery_city IS NULL OR guest_delivery_city IN ('Tunis', 'Ariana'));

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.guest_phone IS 'Téléphone saisi pour une commande sans compte.';
COMMENT ON COLUMN public.orders.delivery_promo IS 'Ex. first_order_free si la livraison a été offerte (client connecté).';
COMMENT ON COLUMN public.users.loyalty_points IS 'Points fidélité cumulés (1 TND dépensé livré = 1 pt).';

-- Fidélité : crédit à la première transition vers « delivered », une seule fois par commande.
CREATE OR REPLACE FUNCTION public.apply_loyalty_points_on_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pts integer;
BEGIN
  IF NEW.status = 'delivered'
     AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.user_id IS NOT NULL
     AND COALESCE(NEW.loyalty_points_credited, false) = false
  THEN
    pts := FLOOR(NEW.total_price)::integer;
    IF pts > 0 THEN
      UPDATE public.users u
      SET loyalty_points = COALESCE(u.loyalty_points, 0) + pts
      WHERE u.id = NEW.user_id;
    END IF;
    NEW.loyalty_points_credited := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_loyalty_on_delivered ON public.orders;
CREATE TRIGGER orders_loyalty_on_delivered
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_loyalty_points_on_delivered();

-- Zones de livraison : lecture pour les invités (calcul des frais au checkout).
CREATE POLICY delivery_zones_select_anon ON public.delivery_zones FOR SELECT TO anon USING (true);

-- Commandes invité : insertion et lecture (suivi par id connu).
CREATE POLICY orders_insert_guest ON public.orders FOR INSERT TO anon
  WITH CHECK (
    user_id IS NULL
    AND store_id IN (SELECT s.id FROM public.stores s WHERE s.is_active = true)
    AND (
      (
        type = 'pickup'
        AND address_id IS NULL
        AND guest_phone IS NOT NULL
        AND length(trim(guest_phone)) >= 8
      )
      OR (
        type = 'delivery'
        AND address_id IS NULL
        AND guest_phone IS NOT NULL
        AND length(trim(guest_phone)) >= 8
        AND guest_delivery_label IS NOT NULL
        AND length(trim(guest_delivery_label)) > 0
        AND guest_delivery_address IS NOT NULL
        AND length(trim(guest_delivery_address)) > 0
        AND guest_delivery_city IS NOT NULL
        AND guest_lat IS NOT NULL
        AND guest_lng IS NOT NULL
      )
    )
  );

CREATE POLICY orders_select_guest ON public.orders FOR SELECT TO anon USING (user_id IS NULL);

CREATE POLICY order_items_select_guest ON public.order_items FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id IS NULL)
);

CREATE POLICY order_items_insert_guest ON public.order_items FOR INSERT TO anon WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id IS NULL)
);

CREATE POLICY order_item_options_select_guest ON public.order_item_options FOR SELECT TO anon USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_id AND o.user_id IS NULL
  )
);

CREATE POLICY order_item_options_insert_guest ON public.order_item_options FOR INSERT TO anon WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_id AND o.user_id IS NULL
  )
);

CREATE POLICY order_status_events_select_guest ON public.order_status_events FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id IS NULL)
);

-- RPC adresse livraison : inclut le snapshot invité.
CREATE OR REPLACE FUNCTION public.order_delivery_address(p_order_id uuid)
RETURNS TABLE (
  label text,
  address text,
  city text,
  instructions text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.label, a.address, a.city, a.instructions
  FROM public.orders o
  INNER JOIN public.addresses a ON a.id = o.address_id
  WHERE o.id = p_order_id
    AND o.address_id IS NOT NULL
    AND (
      o.user_id = auth.uid()
      OR (public.is_staff() AND o.store_id = public.staff_store_id())
    )
  UNION ALL
  SELECT
    trim(o.guest_delivery_label),
    trim(o.guest_delivery_address),
    trim(o.guest_delivery_city),
    NULL::text
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.address_id IS NULL
    AND o.user_id IS NULL
    AND o.guest_phone IS NOT NULL
    AND o.guest_delivery_address IS NOT NULL
    AND o.guest_delivery_city IS NOT NULL
    AND (
      auth.uid() IS NULL
      OR (public.is_staff() AND o.store_id = public.staff_store_id())
    );
$$;

COMMENT ON FUNCTION public.order_delivery_address(uuid) IS
  'Adresse livraison : client enregistré, invité (snapshot), ou staff magasin.';

REVOKE ALL ON FUNCTION public.order_delivery_address(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_delivery_address(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.order_delivery_address(uuid) TO authenticated;

-- Staff : téléphone invité visible dans les listes commandes.
CREATE OR REPLACE FUNCTION public.staff_customers_for_store_orders(p_store_id uuid)
RETURNS TABLE (
  order_id uuid,
  phone text,
  email text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    COALESCE(u.phone, o.guest_phone) AS phone,
    u.email,
    u.first_name,
    u.last_name
  FROM public.orders o
  LEFT JOIN public.users u ON u.id = o.user_id
  WHERE o.store_id = p_store_id
    AND public.is_staff()
    AND p_store_id = public.staff_store_id();
$$;

CREATE OR REPLACE FUNCTION public.staff_customer_for_order(p_order_id uuid)
RETURNS TABLE (
  phone text,
  email text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(u.phone, o.guest_phone) AS phone,
    u.email,
    u.first_name,
    u.last_name
  FROM public.orders o
  LEFT JOIN public.users u ON u.id = o.user_id
  WHERE o.id = p_order_id
    AND public.is_staff()
    AND o.store_id = public.staff_store_id();
$$;
