import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';

/** Nombre de commandes non annulées du client connecté (pour promo 1re livraison). */
export function useMyNonCancelledOrderCount(enabled: boolean) {
  const client = useSupabase();
  return useQuery({
    queryKey: ['orders', 'count', 'nonCancelled'],
    queryFn: async () => {
      const { data: sessionData, error: sessionErr } = await client.auth.getSession();
      if (sessionErr) throw sessionErr;
      const uid = sessionData.session?.user?.id;
      if (!uid) return 0;
      const { count, error } = await client
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .neq('status', 'cancelled');
      if (error) throw error;
      return count ?? 0;
    },
    enabled,
  });
}
