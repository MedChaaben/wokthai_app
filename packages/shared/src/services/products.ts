import type { WokthaiSupabaseClient } from '../supabase/client';
import type { ProductInsert, ProductRow } from '../types';

export async function fetchProducts(client: WokthaiSupabaseClient): Promise<ProductRow[]> {
  const { data, error } = await client
    .from('products')
    .select('*')
    .order('position');
  if (error) throw error;
  return data ?? [];
}

export async function fetchAvailableProducts(client: WokthaiSupabaseClient): Promise<ProductRow[]> {
  const { data, error } = await client
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('position');
  if (error) throw error;
  return data ?? [];
}

export async function fetchProductById(
  client: WokthaiSupabaseClient,
  id: string
): Promise<ProductRow | null> {
  const { data, error } = await client.from('products').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProduct(
  client: WokthaiSupabaseClient,
  row: Omit<ProductInsert, 'id'>
): Promise<ProductRow> {
  const { data, error } = await client.from('products').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  client: WokthaiSupabaseClient,
  id: string,
  patch: Partial<
    Pick<ProductRow, 'name' | 'description' | 'category_id' | 'image_url' | 'is_available' | 'position'> & {
      price?: number | string;
    }
  >
): Promise<ProductRow> {
  const { data, error } = await client.from('products').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('products').delete().eq('id', id);
  if (error) throw error;
}
