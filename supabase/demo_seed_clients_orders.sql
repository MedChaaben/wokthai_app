-- =============================================================================
-- WokThai — données de DÉMO (clients + commandes + événements analytics)
-- =============================================================================
-- À exécuter manuellement dans le SQL Editor Supabase (rôle postgres / service).
--
-- Prérequis :
--   - Extensions : pgcrypto (déjà présent sur les projets Supabase classiques)
--   - Catalogue : magasins, produits, zones de livraison déjà en base (inchangés)
--
-- Ce script :
--   1) Supprime une éventuelle exécution précédente (emails @wokthai-demo.local + invités +216991…)
--   2) Crée ~12 clients tunisiens (auth + profil + adresses)
--   3) Génère ~85 commandes réalistes sur ~45 jours + lignes + options obligatoires
--   4) Insère des lignes dans public.events pour enrichir les funnels / conversions
--
-- Mot de passe auth (tous les comptes démo) : DemoWok2026!
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Nettoyage re-jouable
-- ---------------------------------------------------------------------------
DELETE FROM public.events e
WHERE e.user_id IN (SELECT u.id FROM public.users u WHERE u.email LIKE '%@wokthai-demo.local');

DELETE FROM public.events
WHERE metadata ? 'demo_seed';

DELETE FROM public.order_status_events
WHERE order_id IN (
  SELECT o.id
  FROM public.orders o
  WHERE o.user_id IN (SELECT u.id FROM public.users u WHERE u.email LIKE '%@wokthai-demo.local')
     OR (o.user_id IS NULL AND o.guest_phone LIKE '+216991%')
);

DELETE FROM public.order_item_options
WHERE order_item_id IN (
  SELECT oi.id
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.user_id IN (SELECT u.id FROM public.users u WHERE u.email LIKE '%@wokthai-demo.local')
     OR (o.user_id IS NULL AND o.guest_phone LIKE '+216991%')
);

DELETE FROM public.order_items
WHERE order_id IN (
  SELECT o.id
  FROM public.orders o
  WHERE o.user_id IN (SELECT u.id FROM public.users u WHERE u.email LIKE '%@wokthai-demo.local')
     OR (o.user_id IS NULL AND o.guest_phone LIKE '+216991%')
);

DELETE FROM public.orders
WHERE user_id IN (SELECT u.id FROM public.users u WHERE u.email LIKE '%@wokthai-demo.local')
   OR (user_id IS NULL AND guest_phone LIKE '+216991%');

DELETE FROM public.addresses
WHERE user_id IN (SELECT u.id FROM public.users u WHERE u.email LIKE '%@wokthai-demo.local');

DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@wokthai-demo.local');

DELETE FROM auth.users
WHERE email LIKE '%@wokthai-demo.local';

-- ---------------------------------------------------------------------------
-- Comptes auth + profils clients (noms tunisiens, téléphones uniques)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_instance uuid;
BEGIN
  SELECT id INTO v_instance FROM auth.instances LIMIT 1;
  IF v_instance IS NULL THEN
    v_instance := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES
    (
      'f0d10000-0000-4000-8000-000000000001',
      v_instance,
      'authenticated',
      'authenticated',
      'ines.trabelsi@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000002',
      v_instance,
      'authenticated',
      'authenticated',
      'mehdi.jlassi@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000003',
      v_instance,
      'authenticated',
      'authenticated',
      'amira.benammar@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000004',
      v_instance,
      'authenticated',
      'authenticated',
      'karim.gharbi@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000005',
      v_instance,
      'authenticated',
      'authenticated',
      'salma.bouazizi@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000006',
      v_instance,
      'authenticated',
      'authenticated',
      'youssef.kraiem@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000007',
      v_instance,
      'authenticated',
      'authenticated',
      'leila.mabrouk@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000008',
      v_instance,
      'authenticated',
      'authenticated',
      'hichem.hadjali@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-000000000009',
      v_instance,
      'authenticated',
      'authenticated',
      'fatma.sassi@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-00000000000a',
      v_instance,
      'authenticated',
      'authenticated',
      'oussama.dhouib@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-00000000000b',
      v_instance,
      'authenticated',
      'authenticated',
      'nour.miled@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ),
    (
      'f0d10000-0000-4000-8000-00000000000c',
      v_instance,
      'authenticated',
      'authenticated',
      'aymen.dridi@wokthai-demo.local',
      extensions.crypt('DemoWok2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000001', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000001', 'email', 'ines.trabelsi@wokthai-demo.local', 'email_verified', true), 'email', 'ines.trabelsi@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000002', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000002', 'email', 'mehdi.jlassi@wokthai-demo.local', 'email_verified', true), 'email', 'mehdi.jlassi@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000003', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000003', 'email', 'amira.benammar@wokthai-demo.local', 'email_verified', true), 'email', 'amira.benammar@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000004', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000004', 'email', 'karim.gharbi@wokthai-demo.local', 'email_verified', true), 'email', 'karim.gharbi@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000005', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000005', 'email', 'salma.bouazizi@wokthai-demo.local', 'email_verified', true), 'email', 'salma.bouazizi@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000006', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000006', 'email', 'youssef.kraiem@wokthai-demo.local', 'email_verified', true), 'email', 'youssef.kraiem@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000007', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000007', 'email', 'leila.mabrouk@wokthai-demo.local', 'email_verified', true), 'email', 'leila.mabrouk@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000008', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000008', 'email', 'hichem.hadjali@wokthai-demo.local', 'email_verified', true), 'email', 'hichem.hadjali@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-000000000009', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-000000000009', 'email', 'fatma.sassi@wokthai-demo.local', 'email_verified', true), 'email', 'fatma.sassi@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-00000000000a', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-00000000000a', 'email', 'oussama.dhouib@wokthai-demo.local', 'email_verified', true), 'email', 'oussama.dhouib@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-00000000000b', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-00000000000b', 'email', 'nour.miled@wokthai-demo.local', 'email_verified', true), 'email', 'nour.miled@wokthai-demo.local', now(), now(), now()),
    (gen_random_uuid(), 'f0d10000-0000-4000-8000-00000000000c', jsonb_build_object('sub', 'f0d10000-0000-4000-8000-00000000000c', 'email', 'aymen.dridi@wokthai-demo.local', 'email_verified', true), 'email', 'aymen.dridi@wokthai-demo.local', now(), now(), now());
END $$;

-- Le trigger auth crée déjà public.users (email) ; on enrichit prénom / nom / téléphone / fidélité / promo
UPDATE public.users SET
  first_name = v.first_name,
  last_name = v.last_name,
  phone = v.phone,
  loyalty_points = v.loyalty_points,
  promo_used = v.promo_used
FROM (VALUES
  ('f0d10000-0000-4000-8000-000000000001', 'Inès', 'Trabelsi', '+21620123001', 120, false),
  ('f0d10000-0000-4000-8000-000000000002', 'Mehdi', 'Jlassi', '+21620123002', 45, true),
  ('f0d10000-0000-4000-8000-000000000003', 'Amira', 'Ben Ammar', '+21621123003', 200, false),
  ('f0d10000-0000-4000-8000-000000000004', 'Karim', 'Gharbi', '+21622123004', 0, true),
  ('f0d10000-0000-4000-8000-000000000005', 'Salma', 'Bouazizi', '+21623123005', 340, false),
  ('f0d10000-0000-4000-8000-000000000006', 'Youssef', 'Kraiem', '+21624123006', 15, false),
  ('f0d10000-0000-4000-8000-000000000007', 'Leïla', 'Mabrouk', '+21625123007', 89, true),
  ('f0d10000-0000-4000-8000-000000000008', 'Hichem', 'Hadj Ali', '+21626123008', 56, false),
  ('f0d10000-0000-4000-8000-000000000009', 'Fatma', 'Sassi', '+21627123009', 410, false),
  ('f0d10000-0000-4000-8000-00000000000a', 'Oussama', 'Dhouib', '+21628123010', 12, false),
  ('f0d10000-0000-4000-8000-00000000000b', 'Nour El Houda', 'Miled', '+21629123011', 175, false),
  ('f0d10000-0000-4000-8000-00000000000c', 'Aymen', 'Dridi', '+21630123012', 62, true)
) AS v(id, first_name, last_name, phone, loyalty_points, promo_used)
WHERE public.users.id = v.id::uuid;

-- Adresses (Tunis / Ariana) — une adresse « maison » + parfois « bureau » pour quelques clients
INSERT INTO public.addresses (id, user_id, label, address, city, lat, lng, instructions)
VALUES
  ('f0d20000-0000-4000-8000-000000000001', 'f0d10000-0000-4000-8000-000000000001', 'Domicile', 'Rue d’Espagne, Lafayette', 'Tunis', 36.8065, 10.1815, 'Interphone 3B'),
  ('f0d20000-0000-4000-8000-000000000002', 'f0d10000-0000-4000-8000-000000000002', 'Maison', 'Rue du Lac Biwa, Les Berges du Lac', 'Tunis', 36.8480, 10.2420, NULL),
  ('f0d20000-0000-4000-8000-000000000003', 'f0d10000-0000-4000-8000-000000000003', 'Domicile', 'Avenue Habib Bourguiba', 'Tunis', 36.7990, 10.1650, NULL),
  ('f0d20000-0000-4000-8000-000000000004', 'f0d10000-0000-4000-8000-000000000004', 'Maison', 'Rue de la République, Ariana Ville', 'Ariana', 36.8601, 10.1933, 'Portail bleu'),
  ('f0d20000-0000-4000-8000-000000000005', 'f0d10000-0000-4000-8000-000000000005', 'Domicile', 'Cité El Khadra', 'Tunis', 36.8250, 10.1550, NULL),
  ('f0d20000-0000-4000-8000-000000000006', 'f0d10000-0000-4000-8000-000000000006', 'Bureau', 'Centre urbain nord', 'Tunis', 36.8380, 10.2280, 'Accueil 2e étage'),
  ('f0d20000-0000-4000-8000-000000000007', 'f0d10000-0000-4000-8000-000000000007', 'Maison', 'Rue de l’Indépendance, Ariana', 'Ariana', 36.8580, 10.1900, NULL),
  ('f0d20000-0000-4000-8000-000000000008', 'f0d10000-0000-4000-8000-000000000008', 'Domicile', 'Mutuelleville', 'Tunis', 36.8180, 10.1680, NULL),
  ('f0d20000-0000-4000-8000-000000000009', 'f0d10000-0000-4000-8000-000000000009', 'Maison', 'Ennasr 2', 'Ariana', 36.8650, 10.1680, 'Immeuble B7'),
  ('f0d20000-0000-4000-8000-00000000000a', 'f0d10000-0000-4000-8000-00000000000a', 'Domicile', 'Le Bardo', 'Tunis', 36.8100, 10.1400, NULL),
  ('f0d20000-0000-4000-8000-00000000000b', 'f0d10000-0000-4000-8000-00000000000b', 'Maison', 'Jardins d’El Menzah', 'Tunis', 36.8300, 10.1750, NULL),
  ('f0d20000-0000-4000-8000-00000000000c', 'f0d10000-0000-4000-8000-00000000000c', 'Domicile', 'Riadh Landalous', 'Ariana', 36.8620, 10.1150, NULL);

-- ---------------------------------------------------------------------------
-- Génération commandes + lignes (à partir des vrais produits / magasins / zones)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_uid uuid;
  v_store uuid;
  v_addr uuid;
  v_city text;
  v_order_id uuid;
  v_item_id uuid;
  v_type public.order_type;
  v_status public.order_status;
  v_fee numeric(10, 2);
  v_subtotal numeric(10, 2);
  v_total numeric(10, 2);
  v_lines int;
  v_i int;
  v_pid uuid;
  v_qty int;
  v_base numeric(10, 2);
  v_unit numeric(10, 2);
  v_oname text;
  v_omod numeric(10, 2);
  v_g record;
  v_created timestamptz;
  v_r float;
  v_guest_n int := 1;
  v_demo_uuids uuid[] := ARRAY[
    'f0d10000-0000-4000-8000-000000000001'::uuid,
    'f0d10000-0000-4000-8000-000000000002'::uuid,
    'f0d10000-0000-4000-8000-000000000003'::uuid,
    'f0d10000-0000-4000-8000-000000000004'::uuid,
    'f0d10000-0000-4000-8000-000000000005'::uuid,
    'f0d10000-0000-4000-8000-000000000006'::uuid,
    'f0d10000-0000-4000-8000-000000000007'::uuid,
    'f0d10000-0000-4000-8000-000000000008'::uuid,
    'f0d10000-0000-4000-8000-000000000009'::uuid,
    'f0d10000-0000-4000-8000-00000000000a'::uuid,
    'f0d10000-0000-4000-8000-00000000000b'::uuid,
    'f0d10000-0000-4000-8000-00000000000c'::uuid
  ];
  v_addr_ids uuid[] := ARRAY[
    'f0d20000-0000-4000-8000-000000000001'::uuid,
    'f0d20000-0000-4000-8000-000000000002'::uuid,
    'f0d20000-0000-4000-8000-000000000003'::uuid,
    'f0d20000-0000-4000-8000-000000000004'::uuid,
    'f0d20000-0000-4000-8000-000000000005'::uuid,
    'f0d20000-0000-4000-8000-000000000006'::uuid,
    'f0d20000-0000-4000-8000-000000000007'::uuid,
    'f0d20000-0000-4000-8000-000000000008'::uuid,
    'f0d20000-0000-4000-8000-000000000009'::uuid,
    'f0d20000-0000-4000-8000-00000000000a'::uuid,
    'f0d20000-0000-4000-8000-00000000000b'::uuid,
    'f0d20000-0000-4000-8000-00000000000c'::uuid
  ];
  v_has_upsell boolean;
  v_pick int;
  v_ord int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE is_available = true LIMIT 1) THEN
    RAISE EXCEPTION 'Aucun produit disponible : remplis le catalogue avant ce script.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE is_active = true LIMIT 1) THEN
    RAISE EXCEPTION 'Aucun magasin actif.';
  END IF;

  FOR v_ord IN 1..88 LOOP
    v_created := now() - (floor(random() * 45) || ' days')::interval
                     - (floor(random() * 86400) || ' seconds')::interval;

    v_r := random();
    IF v_r < 0.14 THEN
      v_type := 'pickup';
    ELSE
      v_type := 'delivery';
    END IF;

    -- Statut réaliste (majorité livrée / terminée)
    v_r := random();
    IF v_r < 0.62 THEN
      v_status := 'delivered';
    ELSIF v_r < 0.70 THEN
      v_status := 'cancelled';
    ELSIF v_r < 0.78 THEN
      v_status := 'pending';
    ELSIF v_r < 0.86 THEN
      v_status := 'confirmed';
    ELSIF v_r < 0.92 THEN
      v_status := 'preparing';
    ELSIF v_r < 0.96 THEN
      v_status := 'ready';
    ELSE
      v_status := 'delivering';
    END IF;

    v_has_upsell := random() < 0.32;

    -- ~18 % commandes invitées (téléphone +216991xxxxx)
    IF random() < 0.18 THEN
      v_uid := NULL;
      SELECT id INTO v_store FROM public.stores WHERE is_active = true ORDER BY random() LIMIT 1;
      IF v_type = 'delivery' THEN
        INSERT INTO public.orders (
          user_id, store_id, type, status, payment_status, total_price,
          address_id, delivery_notes, guest_phone,
          guest_delivery_label, guest_delivery_address, guest_delivery_city, guest_lat, guest_lng,
          delivery_promo, loyalty_points_credited, source, has_upsell, created_at
        ) VALUES (
          NULL, v_store, 'delivery', v_status, 'paid_on_delivery', 0,
          NULL, CASE WHEN random() < 0.4 THEN 'Sonner 2 fois' ELSE NULL END,
          '+216991' || lpad((v_guest_n % 10000)::text, 4, '0'),
          'Livraison invité',
          'Rue de la Liberté, ' || CASE WHEN random() < 0.5 THEN 'Tunis' ELSE 'Ariana' END,
          CASE WHEN random() < 0.5 THEN 'Tunis' ELSE 'Ariana' END,
          36.80 + random() * 0.06,
          10.15 + random() * 0.10,
          NULL, false, 'app', v_has_upsell, v_created
        ) RETURNING id INTO v_order_id;
      ELSE
        INSERT INTO public.orders (
          user_id, store_id, type, status, payment_status, total_price,
          address_id, delivery_notes, guest_phone,
          guest_delivery_label, guest_delivery_address, guest_delivery_city, guest_lat, guest_lng,
          delivery_promo, loyalty_points_credited, source, has_upsell, created_at
        ) VALUES (
          NULL, v_store, 'pickup', v_status, 'paid_on_delivery', 0,
          NULL, NULL,
          '+216991' || lpad((v_guest_n % 10000)::text, 4, '0'),
          NULL, NULL, NULL, NULL, NULL,
          NULL, false, 'app', v_has_upsell, v_created
        ) RETURNING id INTO v_order_id;
      END IF;
      v_guest_n := v_guest_n + 1;
    ELSE
      v_pick := 1 + floor(random() * array_length(v_demo_uuids, 1))::int;
      v_uid := v_demo_uuids[v_pick];
      v_addr := v_addr_ids[v_pick];
      SELECT city INTO v_city FROM public.addresses WHERE id = v_addr;
      SELECT s.id INTO v_store
      FROM public.stores s
      WHERE s.is_active = true
        AND EXISTS (
          SELECT 1 FROM public.delivery_zones dz
          WHERE dz.store_id = s.id AND dz.city = v_city
        )
      ORDER BY random()
      LIMIT 1;
      IF v_store IS NULL THEN
        SELECT id INTO v_store FROM public.stores WHERE is_active = true ORDER BY random() LIMIT 1;
      END IF;

      IF v_type = 'delivery' THEN
        SELECT dz.delivery_fee::numeric INTO v_fee
        FROM public.delivery_zones dz
        WHERE dz.store_id = v_store AND dz.city = v_city
        LIMIT 1;
        v_fee := coalesce(v_fee, 6.00);
        INSERT INTO public.orders (
          user_id, store_id, type, status, payment_status, total_price,
          address_id, delivery_notes,
          guest_phone, guest_delivery_label, guest_delivery_address, guest_delivery_city, guest_lat, guest_lng,
          delivery_promo, loyalty_points_credited, source, has_upsell, created_at
        ) VALUES (
          v_uid, v_store, 'delivery', v_status, 'paid_on_delivery', 0,
          v_addr,
          CASE WHEN random() < 0.35 THEN 'Merci de laisser devant la porte' ELSE NULL END,
          NULL, NULL, NULL, NULL, NULL, NULL,
          CASE WHEN random() < 0.08 THEN 'first_order_free' ELSE NULL END,
          false, 'app', v_has_upsell, v_created
        ) RETURNING id INTO v_order_id;
      ELSE
        INSERT INTO public.orders (
          user_id, store_id, type, status, payment_status, total_price,
          address_id, delivery_notes,
          guest_phone, guest_delivery_label, guest_delivery_address, guest_delivery_city, guest_lat, guest_lng,
          delivery_promo, loyalty_points_credited, source, has_upsell, created_at
        ) VALUES (
          v_uid, v_store, 'pickup', v_status, 'paid_on_delivery', 0,
          NULL, NULL,
          NULL, NULL, NULL, NULL, NULL, NULL,
          NULL, false, 'app', v_has_upsell, v_created
        ) RETURNING id INTO v_order_id;
      END IF;
    END IF;

    v_subtotal := 0;
    v_lines := 1 + floor(random() * 3.5)::int;

    FOR v_i IN 1..v_lines LOOP
      SELECT p.id, p.price::numeric
      INTO v_pid, v_base
      FROM public.products p
      WHERE p.is_available = true
      ORDER BY random()
      LIMIT 1;

      v_qty := 1 + floor(random() * 2.2)::int;
      IF random() < 0.12 THEN
        v_qty := v_qty + 1;
      END IF;

      v_unit := v_base;

      INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
      VALUES (v_order_id, v_pid, v_qty, v_base)
      RETURNING id INTO v_item_id;

      FOR v_g IN
        SELECT g.id AS gid
        FROM public.product_option_groups g
        WHERE g.product_id = v_pid AND g.required = true
        ORDER BY g.position
      LOOP
        SELECT po.name, po.price_modifier::numeric
        INTO v_oname, v_omod
        FROM public.product_options po
        WHERE po.group_id = v_g.gid
        ORDER BY po.position
        LIMIT 1;

        INSERT INTO public.order_item_options (order_item_id, option_name, price_modifier)
        VALUES (v_item_id, v_oname, v_omod);

        v_unit := v_unit + coalesce(v_omod, 0);
      END LOOP;

      -- Au plus une option facultative (supplément, etc.)
      IF random() < 0.26 THEN
        SELECT po.name, po.price_modifier::numeric
        INTO v_oname, v_omod
        FROM public.product_option_groups g
        INNER JOIN public.product_options po ON po.group_id = g.id
        WHERE g.product_id = v_pid AND g.required = false
        ORDER BY random()
        LIMIT 1;
        IF FOUND THEN
          INSERT INTO public.order_item_options (order_item_id, option_name, price_modifier)
          VALUES (v_item_id, v_oname, v_omod);
          v_unit := v_unit + coalesce(v_omod, 0);
        END IF;
      END IF;

      UPDATE public.order_items SET unit_price = v_unit WHERE id = v_item_id;
      v_subtotal := v_subtotal + v_unit * v_qty;
    END LOOP;

    IF v_type = 'delivery' AND v_uid IS NOT NULL THEN
      SELECT dz.delivery_fee::numeric INTO v_fee
      FROM public.delivery_zones dz
      JOIN public.addresses a ON a.id = (
        SELECT address_id FROM public.orders WHERE id = v_order_id
      )
      WHERE dz.store_id = v_store AND dz.city = a.city
      LIMIT 1;
      v_fee := coalesce(v_fee, 6.00);
      IF EXISTS (SELECT 1 FROM public.orders WHERE id = v_order_id AND delivery_promo = 'first_order_free') THEN
        v_fee := 0;
      END IF;
      v_total := v_subtotal + v_fee;
    ELSIF v_type = 'delivery' AND v_uid IS NULL THEN
      SELECT dz.delivery_fee::numeric INTO v_fee
      FROM public.delivery_zones dz
      JOIN public.orders o ON o.id = v_order_id
      WHERE dz.store_id = v_store AND dz.city = o.guest_delivery_city::text
      LIMIT 1;
      v_fee := coalesce(v_fee, 6.00);
      v_total := v_subtotal + v_fee;
    ELSE
      v_total := v_subtotal;
    END IF;

    UPDATE public.orders SET total_price = round(v_total, 2) WHERE id = v_order_id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Événements analytics (funnel + volume)
-- ---------------------------------------------------------------------------
INSERT INTO public.events (user_id, event_name, metadata, created_at)
SELECT
  u.id,
  e.name,
  jsonb_build_object(
    'demo_seed', true,
    'device_id', 'demo_device_' || substr(md5(u.id::text), 1, 8)
  ),
  now() - (random() * 35 + g)::double precision * interval '1 day'
FROM public.users u
CROSS JOIN generate_series(1, 28) AS g
CROSS JOIN LATERAL (
  VALUES
    ('app_open'),
    ('view_product'),
    ('view_product'),
    ('add_to_cart'),
    ('checkout_start')
) AS e(name)
WHERE u.email LIKE '%@wokthai-demo.local';

INSERT INTO public.events (user_id, event_name, metadata, created_at)
SELECT
  o.user_id,
  'order_completed',
  jsonb_build_object(
    'demo_seed', true,
    'order_id', o.id,
    'total_price', o.total_price,
    'store_id', o.store_id
  ),
  o.created_at + interval '45 seconds'
FROM public.orders o
WHERE o.user_id IS NOT NULL
  AND o.status <> 'cancelled'
  AND o.source = 'app'
  AND o.user_id IN (SELECT u.id FROM public.users u WHERE u.email LIKE '%@wokthai-demo.local');

INSERT INTO public.events (user_id, event_name, metadata, created_at)
SELECT
  NULL,
  ev,
  jsonb_build_object('demo_seed', true, 'guest', true),
  now() - (random() * 20 || ' days')::interval
FROM generate_series(1, 120) g
CROSS JOIN LATERAL (
  SELECT (ARRAY['app_open', 'view_product', 'add_to_cart', 'checkout_start'])[1 + floor(random() * 4)::int]
) AS x(ev);

INSERT INTO public.events (user_id, event_name, metadata, created_at)
SELECT
  u.id,
  'upsell_view',
  jsonb_build_object('demo_seed', true, 'candidate_count', 2 + floor(random() * 3)::int),
  now() - (random() * 14 || ' days')::interval
FROM public.users u
CROSS JOIN generate_series(1, 5) AS _gs
WHERE u.email LIKE '%@wokthai-demo.local';

INSERT INTO public.events (user_id, event_name, metadata, created_at)
SELECT
  u.id,
  'upsell_add',
  jsonb_build_object(
    'demo_seed', true,
    'product_id', x.pid,
    'price', x.pr
  ),
  now() - (random() * 14 || ' days')::interval
FROM public.users u
CROSS JOIN generate_series(1, 3) AS gs
CROSS JOIN LATERAL (
  SELECT
    p.id::text AS pid,
    round(p.price::numeric + (random() * 2.5)::numeric, 2) AS pr
  FROM public.products p
  WHERE p.is_available = true
  ORDER BY random()
  LIMIT 1
) AS x
WHERE u.email LIKE '%@wokthai-demo.local';

COMMIT;

-- Vérifications rapides (optionnel)
-- SELECT count(*) FROM public.orders WHERE source = 'app';
-- SELECT avg(total_price) FROM public.orders WHERE status <> 'cancelled';
-- SELECT event_name, count(*) FROM public.events GROUP BY 1 ORDER BY 2 DESC;
