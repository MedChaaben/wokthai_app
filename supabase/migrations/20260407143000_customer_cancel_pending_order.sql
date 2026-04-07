-- Autoriser le client a annuler sa propre commande tant qu'elle est en attente.

DROP POLICY IF EXISTS orders_update_customer_pending_cancel ON public.orders;

CREATE POLICY orders_update_customer_pending_cancel ON public.orders
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'cancelled'
  );
