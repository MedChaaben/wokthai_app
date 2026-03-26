-- Statut intermédiaire : commande en route vers le client (livraison)
ALTER TYPE public.order_status ADD VALUE 'delivering' BEFORE 'delivered';
