-- WokThai — schéma initial Supabase (PostgreSQL)
-- Exécuter via Supabase CLI ou SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Types énumérés
CREATE TYPE public.order_type AS ENUM ('delivery', 'pickup');
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'cancelled'
);
CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid_on_delivery');

-- Clients (profil lié à auth.users — téléphone)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adresses de livraison
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Tunis', 'Ariana')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX addresses_user_id_idx ON public.addresses (user_id);

-- Magasins
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Tunis', 'Ariana')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  prep_time_minutes INT NOT NULL DEFAULT 30
);

CREATE INDEX stores_active_idx ON public.stores (is_active) WHERE is_active = true;

-- Personnel (email/password Supabase Auth)
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT
);

CREATE INDEX staff_user_id_idx ON public.staff (user_id);
CREATE INDEX staff_store_id_idx ON public.staff (store_id);

-- Catégories menu
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX categories_position_idx ON public.categories (position);

-- Produits
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category_id UUID NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX products_category_id_idx ON public.products (category_id);
CREATE INDEX products_available_idx ON public.products (is_available);

-- Zones de livraison par magasin
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL CHECK (city IN ('Tunis', 'Ariana')),
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0)
);

CREATE UNIQUE INDEX delivery_zones_store_city_uniq ON public.delivery_zones (store_id, city);

-- Chauffeurs (futur — pas de logique métier)
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Commandes
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  type public.order_type NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  address_id UUID REFERENCES public.addresses (id) ON DELETE SET NULL,
  delivery_notes TEXT,
  estimated_delivery_time TIMESTAMPTZ,
  driver_id UUID REFERENCES public.drivers (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_id_idx ON public.orders (user_id);
CREATE INDEX orders_store_id_idx ON public.orders (store_id);
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);

-- Lignes de commande
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);

-- Realtime : identité complète pour les payloads de mise à jour
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Realtime : publication des commandes (ré-exécution : ignorer si déjà dans la publication)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Storage : bucket images produits (création + politiques)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Profil client à la création du compte Auth (OTP téléphone)
CREATE OR REPLACE FUNCTION public.handle_new_customer_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    INSERT INTO public.users (id, phone)
    VALUES (NEW.id, NEW.phone)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer_user();

-- Mise à jour du téléphone si modifié dans auth
CREATE OR REPLACE FUNCTION public.handle_auth_user_phone_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.phone IS NOT NULL THEN
    UPDATE public.users SET phone = NEW.phone WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated_phone ON auth.users;
CREATE TRIGGER on_auth_user_updated_phone
  AFTER UPDATE OF phone ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_phone_update();

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Helpers JWT
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff s WHERE s.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.staff_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (SELECT s.store_id FROM public.staff s WHERE s.user_id = auth.uid() LIMIT 1);
$$;

-- users
CREATE POLICY users_select_own ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY users_insert_own ON public.users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY users_update_own ON public.users FOR UPDATE USING (id = auth.uid());

-- addresses
CREATE POLICY addresses_select_own ON public.addresses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY addresses_insert_own ON public.addresses FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY addresses_update_own ON public.addresses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY addresses_delete_own ON public.addresses FOR DELETE USING (user_id = auth.uid());

-- stores : lecture publique (menu / checkout), staff voit tout
CREATE POLICY stores_select_public ON public.stores FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY stores_all_staff ON public.stores FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- staff : chaque membre lit sa ligne
CREATE POLICY staff_select_self ON public.staff FOR SELECT USING (user_id = auth.uid());

-- categories / products : lecture publique pour catalogue
CREATE POLICY categories_select_public ON public.categories FOR SELECT USING (true);
CREATE POLICY categories_staff_write ON public.categories FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY products_select_public ON public.products FOR SELECT USING (true);
CREATE POLICY products_staff_write ON public.products FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- delivery_zones : lecture pour clients authentifiés (checkout), écriture staff
CREATE POLICY delivery_zones_select_auth ON public.delivery_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY delivery_zones_staff_write ON public.delivery_zones FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- drivers : staff uniquement (futur)
CREATE POLICY drivers_staff ON public.drivers FOR SELECT USING (public.is_staff());

-- orders : client = ses commandes ; staff = magasin assigné
CREATE POLICY orders_select_customer ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY orders_select_staff_store ON public.orders FOR SELECT USING (
  public.is_staff() AND store_id = public.staff_store_id()
);
CREATE POLICY orders_insert_customer ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY orders_update_staff_store ON public.orders FOR UPDATE USING (
  public.is_staff() AND store_id = public.staff_store_id()
);

-- order_items : via commande parente
CREATE POLICY order_items_select_customer ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY order_items_select_staff ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND public.is_staff() AND o.store_id = public.staff_store_id()
  )
);
CREATE POLICY order_items_insert_customer ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- Storage RLS product-images
CREATE POLICY product_images_public_read ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY product_images_staff_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'product-images' AND public.is_staff()
);
CREATE POLICY product_images_staff_update ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'product-images' AND public.is_staff()
);
CREATE POLICY product_images_staff_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'product-images' AND public.is_staff()
);

-- Données initiales : 2 magasins + zones (Tunis / Ariana)
INSERT INTO public.stores (id, name, address, city, lat, lng, is_active, prep_time_minutes)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'WokThai Tunis Centre',
    'Avenue Habib Bourguiba, Tunis',
    'Tunis',
    36.8065,
    10.1815,
    true,
    25
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'WokThai Ariana',
    'Ariana Ville, Ariana',
    'Ariana',
    36.8601,
    10.1933,
    true,
    30
  )
ON CONFLICT (id) DO NOTHING;

-- Zones : frais par ville par magasin (logique simple)
INSERT INTO public.delivery_zones (store_id, name, city, delivery_fee)
VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Livraison Tunis', 'Tunis', 5.00),
  ('a0000000-0000-4000-8000-000000000001', 'Livraison Ariana', 'Ariana', 7.00),
  ('a0000000-0000-4000-8000-000000000002', 'Livraison Tunis', 'Tunis', 6.00),
  ('a0000000-0000-4000-8000-000000000002', 'Livraison Ariana', 'Ariana', 5.00)
ON CONFLICT (store_id, city) DO NOTHING;

-- Catégories / produits exemple (optionnel)
INSERT INTO public.categories (id, name, position)
VALUES
  ('b0000000-0000-4000-8000-000000000001', 'Woks', 1),
  ('b0000000-0000-4000-8000-000000000002', 'Entrées', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, description, price, category_id, is_available, position)
VALUES
  (
    'c0000000-0000-4000-8000-000000000001',
    'Pad Thai',
    'Nouilles de riz, cacahuètes, citron vert',
    18.50,
    'b0000000-0000-4000-8000-000000000001',
    true,
    1
  ),
  (
    'c0000000-0000-4000-8000-000000000002',
    'Nems aux légumes',
    '6 pièces, sauce aigre-douce',
    9.00,
    'b0000000-0000-4000-8000-000000000002',
    true,
    1
  )
ON CONFLICT (id) DO NOTHING;
