-- Analytics : événements app, colonnes commandes (source / upsell), anti-fraude promo (users.promo_used).

-- Anti-fraude : une fois une offre bienvenue consommée, plus de répétition (ex. -10 % panier — géré côté app).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS promo_used boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.promo_used IS
  'Si true : ne pas appliquer les promos bienvenue (ex. -10 %), même pour une première commande technique.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS has_upsell boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_source_chk;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_source_chk
  CHECK (source IN ('app', 'pos', 'other'));

COMMENT ON COLUMN public.orders.source IS 'Canal : app (mobile), pos, other.';
COMMENT ON COLUMN public.orders.has_upsell IS 'Au moins une ligne issue de la modale upsell (ou tracking métier).';

-- Événements analytics (peu de noms, metadata riche en JSON).
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_event_name_chk CHECK (
    event_name IN (
      'app_open',
      'view_product',
      'add_to_cart',
      'checkout_start',
      'order_completed',
      'upsell_view',
      'upsell_add'
    )
  )
);

CREATE INDEX events_created_at_idx ON public.events (created_at DESC);
CREATE INDEX events_event_name_created_at_idx ON public.events (event_name, created_at DESC);
CREATE INDEX events_user_id_idx ON public.events (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Insertion : client connecté (sa ligne) ou anonyme (user_id NULL). Pas d’usurpation d’autre user.
CREATE POLICY events_insert_authenticated ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY events_insert_anon ON public.events
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- Lecture réservée au siège (insights SQL / dashboard).
CREATE POLICY events_select_platform_admin ON public.events
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Agrégats « admin restaurateur » (fuseau Tunis, commandes app non annulées).
CREATE OR REPLACE FUNCTION public.admin_restaurant_business()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tunis_today date;
  tunis_week_start date;
  result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  tunis_today := (timezone('Africa/Tunis', now()))::date;
  tunis_week_start := tunis_today - 6;

  SELECT jsonb_build_object(
    'money_today',
    (
      SELECT jsonb_build_object(
        'revenue_tnd', coalesce(sum(o.total_price), 0)::numeric,
        'orders_count', count(*)::int,
        'avg_basket_tnd', coalesce(avg(o.total_price), 0)::numeric
      )
      FROM public.orders o
      WHERE o.source = 'app'
        AND o.status <> 'cancelled'
        AND (timezone('Africa/Tunis', o.created_at))::date = tunis_today
    ),
    'money_week',
    (
      SELECT jsonb_build_object(
        'revenue_tnd', coalesce(sum(o.total_price), 0)::numeric,
        'orders_count', count(*)::int,
        'avg_basket_tnd', coalesce(avg(o.total_price), 0)::numeric
      )
      FROM public.orders o
      WHERE o.source = 'app'
        AND o.status <> 'cancelled'
        AND (timezone('Africa/Tunis', o.created_at))::date >= tunis_week_start
        AND (timezone('Africa/Tunis', o.created_at))::date <= tunis_today
    ),
    'performance',
    (
      WITH w AS (
        SELECT
          count(*) FILTER (WHERE o.source = 'app')::int AS app_n,
          count(*)::int AS all_n
        FROM public.orders o
        WHERE o.status <> 'cancelled'
          AND o.created_at >= (now() - interval '7 days')
      ),
      cur_prev AS (
        SELECT
          count(*) FILTER (
            WHERE o.source = 'app'
              AND o.created_at >= (now() - interval '7 days')
          )::int AS app_cur,
          count(*) FILTER (
            WHERE o.source = 'app'
              AND o.created_at >= (now() - interval '14 days')
              AND o.created_at < (now() - interval '7 days')
          )::int AS app_prev
        FROM public.orders o
        WHERE o.status <> 'cancelled'
      )
      SELECT jsonb_build_object(
        'app_share_7d',
        CASE WHEN w.all_n > 0 THEN (w.app_n::numeric / w.all_n) ELSE 0 END,
        'app_orders_7d', w.app_n,
        'all_orders_7d', w.all_n,
        'app_orders_prev_7d', cp.app_prev,
        'app_orders_evolution_pct',
        CASE
          WHEN cp.app_prev > 0 THEN ((cp.app_cur - cp.app_prev)::numeric / cp.app_prev)
          WHEN cp.app_cur > 0 THEN 1::numeric
          ELSE 0::numeric
        END
      )
      FROM w
      CROSS JOIN cur_prev cp
    ),
    'upsell_7d',
    (
      SELECT jsonb_build_object(
        'rate',
        CASE
          WHEN count(*) > 0 THEN (count(*) FILTER (WHERE o.has_upsell)::numeric / count(*))
          ELSE 0::numeric
        END,
        'avg_with_upsell_tnd', coalesce(avg(o.total_price) FILTER (WHERE o.has_upsell), 0)::numeric,
        'avg_without_upsell_tnd', coalesce(avg(o.total_price) FILTER (WHERE NOT o.has_upsell), 0)::numeric,
        'orders_with_upsell', count(*) FILTER (WHERE o.has_upsell)::int,
        'orders_total', count(*)::int,
        'estimated_extra_revenue_tnd',
        CASE
          WHEN count(*) FILTER (WHERE o.has_upsell) > 0 THEN
            (
              coalesce(avg(o.total_price) FILTER (WHERE o.has_upsell), 0)
              - coalesce(avg(o.total_price) FILTER (WHERE NOT o.has_upsell), 0)
            ) * (count(*) FILTER (WHERE o.has_upsell))::numeric
          ELSE 0::numeric
        END
      )
      FROM public.orders o
      WHERE o.source = 'app'
        AND o.status <> 'cancelled'
        AND o.created_at >= (now() - interval '7 days')
    ),
    'clients',
    (
      WITH u AS (
        SELECT o.user_id, count(*)::int AS c
        FROM public.orders o
        WHERE o.user_id IS NOT NULL
          AND o.status <> 'cancelled'
        GROUP BY o.user_id
      ),
      agg AS (
        SELECT
          count(*)::int AS users_with_orders,
          count(*) FILTER (WHERE c >= 2)::int AS repeat_users,
          coalesce(sum(c), 0)::bigint AS total_orders
        FROM u
      )
      SELECT jsonb_build_object(
        'users_with_orders', a.users_with_orders,
        'repeat_users', a.repeat_users,
        'repeat_rate',
        CASE
          WHEN a.users_with_orders > 0 THEN (a.repeat_users::numeric / a.users_with_orders)
          ELSE 0::numeric
        END,
        'orders_per_user',
        CASE
          WHEN a.users_with_orders > 0 THEN (a.total_orders::numeric / a.users_with_orders)
          ELSE 0::numeric
        END
      )
      FROM agg a
    ),
    'top_products_30d',
    (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'product_name', sq.product_name,
            'total_qty', sq.total_qty
          )
          ORDER BY sq.total_qty DESC
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT p.name AS product_name, sum(oi.quantity)::bigint AS total_qty
        FROM public.order_items oi
        INNER JOIN public.orders o ON o.id = oi.order_id
        INNER JOIN public.products p ON p.id = oi.product_id
        WHERE o.status <> 'cancelled'
          AND o.created_at >= (now() - interval '30 days')
        GROUP BY p.name
        ORDER BY total_qty DESC
        LIMIT 5
      ) sq
    ),
    'funnel_events_7d',
    coalesce(
      (
        SELECT jsonb_object_agg(f.event_name, f.cnt)
        FROM (
          SELECT ev.event_name, count(*)::int AS cnt
          FROM public.events ev
          WHERE ev.created_at >= (now() - interval '7 days')
            AND ev.event_name IN ('view_product', 'add_to_cart', 'order_completed')
          GROUP BY ev.event_name
        ) f
      ),
      '{}'::jsonb
    ),
    'conversion_add_to_cart_to_order',
    (
      WITH a AS (
        SELECT count(*)::numeric AS add_n
        FROM public.events ev
        WHERE ev.created_at >= (now() - interval '7 days')
          AND ev.event_name = 'add_to_cart'
      ),
      c AS (
        SELECT count(*)::numeric AS ord_n
        FROM public.events ev
        WHERE ev.created_at >= (now() - interval '7 days')
          AND ev.event_name = 'order_completed'
      )
      SELECT CASE
        WHEN (SELECT add_n FROM a) > 0 THEN ((SELECT ord_n FROM c) / (SELECT add_n FROM a))
        ELSE 0::numeric
      END
    )
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restaurant_business() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restaurant_business() TO authenticated;
