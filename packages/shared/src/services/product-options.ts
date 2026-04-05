import type { OptionGroupWithOptions } from '../domain/order-line-options';
import type { Database, ProductOptionRow } from '../types';
import type { WokthaiSupabaseClient } from '../supabase/client';

type GroupInsert = Database['public']['Tables']['product_option_groups']['Insert'];
type GroupUpdate = Database['public']['Tables']['product_option_groups']['Update'];
type OptionInsert = Database['public']['Tables']['product_options']['Insert'];
type OptionUpdate = Database['public']['Tables']['product_options']['Update'];

export async function fetchProductOptionTree(
  client: WokthaiSupabaseClient,
  productId: string
): Promise<OptionGroupWithOptions[]> {
  const { data: groups, error: gErr } = await client
    .from('product_option_groups')
    .select('*')
    .eq('product_id', productId)
    .order('position', { ascending: true });
  if (gErr) throw gErr;
  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: options, error: oErr } = await client
    .from('product_options')
    .select('*')
    .in('group_id', groupIds)
    .order('position', { ascending: true });
  if (oErr) throw oErr;

  const byGroup = new Map<string, ProductOptionRow[]>();
  for (const o of options ?? []) {
    const list = byGroup.get(o.group_id) ?? [];
    list.push(o);
    byGroup.set(o.group_id, list);
  }

  return groups.map((g) => ({
    ...g,
    product_options: [...(byGroup.get(g.id) ?? [])].sort((a, b) => a.position - b.position),
  }));
}

export async function fetchOptionTreesForProducts(
  client: WokthaiSupabaseClient,
  productIds: string[]
): Promise<Map<string, OptionGroupWithOptions[]>> {
  const unique = [...new Set(productIds)];
  if (unique.length === 0) return new Map();

  const { data: groups, error: gErr } = await client
    .from('product_option_groups')
    .select('*')
    .in('product_id', unique)
    .order('position', { ascending: true });
  if (gErr) throw gErr;
  if (!groups?.length) return new Map();

  const groupIds = groups.map((g) => g.id);
  const { data: options, error: oErr } = await client
    .from('product_options')
    .select('*')
    .in('group_id', groupIds)
    .order('position', { ascending: true });
  if (oErr) throw oErr;

  const byGroup = new Map<string, ProductOptionRow[]>();
  for (const o of options ?? []) {
    const list = byGroup.get(o.group_id) ?? [];
    list.push(o);
    byGroup.set(o.group_id, list);
  }

  const map = new Map<string, OptionGroupWithOptions[]>();
  for (const g of groups) {
    const row: OptionGroupWithOptions = {
      ...g,
      product_options: [...(byGroup.get(g.id) ?? [])].sort((a, b) => a.position - b.position),
    };
    const list = map.get(g.product_id) ?? [];
    list.push(row);
    map.set(g.product_id, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.position - b.position);
  }
  return map;
}

export async function insertProductOptionGroup(
  client: WokthaiSupabaseClient,
  input: GroupInsert
): Promise<{ id: string }> {
  const { data, error } = await client
    .from('product_option_groups')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function updateProductOptionGroup(
  client: WokthaiSupabaseClient,
  id: string,
  patch: GroupUpdate
): Promise<void> {
  const { error } = await client.from('product_option_groups').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProductOptionGroup(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('product_option_groups').delete().eq('id', id);
  if (error) throw error;
}

export async function insertProductOption(
  client: WokthaiSupabaseClient,
  input: OptionInsert
): Promise<{ id: string }> {
  const { data, error } = await client.from('product_options').insert(input).select('id').single();
  if (error) throw error;
  return { id: data.id };
}

export async function updateProductOption(
  client: WokthaiSupabaseClient,
  id: string,
  patch: OptionUpdate
): Promise<void> {
  const { error } = await client.from('product_options').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteProductOption(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('product_options').delete().eq('id', id);
  if (error) throw error;
}
