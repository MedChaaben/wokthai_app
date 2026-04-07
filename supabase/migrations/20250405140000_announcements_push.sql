-- Annonces globales (bandeau app + push optionnel) et jetons Expo sur profils clients

DO $wt_ann_type$
BEGIN
  CREATE TYPE public.announcement_type AS ENUM ('info', 'warning', 'promo', 'important');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$wt_ann_type$;

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  send_push BOOLEAN NOT NULL DEFAULT false,
  type public.announcement_type NOT NULL DEFAULT 'info',
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  push_last_sent_at TIMESTAMPTZ
);

COMMENT ON TABLE public.announcements IS 'Annonces siège : bandeau mobile + envoi push optionnel (Edge Function).';

CREATE INDEX announcements_created_at_idx ON public.announcements (created_at DESC);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
  ADD COLUMN IF NOT EXISTS expo_push_token_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.expo_push_token IS 'Jeton Expo Push (clients connectés), pour notifications globales.';

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Lecture publique : annonces actives dans la fenêtre de dates
CREATE POLICY announcements_select_active_window ON public.announcements
  FOR SELECT
  USING (
    is_active = true
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );

-- Admin siège : lecture de toutes les lignes (brouillons, historique)
CREATE POLICY announcements_select_platform_admin ON public.announcements
  FOR SELECT TO authenticated
  USING (public.is_platform_admin());

CREATE POLICY announcements_insert_platform_admin ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

CREATE POLICY announcements_update_platform_admin ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY announcements_delete_platform_admin ON public.announcements
  FOR DELETE TO authenticated
  USING (public.is_platform_admin());

ALTER TABLE public.announcements REPLICA IDENTITY FULL;

DO $wt_realtime_ann$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'announcements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  END IF;
END
$wt_realtime_ann$;
