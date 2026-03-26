import type { WokthaiSupabaseClient } from '../supabase/client';

export async function fetchProductBasePrices(
  client: WokthaiSupabaseClient,
  productIds: string[]
): Promise<Map<string, number>> {
  const unique = [...new Set(productIds)];
  if (unique.length === 0) return new Map();
  const { data, error } = await client.from('products').select('id, price').in('id', unique);
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.id, Number(row.price));
  }
  return map;
}
