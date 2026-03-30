import type { WokthaiSupabaseClient } from '../supabase/client';
import type { StaffProfileRow, StaffRow, StoreRow } from '../types';

export async function fetchMyStaffProfile(client: WokthaiSupabaseClient): Promise<StaffProfileRow | null> {
  const {
    data: { user },
    error: authErr,
  } = await client.auth.getUser();
  if (authErr) throw authErr;
  if (!user) return null;

  // Toujours filtrer sur l’utilisateur courant : les platform_admin voient toute la table via RLS,
  // sans .eq() PostgREST renverrait N lignes et .maybeSingle() échoue (PGRST116).
  const { data, error } = await client
    .from('staff')
    .select('id, user_id, email, store_id, role, stores ( name, city )')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data as StaffProfileRow | null;
}

export type StaffListRow = StaffRow & {
  stores: Pick<StoreRow, 'name' | 'city'> | null;
};

/** Liste de l’équipe (admin plateforme uniquement, via RLS). */
export async function fetchAllStaffForAdmin(client: WokthaiSupabaseClient): Promise<StaffListRow[]> {
  const { data, error } = await client
    .from('staff')
    .select('id, user_id, email, store_id, role, stores ( name, city )')
    .order('email');
  if (error) throw error;
  return (data ?? []) as unknown as StaffListRow[];
}
