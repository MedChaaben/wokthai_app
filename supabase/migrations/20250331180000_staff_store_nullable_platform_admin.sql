-- Restaurant optionnel pour les comptes siège (platform_admin) ; obligatoire pour le rôle restaurant.

ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_store_id_role_chk;

ALTER TABLE public.staff
  ALTER COLUMN store_id DROP NOT NULL;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_store_id_role_chk CHECK (
    role = 'platform_admin'::public.staff_role
    OR store_id IS NOT NULL
  );

COMMENT ON COLUMN public.staff.store_id IS
  'Affectation restaurant pour role store ; NULL autorisé pour platform_admin (siège).';

UPDATE public.staff
SET store_id = NULL
WHERE role = 'platform_admin'::public.staff_role;
