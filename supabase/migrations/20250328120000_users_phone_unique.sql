-- Téléphone client : identifiant métier unique (un numéro = un compte public.users).
-- Sans « + » ni « 00 » en tête : interprétation **tunisienne** (0… / 8 chiffres / 216…).
-- Avec **+** ou **00…** : international ; indicatif ≠ 216 → clé = chiffres (E.164 sans le +).
-- +216 ou 00216… : même clé qu’un numéro TN national normalisé.

CREATE OR REPLACE FUNCTION public.normalize_customer_phone(p TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw TEXT;
  d TEXT;
  intl BOOLEAN;
BEGIN
  IF p IS NULL THEN
    RETURN NULL;
  END IF;
  raw := trim(p);
  IF raw = '' THEN
    RETURN NULL;
  END IF;
  intl := strpos(raw, '+') > 0 OR raw LIKE '00%';
  d := regexp_replace(raw, '[^\d]', '', 'g');
  IF d = '' OR d IS NULL THEN
    RETURN NULL;
  END IF;

  IF intl THEN
    IF left(d, 2) = '00' THEN
      d := substring(d FROM 3);
    END IF;
    IF d = '' OR d IS NULL THEN
      RETURN NULL;
    END IF;
    IF left(d, 3) = '216' THEN
      RETURN d;
    END IF;
    RETURN d;
  END IF;

  IF length(d) >= 11 AND left(d, 3) = '216' THEN
    RETURN d;
  END IF;
  IF length(d) = 9 AND substring(d, 1, 1) = '0' THEN
    RETURN '216' || substring(d FROM 2);
  END IF;
  IF length(d) = 8 THEN
    RETURN '216' || d;
  END IF;
  RETURN d;
END;
$$;

COMMENT ON FUNCTION public.normalize_customer_phone(TEXT) IS
  'Clé d’unicité téléphone : TN par défaut sans +/00 ; sinon forme internationale (chiffres, 00 une fois retiré).';

DO $$
DECLARE
  dupes INT;
BEGIN
  SELECT count(*)::INT INTO dupes
  FROM (
    SELECT public.normalize_customer_phone(phone) AS k
    FROM public.users
    WHERE public.normalize_customer_phone(phone) IS NOT NULL
    GROUP BY 1
    HAVING count(*) > 1
  ) sub;
  IF dupes > 0 THEN
    RAISE EXCEPTION
      'Migration impossible : % groupe(s) de numéros normalisés en double dans public.users. Fusionnez ou corrigez les lignes avant de relancer.',
      dupes;
  END IF;
END;
$$;

CREATE UNIQUE INDEX users_phone_normalized_uniq
  ON public.users (public.normalize_customer_phone(phone))
  WHERE public.normalize_customer_phone(phone) IS NOT NULL;
