import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';

/** Client : écoute les mises à jour d’une commande précise (filtrée côté Realtime). */
export function useOrderRealtime(orderId: string | null | undefined) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orderId) return;

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
        () => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
          void queryClient.invalidateQueries({ queryKey: ['order', orderId] });
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, orderId, queryClient]);
}
