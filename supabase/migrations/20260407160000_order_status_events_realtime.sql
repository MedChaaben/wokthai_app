-- Realtime : nouvelles lignes d’historique (invalidation cache / flux activité client)
DO $wt$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'order_status_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_events;
  END IF;
END;
$wt$;
