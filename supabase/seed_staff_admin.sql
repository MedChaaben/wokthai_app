-- 1) Dans Supabase : Authentication → Users → Add user
--    Email : admin@wokthai.tn
--    Mot de passe : WelcomeAdmin! (ou autre)
--    Cocher « Auto Confirm User »
--
-- 2) Exécuter ce script dans SQL Editor :

INSERT INTO public.staff (user_id, email, store_id, role)
SELECT u.id, u.email, NULL, 'platform_admin'::public.staff_role
FROM auth.users u
WHERE u.email = 'admin@wokthai.tn'
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  store_id = EXCLUDED.store_id,
  role = EXCLUDED.role;
