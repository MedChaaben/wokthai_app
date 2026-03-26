import type { WokthaiSupabaseClient } from '../supabase/client';
import type { StoreRow } from '../types';

export async function fetchActiveStores(client: WokthaiSupabaseClient): Promise<StoreRow[]> {
  const { data, error } = await client
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllStores(client: WokthaiSupabaseClient): Promise<StoreRow[]> {
  const { data, error } = await client.from('stores').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}
