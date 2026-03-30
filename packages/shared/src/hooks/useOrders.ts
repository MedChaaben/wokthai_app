import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchMyOrders, fetchOrdersForAdmin, fetchOrdersForStore } from '../services/orders';
import type { OrderListRow, OrderRow } from '../types';

export type UseOrdersMode =
  | { mode: 'customer'; enabled?: boolean }
  | { mode: 'staff'; storeId: string | null | undefined; enabled?: boolean }
  | { mode: 'admin'; storeId?: string | null; enabled?: boolean };

export function useOrders(opts: { mode: 'customer'; enabled?: boolean }): UseQueryResult<OrderRow[], Error>;
export function useOrders(opts: {
  mode: 'staff';
  storeId: string | null | undefined;
  enabled?: boolean;
}): UseQueryResult<OrderListRow[], Error>;
export function useOrders(opts: {
  mode: 'admin';
  storeId?: string | null;
  enabled?: boolean;
}): UseQueryResult<OrderListRow[], Error>;
export function useOrders(opts: UseOrdersMode): UseQueryResult<OrderRow[] | OrderListRow[], Error> {
  const client = useSupabase();
  const baseEnabled =
    opts.mode === 'customer' ||
    Boolean(opts.mode === 'staff' && opts.storeId != null && opts.storeId !== '') ||
    opts.mode === 'admin';
  const enabled = (opts.enabled ?? true) && baseEnabled;

  return useQuery({
    queryKey: ['orders', opts],
    queryFn: () => {
      if (opts.mode === 'customer') return fetchMyOrders(client);
      if (opts.mode === 'admin') return fetchOrdersForAdmin(client, { storeId: opts.storeId ?? undefined });
      if (opts.storeId == null || opts.storeId === '') return Promise.resolve([]);
      return fetchOrdersForStore(client, opts.storeId);
    },
    enabled,
  });
}
