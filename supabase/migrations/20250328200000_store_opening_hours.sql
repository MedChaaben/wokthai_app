-- Horaires d'ouverture par magasin (plusieurs créneaux par jour : ex. midi + soir)

CREATE TABLE public.store_opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  -- 1 = lundi … 7 = dimanche (ISO)
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT store_opening_hours_open_before_close CHECK (open_time < close_time)
);

CREATE INDEX store_opening_hours_store_day_idx
  ON public.store_opening_hours (store_id, day_of_week, sort_order);

COMMENT ON TABLE public.store_opening_hours IS
  'Créneaux d''ouverture affichés au checkout ; configurables par le staff du magasin.';

ALTER TABLE public.store_opening_hours ENABLE ROW LEVEL SECURITY;

-- Clients : uniquement les magasins actifs (checkout / catalogue)
CREATE POLICY store_opening_hours_select_active_store
  ON public.store_opening_hours
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.is_active = true
    )
  );

-- Staff : lecture de son magasin (y compris si magasin inactif — préparation mise en ligne)
CREATE POLICY store_opening_hours_select_staff_own_store
  ON public.store_opening_hours
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff() AND store_id = public.staff_store_id()
  );

CREATE POLICY store_opening_hours_insert_staff_own_store
  ON public.store_opening_hours
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_staff() AND store_id = public.staff_store_id()
  );

CREATE POLICY store_opening_hours_update_staff_own_store
  ON public.store_opening_hours
  FOR UPDATE
  TO authenticated
  USING (
    public.is_staff() AND store_id = public.staff_store_id()
  )
  WITH CHECK (
    public.is_staff() AND store_id = public.staff_store_id()
  );

CREATE POLICY store_opening_hours_delete_staff_own_store
  ON public.store_opening_hours
  FOR DELETE
  TO authenticated
  USING (
    public.is_staff() AND store_id = public.staff_store_id()
  );

-- Remplacement atomique des créneaux (évite panier vide si l’insert échoue après delete)
CREATE OR REPLACE FUNCTION public.replace_store_opening_hours_for_my_store(p_slots jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  sid := public.staff_store_id();
  IF sid IS NULL OR NOT public.is_staff() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.store_opening_hours WHERE store_id = sid;

  INSERT INTO public.store_opening_hours (store_id, day_of_week, open_time, close_time, sort_order)
  SELECT
    sid,
    (elem->>'day_of_week')::smallint,
    (elem->>'open_time')::time,
    (elem->>'close_time')::time,
    COALESCE((elem->>'sort_order')::int, t.ord - 1)
  FROM jsonb_array_elements(p_slots) WITH ORDINALITY AS t(elem, ord);
END;
$$;

COMMENT ON FUNCTION public.replace_store_opening_hours_for_my_store(jsonb) IS
  'Staff : remplace tous les créneaux du magasin assigné. p_slots = tableau JSON {day_of_week, open_time, close_time, sort_order?}.';

REVOKE ALL ON FUNCTION public.replace_store_opening_hours_for_my_store(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_store_opening_hours_for_my_store(jsonb) TO authenticated;
