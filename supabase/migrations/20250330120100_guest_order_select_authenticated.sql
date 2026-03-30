-- Un client connecté doit pouvoir ouvrir le suivi d’une commande passée en invité (même UUID).

CREATE POLICY orders_select_guest_authenticated ON public.orders FOR SELECT TO authenticated USING (user_id IS NULL);

CREATE POLICY order_items_select_guest_authenticated ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id IS NULL)
);

CREATE POLICY order_item_options_select_guest_authenticated ON public.order_item_options FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_id AND o.user_id IS NULL
  )
);

CREATE POLICY order_status_events_select_guest_authenticated ON public.order_status_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id IS NULL)
);
