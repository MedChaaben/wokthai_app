import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';

/** Client : écoute les mises à jour d’une commande précise (filtrée côté Realtime). */
export function useOrderRealtime(orderId: string | null | undefined) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

    const invalidateOrder = () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    };

    const channel = client
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        invalidateOrder
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_events',
          filter: `order_id=eq.${orderId}`,
        },
        invalidateOrder
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, orderId, queryClient]);
}
