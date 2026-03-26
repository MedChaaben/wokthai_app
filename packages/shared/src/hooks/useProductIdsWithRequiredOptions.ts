import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';

/** Produits ayant au moins un groupe d’options obligatoire (pas d’ajout rapide au panier sans passer par la fiche). */
export function useProductIdsWithRequiredOptions() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['product-ids-required-options'],
    queryFn: async () => {
      const { data, error } = await client
        .from('product_option_groups')
        .select('product_id')
        .eq('required', true);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.product_id as string));
    },
  });
}
