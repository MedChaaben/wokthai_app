import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchAvailableProducts, fetchProducts } from '../services/products';

export function useProducts(options?: { onlyAvailable?: boolean }) {
  const client = useSupabase();
  const onlyAvailable = options?.onlyAvailable ?? false;
  return useQuery({
    queryKey: ['products', onlyAvailable],
    queryFn: () => (onlyAvailable ? fetchAvailableProducts(client) : fetchProducts(client)),
  });
}
