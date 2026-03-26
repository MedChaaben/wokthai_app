import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchProductOptionTree } from '../services/product-options';

export function useProductOptionGroups(productId: string | undefined) {
  const client = useSupabase();
  return useQuery({
    queryKey: ['product-option-groups', productId],
    queryFn: () => (productId ? fetchProductOptionTree(client, productId) : Promise.resolve([])),
    enabled: Boolean(productId),
  });
}
