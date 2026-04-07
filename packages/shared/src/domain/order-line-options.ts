import type { OrderLineOptionChoice, ProductOptionGroupRow, ProductOptionRow } from '../types';

export type OptionGroupWithOptions = ProductOptionGroupRow & {
  product_options: ProductOptionRow[];
};

export type OrderOptionSnapshot = {
  option_name: string;
  price_modifier: number;
};

function byPosition<T extends { position: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.position - b.position);
}

export function buildCartLineKey(productId: string, choices: OrderLineOptionChoice[]): string {
  const sorted = [...choices].sort((a, b) => a.optionId.localeCompare(b.optionId));
  if (sorted.length === 0) return productId;
  return `${productId}:${sorted.map((c) => c.optionId).join(',')}`;
}

/** Sélections par groupe (liste d’option ids). */
export function groupSelectionsByGroupId(
  choices: OrderLineOptionChoice[]
): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const c of choices) {
    const cur = m.get(c.groupId) ?? [];
    cur.push(c.optionId);
    m.set(c.groupId, cur);
  }
  return m;
}

/**
 * Valide les choix par rapport aux groupes / options du produit et calcule
 * le prix unitaire (base + modificateurs) + snapshots pour order_item_options.
 */
export function validateLineOptionsAndPrice(
  productBasePrice: number,
  groups: OptionGroupWithOptions[],
  choices: OrderLineOptionChoice[]
): { unitPrice: number; snapshots: OrderOptionSnapshot[] } {
  const sortedGroups = byPosition(groups.map((g) => ({ ...g, product_options: byPosition(g.product_options) })));

  const optionById = new Map<string, ProductOptionRow & { groupId: string; groupName: string }>();
  for (const g of sortedGroups) {
    for (const o of g.product_options) {
      optionById.set(o.id, { ...o, groupId: g.id, groupName: g.name });
    }
  }

  const byGroup = groupSelectionsByGroupId(choices);

  for (const g of sortedGroups) {
    const picked = byGroup.get(g.id) ?? [];
    const unique = [...new Set(picked)];
    if (unique.length !== picked.length) {
      throw new Error(`Sélection en double dans « ${g.name} »`);
    }
    if (g.required && picked.length === 0) {
      throw new Error(`Choisissez une option pour « ${g.name} »`);
    }
    if (picked.length > g.max_select) {
      throw new Error(`Trop d’options dans « ${g.name} » (max ${g.max_select})`);
    }
    for (const oid of picked) {
      const meta = optionById.get(oid);
      if (!meta || meta.groupId !== g.id) {
        throw new Error('Option invalide pour ce produit');
      }
    }
  }

  const allowedGroupIds = new Set(sortedGroups.map((g) => g.id));
  for (const gid of byGroup.keys()) {
    if (!allowedGroupIds.has(gid)) {
      throw new Error('Groupe d’options inconnu');
    }
  }

  const snapshots: OrderOptionSnapshot[] = [];
  let modifiers = 0;
  for (const c of choices) {
    const meta = optionById.get(c.optionId);
    if (!meta) throw new Error('Option invalide');
    const mod = meta.is_chargeable ? Number(meta.price_modifier) : 0;
    modifiers += mod;
    snapshots.push({
      option_name: `${meta.groupName}: ${meta.name}`,
      price_modifier: mod,
    });
  }

  const unitPrice = productBasePrice + modifiers;
  if (unitPrice < 0) throw new Error('Prix unitaire invalide');
  return { unitPrice, snapshots };
}

/** Aperçu rapide des modificateurs (sans règles required / max) pour l’UI. */
export function sumSelectedModifiersPreview(
  groups: OptionGroupWithOptions[],
  choices: OrderLineOptionChoice[]
): number {
  const optionById = new Map<string, number>();
  for (const g of groups) {
    for (const o of g.product_options) {
      optionById.set(o.id, o.is_chargeable ? Number(o.price_modifier) : 0);
    }
  }
  let sum = 0;
  for (const c of choices) {
    sum += optionById.get(c.optionId) ?? 0;
  }
  return sum;
}
