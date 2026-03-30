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
  // Pas d’embed `stores(...)` ici : avec store_id NULL (siège), certaines versions PostgREST / schémas cassent la jointure.
  const { data: row, error } = await client
    .from('staff')
    .select('id, user_id, email, store_id, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  if (row.store_id == null) {
    return { ...row, stores: null } as StaffProfileRow;
  }

  const { data: storeRow, error: storeErr } = await client
    .from('stores')
    .select('name, city')
    .eq('id', row.store_id)
    .maybeSingle();
  if (storeErr) throw storeErr;

  return {
    ...row,
    stores: storeRow ?? null,
  } as StaffProfileRow;
}

export type StaffListRow = StaffRow & {
  stores: Pick<StoreRow, 'name' | 'city'> | null;
};

/** Liste de l’équipe (admin plateforme uniquement, via RLS). */
export async function fetchAllStaffForAdmin(client: WokthaiSupabaseClient): Promise<StaffListRow[]> {
  const { data: rows, error } = await client
    .from('staff')
    .select('id, user_id, email, store_id, role')
    .order('email');
  if (error) throw error;
  if (!rows?.length) return [];

  const storeIds = [...new Set(rows.map((r) => r.store_id).filter((id): id is string => id != null))];
  if (storeIds.length === 0) {
    return rows.map((r) => ({ ...r, stores: null })) as StaffListRow[];
  }

  const { data: storeRows, error: storesErr } = await client
    .from('stores')
    .select('id, name, city')
    .in('id', storeIds);
  if (storesErr) throw storesErr;

  const byId = new Map((storeRows ?? []).map((s) => [s.id, s]));

  return rows.map((r) => {
    const s = r.store_id ? byId.get(r.store_id) : undefined;
    return {
      ...r,
      stores: s ? { name: s.name, city: s.city } : null,
    } as StaffListRow;
  });
}
