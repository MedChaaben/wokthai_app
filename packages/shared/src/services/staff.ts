import type { WokthaiSupabaseClient } from '../supabase/client';
import type { StaffProfileRow } from '../types';

export async function fetchMyStaffProfile(client: WokthaiSupabaseClient): Promise<StaffProfileRow | null> {
  const { data, error } = await client
    .from('staff')
    .select('id, user_id, email, store_id, stores ( name, city )')
    .maybeSingle();
  if (error) throw error;
  return data as StaffProfileRow | null;
}
