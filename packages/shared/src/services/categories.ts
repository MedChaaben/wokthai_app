import type { WokthaiSupabaseClient } from '../supabase/client';
import type { CategoryInsert, CategoryRow } from '../types';

export async function fetchCategories(client: WokthaiSupabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await client.from('categories').select('*').order('position');
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  client: WokthaiSupabaseClient,
  row: Omit<CategoryInsert, 'id'>
): Promise<CategoryRow> {
  const { data, error } = await client.from('categories').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(
  client: WokthaiSupabaseClient,
  id: string,
  patch: Partial<Pick<CategoryRow, 'name' | 'position'>>
): Promise<CategoryRow> {
  const { data, error } = await client.from('categories').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}
