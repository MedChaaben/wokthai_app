import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { fetchCustomizationPresetTree } from '../services/customization-presets';

export function useCustomizationPresetTree(presetId: string | undefined) {
  const client = useSupabase();
  return useQuery({
    queryKey: ['customization-preset-tree', presetId],
    queryFn: () => (presetId ? fetchCustomizationPresetTree(client, presetId) : Promise.resolve([])),
    enabled: Boolean(presetId),
  });
}
