import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import type { OrderRow } from '../types';
import { updateOrderStatus } from '../services/orders';

export function useUpdateOrderStatus() {
  const client = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderRow['status'] }) =>
      updateOrderStatus(client, orderId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['order'] });
    },
  });
}
