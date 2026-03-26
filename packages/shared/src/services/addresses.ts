import type { WokthaiSupabaseClient } from '../supabase/client';
import type { AddressInsert, AddressRow, AddressUpdate } from '../types';

export async function fetchMyAddresses(client: WokthaiSupabaseClient): Promise<AddressRow[]> {
  const { data, error } = await client.from('addresses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAddress(
  client: WokthaiSupabaseClient,
  row: Omit<AddressInsert, 'id' | 'user_id'>
): Promise<AddressRow> {
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) throw new Error('Non authentifié');

  const { data, error } = await client
    .from('addresses')
    .insert({ ...row, user_id: uid })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAddress(
  client: WokthaiSupabaseClient,
  id: string,
  patch: Omit<AddressUpdate, 'id' | 'user_id'>
): Promise<AddressRow> {
  const { data, error } = await client.from('addresses').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAddress(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('addresses').delete().eq('id', id);
  if (error) throw error;
}
