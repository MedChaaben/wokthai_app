-- Profil client : email en plus du téléphone (auth email/mot de passe mobile)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.users.email IS 'Email auth (clients), en doublon pratique avec auth.users';

CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p TEXT;
  em TEXT;
BEGIN
  p := NULLIF(trim(COALESCE(NEW.phone, '')), '');
  em := NULLIF(lower(trim(COALESCE(NEW.email, ''))), '');
  IF p IS NOT NULL OR em IS NOT NULL THEN
    INSERT INTO public.users (id, phone, email)
    VALUES (NEW.id, p, em)
    ON CONFLICT (id) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, public.users.phone),
      email = COALESCE(EXCLUDED.email, public.users.email);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_auth_user_identity_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.phone IS NOT NULL AND trim(NEW.phone) <> '' THEN
    UPDATE public.users SET phone = trim(NEW.phone) WHERE id = NEW.id;
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS NOT NULL AND trim(NEW.email) <> '' THEN
    UPDATE public.users SET email = lower(trim(NEW.email)) WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated_phone ON auth.users;
CREATE TRIGGER on_auth_user_updated_identity
  AFTER UPDATE OF phone, email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_identity_update();
