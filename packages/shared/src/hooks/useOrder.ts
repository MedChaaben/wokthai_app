import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchOrderById } from '../services/orders';

export function useOrder(orderId: string | undefined) {
  const client = useSupabase();
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => (orderId ? fetchOrderById(client, orderId) : Promise.resolve(null)),
    enabled: Boolean(orderId),
  });
}
