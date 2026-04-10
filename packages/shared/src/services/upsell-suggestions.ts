import type { WokthaiSupabaseClient } from '../supabase/client';
import type { UpsellCampaignRow } from '../types';

export type UpsellSuggestionWithProduct = {
  id: string;
  campaign_id: string;
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

export async function fetchUpsellCampaigns(client: WokthaiSupabaseClient): Promise<UpsellCampaignRow[]> {
  const { data, error } = await client.from('upsell_campaigns').select('*').order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as UpsellCampaignRow[];
}

export async function fetchUpsellCampaignCategories(
  client: WokthaiSupabaseClient
): Promise<{ campaign_id: string; category_id: string }[]> {
  const { data, error } = await client.from('upsell_campaign_categories').select('campaign_id, category_id');
  if (error) throw error;
  return (data ?? []) as { campaign_id: string; category_id: string }[];
}

function categoriesByCampaign(rows: { campaign_id: string; category_id: string }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const r of rows) {
    const list = out[r.campaign_id] ?? [];
    list.push(r.category_id);
    out[r.campaign_id] = list;
  }
  return out;
}

export async function fetchUpsellSuggestions(client: WokthaiSupabaseClient): Promise<UpsellSuggestionWithProduct[]> {
  const { data: rows, error } = await client
    .from('upsell_suggestions')
    .select('id, campaign_id, position, is_active, product_id')
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
  const mapped = rows.map((r) => {
    const product = byId.get(r.product_id);
    if (!product) return null;
    return {
      id: r.id,
      campaign_id: r.campaign_id,
      position: r.position,
      is_active: r.is_active,
      product,
    };
  });
  return mapped.filter((x): x is NonNullable<(typeof mapped)[number]> => x != null);
}

/** Données brutes pour le hook (campagnes + catégories + suggestions). */
export async function fetchUpsellConfigBundle(client: WokthaiSupabaseClient): Promise<{
  campaigns: UpsellCampaignRow[];
  categoriesByCampaignId: Record<string, string[]>;
  suggestions: UpsellSuggestionWithProduct[];
}> {
  const [campaigns, catRows, suggestions] = await Promise.all([
    fetchUpsellCampaigns(client),
    fetchUpsellCampaignCategories(client),
    fetchUpsellSuggestions(client),
  ]);
  return {
    campaigns,
    categoriesByCampaignId: categoriesByCampaign(catRows),
    suggestions,
  };
}

export async function createUpsellCampaign(client: WokthaiSupabaseClient, name: string): Promise<{ campaignId: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nom de la relance requis');
  const { data: existing, error: listErr } = await client
    .from('upsell_campaigns')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  if (listErr) throw listErr;
  const nextPos = (existing?.[0]?.position ?? -1) + 1;
  const { data: row, error } = await client
    .from('upsell_campaigns')
    .insert({ name: trimmed, position: nextPos })
    .select('id')
    .single();
  if (error) throw error;
  return { campaignId: row.id as string };
}

export async function updateUpsellCampaign(
  client: WokthaiSupabaseClient,
  id: string,
  patch: { name?: string; position?: number }
): Promise<void> {
  const { error } = await client.from('upsell_campaigns').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteUpsellCampaign(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('upsell_campaigns').delete().eq('id', id);
  if (error) throw error;
}

export async function replaceUpsellCampaignCategories(
  client: WokthaiSupabaseClient,
  campaignId: string,
  categoryIds: string[]
): Promise<void> {
  const uniq = Array.from(new Set(categoryIds));
  const { error: delErr } = await client.from('upsell_campaign_categories').delete().eq('campaign_id', campaignId);
  if (delErr) throw delErr;
  if (uniq.length === 0) return;
  const { error: insErr } = await client
    .from('upsell_campaign_categories')
    .insert(uniq.map((category_id) => ({ campaign_id: campaignId, category_id })));
  if (insErr) throw insErr;
}

export async function createUpsellSuggestion(
  client: WokthaiSupabaseClient,
  input: { campaign_id: string; product_id: string; position?: number; is_active?: boolean }
): Promise<void> {
  const { error } = await client.from('upsell_suggestions').insert({
    campaign_id: input.campaign_id,
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
