import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchCategories } from '../services/categories';

export function useCategories() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(client),
  });
}
