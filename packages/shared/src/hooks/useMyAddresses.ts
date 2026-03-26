import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchMyAddresses } from '../services/addresses';

export function useMyAddresses() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['addresses', 'me'],
    queryFn: () => fetchMyAddresses(client),
  });
}
