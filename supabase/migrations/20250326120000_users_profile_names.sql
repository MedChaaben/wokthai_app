-- Profil client : prénom et nom pour la livraison / facturation

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

COMMENT ON COLUMN public.users.first_name IS 'Prénom (saisie client)';
COMMENT ON COLUMN public.users.last_name IS 'Nom (saisie client)';
