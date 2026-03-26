import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';

/** Dashboard : toutes les commandes du magasin du staff. */
export function useStoreOrdersRealtime(storeId: string | null | undefined) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!storeId) return;

    const channel = client
      .channel(`store-orders-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, storeId, queryClient]);
}
