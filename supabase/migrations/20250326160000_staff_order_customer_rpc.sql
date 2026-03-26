-- Infos client pour le dashboard staff : contourne les cas où l’embed PostgREST `users` est vide sous RLS.

CREATE OR REPLACE FUNCTION public.staff_customers_for_store_orders(p_store_id uuid)
RETURNS TABLE (
  order_id uuid,
  phone text,
  email text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, u.phone, u.email, u.first_name, u.last_name
  FROM public.orders o
  INNER JOIN public.users u ON u.id = o.user_id
  WHERE o.store_id = p_store_id
    AND public.is_staff()
    AND p_store_id = public.staff_store_id();
$$;

CREATE OR REPLACE FUNCTION public.staff_customer_for_order(p_order_id uuid)
RETURNS TABLE (
  phone text,
  email text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.phone, u.email, u.first_name, u.last_name
  FROM public.orders o
  INNER JOIN public.users u ON u.id = o.user_id
  WHERE o.id = p_order_id
    AND public.is_staff()
    AND o.store_id = public.staff_store_id();
$$;

GRANT EXECUTE ON FUNCTION public.staff_customers_for_store_orders(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_customer_for_order(uuid) TO authenticated;
