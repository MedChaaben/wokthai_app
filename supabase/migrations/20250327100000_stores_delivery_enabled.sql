-- Livraison activable par magasin (retrait uniquement si désactivé)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.stores.delivery_enabled IS
  'Si false, seul le retrait au magasin est proposé (app + commandes).';

-- Restreindre la mise à jour des magasins au magasin assigné au staff
DROP POLICY IF EXISTS stores_all_staff ON public.stores;

CREATE POLICY stores_staff_update_own ON public.stores
  FOR UPDATE
  TO authenticated
  USING (public.is_staff() AND id = public.staff_store_id())
  WITH CHECK (public.is_staff() AND id = public.staff_store_id());
