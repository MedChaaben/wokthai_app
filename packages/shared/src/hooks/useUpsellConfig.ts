import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchUpsellConfigBundle } from '../services/upsell-suggestions';

export function useUpsellConfig() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['upsell-config'],
    queryFn: () => fetchUpsellConfigBundle(client),
  });
}
