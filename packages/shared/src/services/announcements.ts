import type { WokthaiSupabaseClient } from '../supabase/client';
import type { AnnouncementInsert, AnnouncementRow, AnnouncementUpdate } from '../types';

export async function fetchPublicAnnouncementsForBanner(
  client: WokthaiSupabaseClient
): Promise<AnnouncementRow[]> {
  const { data, error } = await client
    .from('announcements')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnnouncementRow[];
}

export async function fetchAllAnnouncementsAdmin(
  client: WokthaiSupabaseClient
): Promise<AnnouncementRow[]> {
  const { data, error } = await client
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AnnouncementRow[];
}

export async function insertAnnouncementAdmin(
  client: WokthaiSupabaseClient,
  row: AnnouncementInsert
): Promise<AnnouncementRow> {
  const { data, error } = await client.from('announcements').insert(row).select('*').single();
  if (error) throw error;
  return data as AnnouncementRow;
}

export async function updateAnnouncementAdmin(
  client: WokthaiSupabaseClient,
  id: string,
  patch: AnnouncementUpdate
): Promise<AnnouncementRow> {
  const { data, error } = await client.from('announcements').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return data as AnnouncementRow;
}

export async function deleteAnnouncementAdmin(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('announcements').delete().eq('id', id);
  if (error) throw error;
}
