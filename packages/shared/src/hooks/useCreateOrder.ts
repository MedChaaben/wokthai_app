import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import type { CreateOrderInput } from '../types';
import { createOrderWithItems } from '../services/orders';

export function useCreateOrder() {
  const client = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrderWithItems(client, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'me', 'profile'] });
    },
  });
}
