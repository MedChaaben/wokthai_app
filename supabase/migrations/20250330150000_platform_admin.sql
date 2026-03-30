-- Rôle plateforme : administration multi-magasins (points de vente, équipe, commandes globales)
-- Idempotent : ré-exécutable si une tentative précédente a créé le type ou certaines politiques.

DO $wt_staff_role$
BEGIN
  CREATE TYPE public.staff_role AS ENUM ('store', 'platform_admin');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$wt_staff_role$;

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS role public.staff_role NOT NULL DEFAULT 'store';

COMMENT ON COLUMN public.staff.role IS
  'store = accès limité au magasin assigné ; platform_admin = gestion globale (back-office siège).';

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.user_id = auth.uid() AND s.role = 'platform_admin'::public.staff_role
  );
$$;

-- ── staff : lecture élargie + écriture réservée aux admins plateforme
DROP POLICY IF EXISTS staff_select_self ON public.staff;
DROP POLICY IF EXISTS staff_select_self_or_admin ON public.staff;
DROP POLICY IF EXISTS staff_insert_platform_admin ON public.staff;
DROP POLICY IF EXISTS staff_update_platform_admin ON public.staff;
DROP POLICY IF EXISTS staff_delete_platform_admin ON public.staff;

CREATE POLICY staff_select_self_or_admin ON public.staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin());

CREATE POLICY staff_insert_platform_admin ON public.staff
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY staff_update_platform_admin ON public.staff
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY staff_delete_platform_admin ON public.staff
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ── Magasins : création / suppression siège uniquement ; mise à jour par magasin assigné ou admin
DROP POLICY IF EXISTS stores_all_staff ON public.stores;
DROP POLICY IF EXISTS stores_insert_platform_admin ON public.stores;
DROP POLICY IF EXISTS stores_update_by_scope ON public.stores;
DROP POLICY IF EXISTS stores_delete_platform_admin ON public.stores;

CREATE POLICY stores_insert_platform_admin ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY stores_update_by_scope ON public.stores
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      public.is_staff()
      AND NOT public.is_platform_admin()
      AND id = public.staff_store_id()
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      public.is_staff()
      AND NOT public.is_platform_admin()
      AND id = public.staff_store_id()
    )
  );

CREATE POLICY stores_delete_platform_admin ON public.stores
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

-- ── Zones de livraison : admin global ou staff du magasin concerné (sans rôle plateforme sur la ligne métier)
DROP POLICY IF EXISTS delivery_zones_staff_write ON public.delivery_zones;
DROP POLICY IF EXISTS delivery_zones_all_platform_admin ON public.delivery_zones;
DROP POLICY IF EXISTS delivery_zones_store_staff_write ON public.delivery_zones;

CREATE POLICY delivery_zones_all_platform_admin ON public.delivery_zones
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY delivery_zones_store_staff_write ON public.delivery_zones
  FOR ALL TO authenticated
  USING (
    public.is_staff()
    AND NOT public.is_platform_admin()
    AND store_id = public.staff_store_id()
  )
  WITH CHECK (
    public.is_staff()
    AND NOT public.is_platform_admin()
    AND store_id = public.staff_store_id()
  );

-- ── Commandes : admin plateforme voit et met à jour toutes les commandes
DROP POLICY IF EXISTS orders_select_platform_admin ON public.orders;
DROP POLICY IF EXISTS orders_update_platform_admin ON public.orders;
DROP POLICY IF EXISTS order_items_select_platform_admin ON public.order_items;
DROP POLICY IF EXISTS order_item_options_select_platform_admin ON public.order_item_options;
DROP POLICY IF EXISTS order_status_events_select_platform_admin ON public.order_status_events;
DROP POLICY IF EXISTS store_opening_hours_all_platform_admin ON public.store_opening_hours;

CREATE POLICY orders_select_platform_admin ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY orders_update_platform_admin ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY order_items_select_platform_admin ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_platform_admin())
  );

CREATE POLICY order_item_options_select_platform_admin ON public.order_item_options
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_items oi
      INNER JOIN public.orders ord ON ord.id = oi.order_id
      WHERE oi.id = order_item_id AND public.is_platform_admin()
    )
  );

CREATE POLICY order_status_events_select_platform_admin ON public.order_status_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_platform_admin())
  );

-- ── Horaires : admin sur tous les magasins
CREATE POLICY store_opening_hours_all_platform_admin ON public.store_opening_hours
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ── Adresses : lecture pour commandes de n’importe quel magasin (admin)
DROP POLICY IF EXISTS addresses_select_staff_order ON public.addresses;

CREATE POLICY addresses_select_staff_order ON public.addresses
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    AND id IN (
      SELECT o.address_id
      FROM public.orders o
      WHERE o.address_id IS NOT NULL
        AND (
          public.is_platform_admin()
          OR o.store_id = public.staff_store_id()
        )
    )
  );

-- ── RPC clients commandes (liste magasin)
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
  SELECT o.id, u.phone, u.email, u.first_name, u.last_name
  FROM public.orders o
  INNER JOIN public.users u ON u.id = o.user_id
  WHERE o.store_id = p_store_id
    AND o.user_id IS NOT NULL
    AND (
      public.is_platform_admin()
      OR (
        public.is_staff()
        AND p_store_id = public.staff_store_id()
      )
    );
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
  SELECT u.phone, u.email, u.first_name, u.last_name
  FROM public.orders o
  INNER JOIN public.users u ON u.id = o.user_id
  WHERE o.id = p_order_id
    AND o.user_id IS NOT NULL
    AND (
      public.is_platform_admin()
      OR (
        public.is_staff()
        AND o.store_id = public.staff_store_id()
      )
    );
$$;

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
      OR public.is_platform_admin()
      OR (public.is_staff() AND o.store_id = public.staff_store_id())
    );
$$;

-- Infos client pour listes admin (plusieurs commandes)
CREATE OR REPLACE FUNCTION public.staff_customers_for_admin_orders(p_order_ids uuid[])
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
  SELECT o.id, u.phone, u.email, u.first_name, u.last_name
  FROM public.orders o
  INNER JOIN public.users u ON u.id = o.user_id
  WHERE o.id = ANY(p_order_ids)
    AND o.user_id IS NOT NULL
    AND public.is_platform_admin();
$$;

COMMENT ON FUNCTION public.staff_customers_for_admin_orders(uuid[]) IS
  'Plateforme : récupère les coordonnées clients pour une liste de commandes (contourne RLS users).';

REVOKE ALL ON FUNCTION public.staff_customers_for_admin_orders(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_customers_for_admin_orders(uuid[]) TO authenticated;

-- Remplacement des créneaux pour un magasin donné (admin siège)
CREATE OR REPLACE FUNCTION public.replace_store_opening_hours_for_store(p_store_id uuid, p_slots jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.store_opening_hours WHERE store_id = p_store_id;

  INSERT INTO public.store_opening_hours (store_id, day_of_week, open_time, close_time, sort_order)
  SELECT
    p_store_id,
    (elem->>'day_of_week')::smallint,
    (elem->>'open_time')::time,
    (elem->>'close_time')::time,
    COALESCE((elem->>'sort_order')::int, t.ord - 1)
  FROM jsonb_array_elements(p_slots) WITH ORDINALITY AS t(elem, ord);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_store_opening_hours_for_store(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_store_opening_hours_for_store(uuid, jsonb) TO authenticated;

-- Agrégats pour tableau de bord siège (fuseau Tunis)
CREATE OR REPLACE FUNCTION public.admin_dashboard_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tunis_today date;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  tunis_today := (timezone('Africa/Tunis', now()))::date;

  SELECT jsonb_build_object(
    'pending_count',
    (SELECT count(*)::int FROM public.orders WHERE status = 'pending'),
    'active_count',
    (
      SELECT count(*)::int
      FROM public.orders
      WHERE status NOT IN ('delivered', 'cancelled')
    ),
    'orders_today',
    (
      SELECT count(*)::int
      FROM public.orders
      WHERE (timezone('Africa/Tunis', created_at))::date = tunis_today
    ),
    'revenue_today_tnd',
    (
      SELECT coalesce(sum(total_price), 0)::numeric
      FROM public.orders
      WHERE (timezone('Africa/Tunis', created_at))::date = tunis_today
        AND status <> 'cancelled'
    ),
    'orders_last_7_days',
    (
      SELECT count(*)::int
      FROM public.orders
      WHERE created_at >= (now() - interval '7 days')
    ),
    'revenue_last_7_days_tnd',
    (
      SELECT coalesce(sum(total_price), 0)::numeric
      FROM public.orders
      WHERE created_at >= (now() - interval '7 days')
        AND status <> 'cancelled'
    ),
    'stores_total',
    (SELECT count(*)::int FROM public.stores),
    'stores_active',
    (SELECT count(*)::int FROM public.stores WHERE is_active = true),
    'by_store',
    (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'store_id', x.store_id,
            'store_name', x.store_name,
            'pending', x.pending,
            'active', x.active,
            'revenue_7d', x.revenue_7d
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          s.id AS store_id,
          s.name AS store_name,
          count(*) FILTER (WHERE o.status = 'pending')::int AS pending,
          count(*) FILTER (WHERE o.status NOT IN ('delivered', 'cancelled'))::int AS active,
          coalesce(sum(o.total_price) FILTER (
            WHERE o.created_at >= (now() - interval '7 days') AND o.status <> 'cancelled'
          ), 0)::numeric AS revenue_7d
        FROM public.stores s
        LEFT JOIN public.orders o ON o.store_id = s.id
        GROUP BY s.id, s.name
        ORDER BY s.name
      ) x
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_summary() TO authenticated;
