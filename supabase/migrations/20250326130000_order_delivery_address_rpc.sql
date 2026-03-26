-- Lecture adresse de livraison pour détail commande : le staff ne passait pas toujours
-- la RLS sur addresses lors du select imbriqué PostgREST (embed vide).
-- Cette fonction vérifie explicitement les droits puis lit addresses (SECURITY DEFINER).

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
      OR (public.is_staff() AND o.store_id = public.staff_store_id())
    );
$$;

COMMENT ON FUNCTION public.order_delivery_address(uuid) IS
  'Adresse de livraison pour une commande : client (propriétaire) ou staff du magasin.';

REVOKE ALL ON FUNCTION public.order_delivery_address(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_delivery_address(uuid) TO authenticated;

-- Politique équivalente plus robuste pour l’embed direct (si utilisé ailleurs)
DROP POLICY IF EXISTS addresses_select_staff_order ON public.addresses;

CREATE POLICY addresses_select_staff_order ON public.addresses FOR SELECT USING (
  public.is_staff()
  AND id IN (
    SELECT o.address_id
    FROM public.orders o
    WHERE o.address_id IS NOT NULL
      AND o.store_id = public.staff_store_id()
  )
);
