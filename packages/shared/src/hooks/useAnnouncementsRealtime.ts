import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase } from '../context/SupabaseProvider';

export const ANNOUNCEMENTS_BANNER_QUERY_KEY = ['announcements', 'banner'] as const;
export const ANNOUNCEMENTS_ADMIN_QUERY_KEY = ['announcements', 'admin'] as const;

/** Invalide le bandeau (et la liste admin) quand la table `announcements` change. */
export function useAnnouncementsRealtime(enabled: boolean = true) {
  const client = useSupabase();
  const queryClient = useQueryClient();
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const channel: RealtimeChannel = client
      .channel('public-announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          if (!enabledRef.current || cancelled) return;
          void queryClient.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_BANNER_QUERY_KEY] });
          void queryClient.invalidateQueries({ queryKey: [...ANNOUNCEMENTS_ADMIN_QUERY_KEY] });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void client.removeChannel(channel);
    };
  }, [client, enabled, queryClient]);
}
