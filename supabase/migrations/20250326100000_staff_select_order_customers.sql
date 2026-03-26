-- Permettre au staff de voir téléphone/email des clients ayant commandé sur leur magasin
-- et les adresses attachées à ces commandes (liste / détail dashboard).

CREATE POLICY users_select_staff_store_customers ON public.users FOR SELECT USING (
  public.is_staff() AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.user_id = public.users.id
      AND o.store_id = public.staff_store_id()
  )
);

CREATE POLICY addresses_select_staff_order ON public.addresses FOR SELECT USING (
  public.is_staff() AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.address_id = public.addresses.id
      AND o.store_id = public.staff_store_id()
  )
);
