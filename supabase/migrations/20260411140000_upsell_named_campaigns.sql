-- Relances upsell nommées par le siège (remplace les kinds fixes drink/starter).

CREATE TABLE public.upsell_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX upsell_campaigns_position_idx ON public.upsell_campaigns (position);

CREATE TABLE public.upsell_campaign_categories (
  campaign_id uuid NOT NULL REFERENCES public.upsell_campaigns (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, category_id)
);

CREATE INDEX upsell_campaign_categories_campaign_id_idx ON public.upsell_campaign_categories (campaign_id);

ALTER TABLE public.upsell_suggestions ADD COLUMN campaign_id uuid REFERENCES public.upsell_campaigns (id) ON DELETE CASCADE;

DO $$
DECLARE
  rid_drink uuid;
  rid_starter uuid;
BEGIN
  INSERT INTO public.upsell_campaigns (name, position) VALUES ('Boisson', 0) RETURNING id INTO rid_drink;
  INSERT INTO public.upsell_campaigns (name, position) VALUES ('Entrée', 1) RETURNING id INTO rid_starter;

  INSERT INTO public.upsell_campaign_categories (campaign_id, category_id)
  SELECT rid_drink, category_id FROM public.upsell_kind_categories WHERE kind = 'drink';

  INSERT INTO public.upsell_campaign_categories (campaign_id, category_id)
  SELECT rid_starter, category_id FROM public.upsell_kind_categories WHERE kind = 'starter';

  UPDATE public.upsell_suggestions SET campaign_id = rid_drink WHERE kind = 'drink';
  UPDATE public.upsell_suggestions SET campaign_id = rid_starter WHERE kind = 'starter';
END $$;

ALTER TABLE public.upsell_suggestions ALTER COLUMN campaign_id SET NOT NULL;

ALTER TABLE public.upsell_suggestions DROP COLUMN kind;

DROP INDEX IF EXISTS upsell_suggestions_kind_product_uniq;
DROP INDEX IF EXISTS upsell_suggestions_kind_active_position_idx;

CREATE UNIQUE INDEX upsell_suggestions_campaign_product_uniq ON public.upsell_suggestions (campaign_id, product_id);
CREATE INDEX upsell_suggestions_campaign_active_position_idx ON public.upsell_suggestions (campaign_id, is_active, position);

DROP TABLE public.upsell_kind_categories;

DROP TYPE public.upsell_kind;

ALTER TABLE public.upsell_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_campaign_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY upsell_campaigns_select_public ON public.upsell_campaigns FOR SELECT USING (true);

CREATE POLICY upsell_campaigns_write_admin ON public.upsell_campaigns FOR ALL TO authenticated USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY upsell_campaign_categories_select_public ON public.upsell_campaign_categories FOR SELECT USING (true);

CREATE POLICY upsell_campaign_categories_write_admin ON public.upsell_campaign_categories FOR ALL TO authenticated USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());
