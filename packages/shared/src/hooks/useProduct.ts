import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchProductById } from '../services/products';

export function useProduct(id: string | undefined) {
  const client = useSupabase();
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => (id ? fetchProductById(client, id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}
