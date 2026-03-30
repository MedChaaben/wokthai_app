import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchMyStaffProfile } from '../services/staff';

/**
 * Attend que la session Auth soit connue avant de lancer la requête `staff`.
 * Sinon le premier appel part souvent sans JWT → 0 ligne sous RLS, `data` null en cache, écran « Accès refusé » bloqué.
 */
export function useStaffProfile() {
  const client = useSupabase();
  const queryClient = useQueryClient();
  const [authResolved, setAuthResolved] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void client.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setHasSession(!!data.session);
        setAuthResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHasSession(false);
        setAuthResolved(true);
      });

    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      // État initial : uniquement getSession() ci-dessus. Ici ne pas réagir à INITIAL_SESSION / null
      // « fantômes » qui déclenchaient une redirection /login depuis le layout dashboard.
      if (event === 'SIGNED_OUT') {
        setHasSession(false);
        setAuthResolved(true);
        queryClient.removeQueries({ queryKey: ['staff', 'me'] });
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setHasSession(!!session);
        setAuthResolved(true);
        void queryClient.invalidateQueries({ queryKey: ['staff', 'me'] });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [client, queryClient]);

  const query = useQuery({
    queryKey: ['staff', 'me'],
    queryFn: () => fetchMyStaffProfile(client),
    enabled: authResolved && hasSession,
  });

  const isLoading = !authResolved || (hasSession && query.isPending);

  return {
    ...query,
    isLoading,
    authResolved,
    hasSession,
  };
}
