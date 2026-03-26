import type { WokthaiSupabaseClient } from '../supabase/client';
import type { UserRow } from '../types';

export type SaveMyUserProfileInput = {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  /** Email session (doublon public.users, inchangé depuis le formulaire compte). */
  email: string | null;
};

export async function fetchMyUserProfile(client: WokthaiSupabaseClient): Promise<UserRow | null> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) return null;

  const { data, error } = await client.from('users').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}

const profilePayload = (input: SaveMyUserProfileInput) => ({
  email: input.email,
  first_name: input.first_name,
  last_name: input.last_name,
  phone: input.phone,
});

/**
 * Mise à jour du profil : `upsert` pose souvent problème avec RLS (INSERT + UPDATE).
 * On fait d’abord un UPDATE ; si aucune ligne (profil pas encore créé), INSERT.
 */
export async function saveMyUserProfile(
  client: WokthaiSupabaseClient,
  input: SaveMyUserProfileInput
): Promise<void> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) throw new Error('Non authentifié');

  const payload = profilePayload(input);

  const { data: updatedRows, error: updateErr } = await client
    .from('users')
    .update(payload)
    .eq('id', uid)
    .select('id');

  if (updateErr) throw updateErr;

  if (updatedRows && updatedRows.length > 0) return;

  const { error: insertErr } = await client.from('users').insert({
    id: uid,
    ...payload,
  });
  if (insertErr) throw insertErr;
}
