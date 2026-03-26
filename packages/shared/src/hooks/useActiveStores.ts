import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchActiveStores } from '../services/stores';

export function useActiveStores() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['stores', 'active'],
    queryFn: () => fetchActiveStores(client),
  });
}
