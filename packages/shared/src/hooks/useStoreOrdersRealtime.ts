import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';

export type StoreOrdersRealtimeOptions = {
  /** Appelé à chaque nouvelle ligne `orders` pour ce magasin (événement Realtime INSERT). */
  onInsert?: (order: { id: string }) => void;
  /** Appelé à chaque mise à jour d’une ligne `orders` pour ce magasin (Realtime UPDATE). */
  onUpdate?: (order: { id: string; status: string }) => void;
};

/** Dashboard : toutes les commandes du magasin du staff. */
export function useStoreOrdersRealtime(
  storeId: string | null | undefined,
  options?: StoreOrdersRealtimeOptions
) {
  const client = useSupabase();
  const queryClient = useQueryClient();
  const onInsertRef = useRef(options?.onInsert);
  onInsertRef.current = options?.onInsert;
  const onUpdateRef = useRef(options?.onUpdate);
  onUpdateRef.current = options?.onUpdate;

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
        (payload) => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
          if (payload.eventType === 'INSERT') {
            const id = (payload.new as { id?: unknown } | null)?.id;
            if (typeof id === 'string' && onInsertRef.current) {
              onInsertRef.current({ id });
            }
            return;
          }
          if (payload.eventType === 'UPDATE' && onUpdateRef.current) {
            const row = payload.new as { id?: unknown; status?: unknown } | null;
            const id = row?.id;
            const status = row?.status;
            if (typeof id === 'string' && typeof status === 'string') {
              onUpdateRef.current({ id, status });
            }
          }
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, storeId, queryClient]);
}
