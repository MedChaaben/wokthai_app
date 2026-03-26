import type { WokthaiSupabaseClient } from '../supabase/client';
import type { DeliveryZoneRow } from '../types';

export async function fetchDeliveryZones(client: WokthaiSupabaseClient): Promise<DeliveryZoneRow[]> {
  const { data, error } = await client.from('delivery_zones').select('*');
  if (error) throw error;
  return data ?? [];
}
