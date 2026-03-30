import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchAllStaffForAdmin, type StaffListRow } from '../services/staff';

export function useAdminStaffList(enabled: boolean): UseQueryResult<StaffListRow[], Error> {
  const client = useSupabase();
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => fetchAllStaffForAdmin(client),
    enabled,
  });
}
