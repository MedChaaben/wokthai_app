import { useQuery } from '@tanstack/react-query';
import { isOngoingOrderStatus } from '../domain/order-status';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchOrderById } from '../services/orders';

const REFETCH_ONGOING_MS = 30_000;

export function useOrder(orderId: string | undefined) {
  const client = useSupabase();
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => (orderId ? fetchOrderById(client, orderId) : Promise.resolve(null)),
    enabled: Boolean(orderId),
    refetchInterval: (q) => {
      const row = q.state.data;
      if (!row || !isOngoingOrderStatus(row.status)) return false;
      return REFETCH_ONGOING_MS;
    },
  });
}
