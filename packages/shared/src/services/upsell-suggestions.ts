import type { WokthaiSupabaseClient } from '../supabase/client';
import type { UpsellKind } from '../types';

export type UpsellSuggestionWithProduct = {
  id: string;
  kind: UpsellKind;
  position: number;
  is_active: boolean;
  product: {
    id: string;
    name: string;
    description: string | null;
    price: string;
    image_url: string | null;
    is_available: boolean;
    category_id: string;
  };
};

export async function fetchUpsellKindCategories(client: WokthaiSupabaseClient): Promise<Record<UpsellKind, string[]>> {
  const { data, error } = await client
    .from('upsell_kind_categories')
    .select('kind, category_id');
  if (error) throw error;
  const out: Record<UpsellKind, string[]> = { drink: [], starter: [] };
  for (const row of data ?? []) out[row.kind].push(row.category_id);
  return out;
}

export async function replaceUpsellKindCategories(
  client: WokthaiSupabaseClient,
  kind: UpsellKind,
  categoryIds: string[]
): Promise<void> {
  const uniq = Array.from(new Set(categoryIds));
  const { error: delErr } = await client.from('upsell_kind_categories').delete().eq('kind', kind);
  if (delErr) throw delErr;
  if (uniq.length === 0) return;
  const { error: insErr } = await client
    .from('upsell_kind_categories')
    .insert(uniq.map((category_id) => ({ kind, category_id })));
  if (insErr) throw insErr;
}

export async function fetchUpsellSuggestions(
  client: WokthaiSupabaseClient
): Promise<UpsellSuggestionWithProduct[]> {
  const { data: rows, error } = await client
    .from('upsell_suggestions')
    .select('id, kind, position, is_active, product_id')
    .order('position', { ascending: true });
  if (error) throw error;
  if (!rows?.length) return [];

  const productIds = rows.map((r) => r.product_id);
  const { data: products, error: pErr } = await client
    .from('products')
    .select('id, name, description, price, image_url, is_available, category_id')
    .in('id', productIds);
  if (pErr) throw pErr;
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const mapped = rows
    .map((r) => {
      const product = byId.get(r.product_id);
      if (!product) return null;
      return {
        id: r.id,
        kind: r.kind as UpsellKind,
        position: r.position,
        is_active: r.is_active,
        product,
      };
    });
  return mapped.filter((x): x is NonNullable<(typeof mapped)[number]> => x != null);
}

export async function createUpsellSuggestion(
  client: WokthaiSupabaseClient,
  input: { kind: UpsellKind; product_id: string; position?: number; is_active?: boolean }
): Promise<void> {
  const { error } = await client.from('upsell_suggestions').insert({
    kind: input.kind,
    product_id: input.product_id,
    position: input.position ?? 0,
    is_active: input.is_active ?? true,
  });
  if (error) throw error;
}

export async function updateUpsellSuggestion(
  client: WokthaiSupabaseClient,
  id: string,
  patch: { position?: number; is_active?: boolean }
): Promise<void> {
  const { error } = await client.from('upsell_suggestions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteUpsellSuggestion(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('upsell_suggestions').delete().eq('id', id);
  if (error) throw error;
}
