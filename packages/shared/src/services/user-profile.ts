import { phoneDisplayToStorage } from '../domain/normalizeCustomerPhone';
import type { WokthaiSupabaseClient } from '../supabase/client';
import type { UserRow } from '../types';

const PHONE_ALREADY_USED_MESSAGE =
  'Ce numéro de téléphone est déjà associé à un autre compte. Connectez-vous avec ce compte ou utilisez un autre numéro.';

function isPostgresUniqueViolation(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const o = e as { code?: string; message?: string };
  if (o.code === '23505') return true;
  const m = typeof o.message === 'string' ? o.message.toLowerCase() : '';
  return m.includes('duplicate key') || m.includes('unique constraint');
}

/** Prénom, nom et téléphone renseignés (téléphone : au moins 8 caractères utiles). */
export function isCustomerProfileComplete(profile: UserRow | null | undefined): boolean {
  if (!profile) return false;
  const fn = profile.first_name?.trim() ?? '';
  const ln = profile.last_name?.trim() ?? '';
  const tel = profile.phone?.replace(/\s/g, '') ?? '';
  return fn.length > 0 && ln.length > 0 && tel.length >= 8;
}

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

const profilePayload = (input: SaveMyUserProfileInput) => {
  const raw = input.phone?.trim() ?? '';
  const phone =
    raw === '' ? null : (phoneDisplayToStorage(raw) ?? raw);
  return {
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
    phone,
  };
};

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

  if (updateErr) {
    if (isPostgresUniqueViolation(updateErr)) throw new Error(PHONE_ALREADY_USED_MESSAGE);
    throw updateErr;
  }

  if (updatedRows && updatedRows.length > 0) return;

  const { error: insertErr } = await client.from('users').insert({
    id: uid,
    ...payload,
  });
  if (insertErr) {
    if (isPostgresUniqueViolation(insertErr)) throw new Error(PHONE_ALREADY_USED_MESSAGE);
    throw insertErr;
  }
}
