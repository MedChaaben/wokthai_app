-- Historique des statuts (timeline client / staff)

CREATE TABLE public.order_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_status_events_order_id_created_at_idx
  ON public.order_status_events (order_id, created_at ASC);

-- Commandes déjà en base : un point (statut et date de création de la commande)
INSERT INTO public.order_status_events (order_id, status, created_at)
SELECT id, status, created_at FROM public.orders;

CREATE OR REPLACE FUNCTION public.log_order_status_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_status_events (order_id, status, created_at)
  VALUES (NEW.id, NEW.status, NEW.created_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_log_status_after_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_on_insert();

CREATE OR REPLACE FUNCTION public.log_order_status_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_events (order_id, status, created_at)
    VALUES (NEW.id, NEW.status, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_log_status_after_update
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_on_update();

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_status_events_select_customer ON public.order_status_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

CREATE POLICY order_status_events_select_staff ON public.order_status_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND public.is_staff() AND o.store_id = public.staff_store_id()
  )
);
