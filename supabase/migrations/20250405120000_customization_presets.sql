-- Bibliothèque de personnalisations réutilisables (le dashboard importe une copie sur chaque produit).

CREATE TABLE public.customization_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.customization_preset_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES public.customization_presets (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  max_select INT NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX customization_preset_groups_preset_id_idx ON public.customization_preset_groups (preset_id);

CREATE TABLE public.customization_preset_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_group_id UUID NOT NULL REFERENCES public.customization_preset_groups (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0,
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX customization_preset_options_group_id_idx ON public.customization_preset_options (preset_group_id);

ALTER TABLE public.customization_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_preset_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customization_preset_options ENABLE ROW LEVEL SECURITY;

-- Réservé au staff connecté (non exposé au menu client).
CREATE POLICY customization_presets_staff_all ON public.customization_presets FOR ALL TO authenticated USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY customization_preset_groups_staff_all ON public.customization_preset_groups FOR ALL TO authenticated USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY customization_preset_options_staff_all ON public.customization_preset_options FOR ALL TO authenticated USING (public.is_staff())
WITH CHECK (public.is_staff());
