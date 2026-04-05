import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchCustomizationPresetList } from '../services/customization-presets';

export function useCustomizationPresets() {
  const client = useSupabase();
  return useQuery({
    queryKey: ['customization-presets'],
    queryFn: () => fetchCustomizationPresetList(client),
  });
}
