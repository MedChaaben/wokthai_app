import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchUpsellKindCategories, fetchUpsellSuggestions } from '../services/upsell-suggestions';

export function useUpsellConfig() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['upsell-config'],
    queryFn: async () => {
      const [categoriesByKind, suggestions] = await Promise.all([
        fetchUpsellKindCategories(client),
        fetchUpsellSuggestions(client),
      ]);
      return { categoriesByKind, suggestions };
    },
  });
}
