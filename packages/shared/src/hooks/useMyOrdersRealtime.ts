import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase } from '../context/SupabaseProvider';

export type MyOrdersRealtimeEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  orderId: string;
  status: string;
  /** Présent sur UPDATE si le statut a changé ; `null` sur INSERT. */
  previousStatus: string | null;
};

export type MyOrdersRealtimeOptions = {
  /** Après invalidation du cache ; utile p. ex. pour notifications locales sur le mobile. */
  onEvent?: (event: MyOrdersRealtimeEvent) => void;
};

/** Client : invalide la liste des commandes quand une ligne « orders » du user change (Realtime + RLS). */
export function useMyOrdersRealtime(options?: MyOrdersRealtimeOptions) {
  const client = useSupabase();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (cancelled || !user) return;

      const channel = client
        .channel(`my-orders-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
            const cb = onEventRef.current;
            if (!cb) return;

            if (payload.eventType === 'INSERT') {
              const n = payload.new as { id?: string; status?: string } | null;
              if (n?.id && n?.status) {
                cb({
                  eventType: 'INSERT',
                  orderId: n.id,
                  status: n.status,
                  previousStatus: null,
                });
              }
              return;
            }
            if (payload.eventType === 'UPDATE') {
              const n = payload.new as { id?: string; status?: string } | null;
              const o = payload.old as { status?: string } | null;
              if (!n?.id || !n?.status) return;
              const prev = o?.status;
              if (prev !== undefined && prev === n.status) return;
              cb({
                eventType: 'UPDATE',
                orderId: n.id,
                status: n.status,
                previousStatus: prev ?? null,
              });
              return;
            }
            if (payload.eventType === 'DELETE') {
              const o = payload.old as { id?: string; status?: string } | null;
              if (o?.id && o?.status) {
                cb({
                  eventType: 'DELETE',
                  orderId: o.id,
                  status: o.status,
                  previousStatus: null,
                });
              }
            }
          }
        )
        .subscribe();

      if (cancelled) {
        void client.removeChannel(channel);
        return;
      }
      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        void client.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [client, queryClient]);
}
