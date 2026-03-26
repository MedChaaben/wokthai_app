import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase } from '../context/SupabaseProvider';

/** Client : invalide la liste des commandes quand une ligne « orders » du user change (Realtime + RLS). */
export function useMyOrdersRealtime() {
  const client = useSupabase();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

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
          () => {
            void queryClient.invalidateQueries({ queryKey: ['orders'] });
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
