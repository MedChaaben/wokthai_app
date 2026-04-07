import type { Database } from '../types';
import type { WokthaiSupabaseClient } from '../supabase/client';

export type CustomizationPresetListItem = {
  id: string;
  name: string;
  position: number;
};

type PresetGroupRowDb = Database['public']['Tables']['customization_preset_groups']['Row'];
type PresetOptionRowDb = Database['public']['Tables']['customization_preset_options']['Row'];
type PresetGroupInsert = Database['public']['Tables']['customization_preset_groups']['Insert'];
type PresetGroupUpdate = Database['public']['Tables']['customization_preset_groups']['Update'];
type PresetOptionInsert = Database['public']['Tables']['customization_preset_options']['Insert'];
type PresetOptionUpdate = Database['public']['Tables']['customization_preset_options']['Update'];

/** Arbre préréglage (équivalent menu produit, clé alignée sur la relation Supabase). */
export type CustomizationPresetGroupWithOptions = PresetGroupRowDb & {
  customization_preset_options: PresetOptionRowDb[];
};

type PresetGroupRowEmbed = {
  name: string;
  required: boolean;
  max_select: number;
  position: number;
  customization_preset_options: {
    name: string;
    is_chargeable: boolean;
    price_modifier: string | number;
    position: number;
  }[];
};

export async function fetchCustomizationPresetList(
  client: WokthaiSupabaseClient
): Promise<CustomizationPresetListItem[]> {
  const { data, error } = await client
    .from('customization_presets')
    .select('id, name, position')
    .order('position', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomizationPresetListItem[];
}

export async function deleteCustomizationPreset(client: WokthaiSupabaseClient, presetId: string): Promise<void> {
  const { error } = await client.from('customization_presets').delete().eq('id', presetId);
  if (error) throw error;
}

export async function fetchCustomizationPresetTree(
  client: WokthaiSupabaseClient,
  presetId: string
): Promise<CustomizationPresetGroupWithOptions[]> {
  const { data: groups, error: gErr } = await client
    .from('customization_preset_groups')
    .select('*')
    .eq('preset_id', presetId)
    .order('position', { ascending: true });
  if (gErr) throw gErr;
  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: options, error: oErr } = await client
    .from('customization_preset_options')
    .select('*')
    .in('preset_group_id', groupIds)
    .order('position', { ascending: true });
  if (oErr) throw oErr;

  const byGroup = new Map<string, PresetOptionRowDb[]>();
  for (const o of options ?? []) {
    const list = byGroup.get(o.preset_group_id) ?? [];
    list.push(o);
    byGroup.set(o.preset_group_id, list);
  }

  return groups.map((g) => ({
    ...g,
    customization_preset_options: [...(byGroup.get(g.id) ?? [])].sort((a, b) => a.position - b.position),
  }));
}

export async function createEmptyCustomizationPreset(
  client: WokthaiSupabaseClient,
  name: string
): Promise<{ presetId: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Nom du préréglage requis');

  const { data: presets, error: listErr } = await client
    .from('customization_presets')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);
  if (listErr) throw listErr;
  const nextPos = (presets?.[0]?.position ?? -1) + 1;

  const { data: row, error } = await client
    .from('customization_presets')
    .insert({ name: trimmed, position: nextPos })
    .select('id')
    .single();
  if (error) throw error;
  return { presetId: row.id as string };
}

export async function updateCustomizationPreset(
  client: WokthaiSupabaseClient,
  presetId: string,
  patch: { name?: string; position?: number }
): Promise<void> {
  const { error } = await client.from('customization_presets').update(patch).eq('id', presetId);
  if (error) throw error;
}

export async function insertCustomizationPresetGroup(
  client: WokthaiSupabaseClient,
  input: PresetGroupInsert
): Promise<{ id: string }> {
  const { data, error } = await client
    .from('customization_preset_groups')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function updateCustomizationPresetGroup(
  client: WokthaiSupabaseClient,
  id: string,
  patch: PresetGroupUpdate
): Promise<void> {
  const { error } = await client.from('customization_preset_groups').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomizationPresetGroup(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('customization_preset_groups').delete().eq('id', id);
  if (error) throw error;
}

export async function insertCustomizationPresetOption(
  client: WokthaiSupabaseClient,
  input: PresetOptionInsert
): Promise<{ id: string }> {
  const { data, error } = await client
    .from('customization_preset_options')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function updateCustomizationPresetOption(
  client: WokthaiSupabaseClient,
  id: string,
  patch: PresetOptionUpdate
): Promise<void> {
  const { error } = await client.from('customization_preset_options').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomizationPresetOption(client: WokthaiSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('customization_preset_options').delete().eq('id', id);
  if (error) throw error;
}

export type ImportPresetMode = 'append' | 'replace';

/**
 * Copie un préréglage vers les groupes / options du produit (IDs distincts par produit).
 */
export async function importCustomizationPresetToProduct(
  client: WokthaiSupabaseClient,
  productId: string,
  presetId: string,
  mode: ImportPresetMode
): Promise<void> {
  const { data: preset, error: pErr } = await client
    .from('customization_presets')
    .select('id')
    .eq('id', presetId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!preset) throw new Error('Préréglage introuvable');

  const { data: rawGroups, error: gErr } = await client
    .from('customization_preset_groups')
    .select(
      `
      name,
      required,
      max_select,
      position,
      customization_preset_options ( name, is_chargeable, price_modifier, position )
    `
    )
    .eq('preset_id', presetId)
    .order('position', { ascending: true });
  if (gErr) throw gErr;
  const groups = (rawGroups ?? []) as unknown as PresetGroupRowEmbed[];
  if (groups.length === 0) {
    throw new Error(
      'Ce préréglage est vide — ajoutez au moins un groupe et des valeurs dans la section « Catalogue de préréglages » (page Produits).'
    );
  }

  if (mode === 'replace') {
    const { error: delErr } = await client.from('product_option_groups').delete().eq('product_id', productId);
    if (delErr) throw delErr;
  }

  let basePos = 0;
  if (mode === 'append') {
    const { data: existing, error: exErr } = await client
      .from('product_option_groups')
      .select('position')
      .eq('product_id', productId);
    if (exErr) throw exErr;
    basePos =
      (existing?.length ? Math.max(...existing.map((r) => r.position)) : -1) + 1;
  }

  const sorted = [...groups].sort((a, b) => a.position - b.position);
  let i = 0;
  for (const g of sorted) {
    const { data: newG, error: ngErr } = await client
      .from('product_option_groups')
      .insert({
        product_id: productId,
        name: g.name,
        required: g.required,
        max_select: g.max_select,
        position: basePos + i,
      })
      .select('id')
      .single();
    if (ngErr) throw ngErr;
    const newGid = newG.id as string;
    const opts = [...(g.customization_preset_options ?? [])].sort((a, b) => a.position - b.position);
    if (opts.length > 0) {
      const { error: oErr } = await client.from('product_options').insert(
        opts.map((o, j) => ({
          group_id: newGid,
          name: o.name,
          is_chargeable: o.is_chargeable,
          price_modifier: Number(o.price_modifier),
          position: j,
        }))
      );
      if (oErr) throw oErr;
    }
    i += 1;
  }
}
