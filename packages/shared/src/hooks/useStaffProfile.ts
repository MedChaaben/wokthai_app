import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchMyStaffProfile } from '../services/staff';

export function useStaffProfile() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['staff', 'me'],
    queryFn: () => fetchMyStaffProfile(client),
  });
}
