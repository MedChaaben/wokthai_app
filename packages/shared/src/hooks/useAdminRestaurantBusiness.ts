import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import {
  fetchAdminRestaurantBusiness,
  type AdminRestaurantBusiness,
} from '../services/admin-restaurant-business';

export function useAdminRestaurantBusiness(enabled: boolean): UseQueryResult<AdminRestaurantBusiness, Error> {
  const client = useSupabase();
  return useQuery({
    queryKey: ['admin', 'restaurant-business'],
    queryFn: () => fetchAdminRestaurantBusiness(client),
    enabled,
  });
}
