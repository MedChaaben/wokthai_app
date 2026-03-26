-- Options produit + snapshot sur les lignes de commande

CREATE TABLE public.product_option_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  max_select INT NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX product_option_groups_product_id_idx ON public.product_option_groups (product_id);

CREATE TABLE public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.product_option_groups (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX product_options_group_id_idx ON public.product_options (group_id);

CREATE TABLE public.order_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items (id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0
);

CREATE INDEX order_item_options_order_item_id_idx ON public.order_item_options (order_item_id);

ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_option_groups_select_public ON public.product_option_groups FOR SELECT USING (true);
CREATE POLICY product_option_groups_staff_write ON public.product_option_groups FOR ALL USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY product_options_select_public ON public.product_options FOR SELECT USING (true);
CREATE POLICY product_options_staff_write ON public.product_options FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY order_item_options_select_customer ON public.order_item_options FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_id AND o.user_id = auth.uid()
  )
);

CREATE POLICY order_item_options_select_staff ON public.order_item_options FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders ord ON ord.id = oi.order_id
    WHERE oi.id = order_item_id AND public.is_staff() AND ord.store_id = public.staff_store_id()
  )
);

CREATE POLICY order_item_options_insert_customer ON public.order_item_options FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_id AND o.user_id = auth.uid()
  )
);

-- Exemple : Pad Thai (c0000000-0000-4000-8000-000000000001)
INSERT INTO public.product_option_groups (id, product_id, name, required, max_select, position)
VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    'c0000000-0000-4000-8000-000000000001',
    'Niveau de piquant',
    true,
    1,
    0
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    'c0000000-0000-4000-8000-000000000001',
    'Ingrédients',
    false,
    3,
    1
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_options (id, group_id, name, price_modifier, position)
VALUES
  ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Doux', 0, 0),
  ('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Moyen', 0, 1),
  ('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Fort', 0, 2),
  ('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'Sans champignons', 0, 0),
  ('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'Avec champignons noirs', 1.5, 1),
  ('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'Avec champignons paris', 1, 2)
ON CONFLICT (id) DO NOTHING;
