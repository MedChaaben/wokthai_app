import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';

/** Invalide les listes commandes admin à chaque changement sur `orders` (RLS : lignes visibles uniquement). */
export function useAdminOrdersRealtime(enabled: boolean) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channel = client
      .channel('admin-orders-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
          void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-summary'] });
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, enabled, queryClient]);
}
