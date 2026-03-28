-- Suppression de compte client : détache les commandes (conservation comptable), supprime auth + profil + adresses.
-- Les comptes staff ne sont pas supprimables via cette RPC (utiliser le dashboard Supabase / un admin).

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.staff WHERE user_id = uid) THEN
    RAISE EXCEPTION 'staff_account_forbidden';
  END IF;

  UPDATE public.orders
  SET
    user_id = NULL,
    delivery_notes = NULL
  WHERE user_id = uid;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

COMMENT ON FUNCTION public.delete_my_account() IS
  'App client : supprime l’utilisateur auth et son profil public ; commandes historisées sans lien client.';

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
