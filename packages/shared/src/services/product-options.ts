import type { OptionGroupWithOptions } from '../domain/order-line-options';
import type { ProductOptionRow } from '../types';
import type { WokthaiSupabaseClient } from '../supabase/client';

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
