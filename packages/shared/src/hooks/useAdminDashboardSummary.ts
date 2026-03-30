import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchAdminDashboardSummary, type AdminDashboardSummary } from '../services/admin-dashboard';

export function useAdminDashboardSummary(enabled: boolean): UseQueryResult<AdminDashboardSummary, Error> {
  const client = useSupabase();
  return useQuery({
    queryKey: ['admin', 'dashboard-summary'],
    queryFn: () => fetchAdminDashboardSummary(client),
    enabled,
  });
}
