import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchMyOrders, fetchOrdersForStore } from '../services/orders';
import type { OrderListRow, OrderRow } from '../types';

export type UseOrdersMode =
  | { mode: 'customer' }
  | { mode: 'staff'; storeId: string | undefined };

export function useOrders(opts: { mode: 'customer' }): UseQueryResult<OrderRow[], Error>;
export function useOrders(opts: {
  mode: 'staff';
  storeId: string | undefined;
}): UseQueryResult<OrderListRow[], Error>;
export function useOrders(opts: UseOrdersMode): UseQueryResult<OrderRow[] | OrderListRow[], Error> {
  const client = useSupabase();
  const enabled = opts.mode === 'customer' || Boolean(opts.mode === 'staff' && opts.storeId);

  return useQuery({
    queryKey: ['orders', opts],
    queryFn: () => {
      if (opts.mode === 'customer') return fetchMyOrders(client);
      if (!opts.storeId) return Promise.resolve([]);
      return fetchOrdersForStore(client, opts.storeId);
    },
    enabled,
  });
}
