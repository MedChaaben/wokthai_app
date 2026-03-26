import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchDeliveryZones } from '../services/delivery-zones';

export function useDeliveryZones() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => fetchDeliveryZones(client),
  });
}
