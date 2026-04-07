-- Suggestions upsell avant validation commande (boisson / entree)

DO $$
BEGIN
  CREATE TYPE public.upsell_kind AS ENUM ('drink', 'starter');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.upsell_kind_categories (
  kind public.upsell_kind NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, category_id)
);

CREATE TABLE IF NOT EXISTS public.upsell_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.upsell_kind NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS upsell_suggestions_kind_product_uniq
  ON public.upsell_suggestions(kind, product_id);
CREATE INDEX IF NOT EXISTS upsell_suggestions_kind_active_position_idx
  ON public.upsell_suggestions(kind, is_active, position);

ALTER TABLE public.upsell_kind_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upsell_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS upsell_kind_categories_select_public ON public.upsell_kind_categories;
DROP POLICY IF EXISTS upsell_kind_categories_write_admin ON public.upsell_kind_categories;
DROP POLICY IF EXISTS upsell_suggestions_select_public ON public.upsell_suggestions;
DROP POLICY IF EXISTS upsell_suggestions_write_admin ON public.upsell_suggestions;

CREATE POLICY upsell_kind_categories_select_public ON public.upsell_kind_categories
  FOR SELECT USING (true);

CREATE POLICY upsell_kind_categories_write_admin ON public.upsell_kind_categories
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY upsell_suggestions_select_public ON public.upsell_suggestions
  FOR SELECT USING (true);

CREATE POLICY upsell_suggestions_write_admin ON public.upsell_suggestions
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
