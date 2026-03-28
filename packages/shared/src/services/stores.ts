import type { WokthaiSupabaseClient } from '../supabase/client';
import type { Json } from '../types/database';
import type { StoreOpeningHourRow, StoreRow } from '../types';

export type StoreWithOpeningHours = StoreRow & {
  store_opening_hours: StoreOpeningHourRow[] | null;
};

export async function fetchActiveStores(client: WokthaiSupabaseClient): Promise<StoreWithOpeningHours[]> {
  const { data, error } = await client
    .from('stores')
    .select(
      `
      *,
      store_opening_hours (
        id,
        store_id,
        day_of_week,
        open_time,
        close_time,
        sort_order
      )
    `
    )
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as unknown as StoreWithOpeningHours[];
}

export type StoreOpeningHourSlotInput = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  sort_order: number;
};

export async function fetchStoreOpeningHoursForStore(
  client: WokthaiSupabaseClient,
  storeId: string
): Promise<StoreOpeningHourRow[]> {
  const { data, error } = await client
    .from('store_opening_hours')
    .select('id, store_id, day_of_week, open_time, close_time, sort_order')
    .eq('store_id', storeId)
    .order('day_of_week', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function replaceStoreOpeningHoursForMyStore(
  client: WokthaiSupabaseClient,
  slots: StoreOpeningHourSlotInput[]
): Promise<void> {
  const { error } = await client.rpc('replace_store_opening_hours_for_my_store', {
    p_slots: slots as unknown as Json,
  });
  if (error) throw error;
}

export async function fetchAllStores(client: WokthaiSupabaseClient): Promise<StoreRow[]> {
  const { data, error } = await client.from('stores').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function updateStoreDeliveryEnabled(
  client: WokthaiSupabaseClient,
  storeId: string,
  deliveryEnabled: boolean
): Promise<StoreRow> {
  const { data, error } = await client
    .from('stores')
    .update({ delivery_enabled: deliveryEnabled })
    .eq('id', storeId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
