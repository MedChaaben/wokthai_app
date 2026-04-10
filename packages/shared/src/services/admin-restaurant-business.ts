import type { WokthaiSupabaseClient } from '../supabase/client';

export type MoneyBlock = {
  revenue_tnd: string | number;
  orders_count: number;
  avg_basket_tnd: string | number;
};

export type PerformanceBlock = {
  app_share_7d: string | number;
  app_orders_7d: number;
  all_orders_7d: number;
  app_orders_prev_7d: number;
  app_orders_evolution_pct: string | number;
};

export type UpsellBlock7d = {
  rate: string | number;
  avg_with_upsell_tnd: string | number;
  avg_without_upsell_tnd: string | number;
  orders_with_upsell: number;
  orders_total: number;
  estimated_extra_revenue_tnd: string | number;
};

export type ClientsBlock = {
  users_with_orders: number;
  repeat_users: number;
  repeat_rate: string | number;
  orders_per_user: string | number;
};

export type TopProductRow = { product_name: string; total_qty: number };

export type AdminRestaurantBusiness = {
  money_today: MoneyBlock;
  money_week: MoneyBlock;
  performance: PerformanceBlock;
  upsell_7d: UpsellBlock7d;
  clients: ClientsBlock;
  top_products_30d: TopProductRow[];
  funnel_events_7d: Record<string, number>;
  conversion_add_to_cart_to_order: string | number;
};

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

function moneyBlock(raw: unknown): MoneyBlock {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    revenue_tnd: r.revenue_tnd as string | number,
    orders_count: asNumber(r.orders_count),
    avg_basket_tnd: r.avg_basket_tnd as string | number,
  };
}

function performanceBlock(raw: unknown): PerformanceBlock {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    app_share_7d: r.app_share_7d as string | number,
    app_orders_7d: asNumber(r.app_orders_7d),
    all_orders_7d: asNumber(r.all_orders_7d),
    app_orders_prev_7d: asNumber(r.app_orders_prev_7d),
    app_orders_evolution_pct: r.app_orders_evolution_pct as string | number,
  };
}

function upsellBlock(raw: unknown): UpsellBlock7d {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    rate: r.rate as string | number,
    avg_with_upsell_tnd: r.avg_with_upsell_tnd as string | number,
    avg_without_upsell_tnd: r.avg_without_upsell_tnd as string | number,
    orders_with_upsell: asNumber(r.orders_with_upsell),
    orders_total: asNumber(r.orders_total),
    estimated_extra_revenue_tnd: r.estimated_extra_revenue_tnd as string | number,
  };
}

function clientsBlock(raw: unknown): ClientsBlock {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    users_with_orders: asNumber(r.users_with_orders),
    repeat_users: asNumber(r.repeat_users),
    repeat_rate: r.repeat_rate as string | number,
    orders_per_user: r.orders_per_user as string | number,
  };
}

function parseTopProducts(raw: unknown): TopProductRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      product_name: String(r.product_name ?? ''),
      total_qty: asNumber(r.total_qty),
    };
  });
}

function parseFunnel(raw: unknown): Record<string, number> {
  if (raw == null || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = asNumber(v);
  }
  return out;
}

export async function fetchAdminRestaurantBusiness(
  client: WokthaiSupabaseClient
): Promise<AdminRestaurantBusiness> {
  const { data, error } = await client.rpc('admin_restaurant_business');
  if (error) throw error;
  const raw = data as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse admin_restaurant_business invalide');
  }
  return {
    money_today: moneyBlock(raw.money_today),
    money_week: moneyBlock(raw.money_week),
    performance: performanceBlock(raw.performance),
    upsell_7d: upsellBlock(raw.upsell_7d),
    clients: clientsBlock(raw.clients),
    top_products_30d: parseTopProducts(raw.top_products_30d),
    funnel_events_7d: parseFunnel(raw.funnel_events_7d),
    conversion_add_to_cart_to_order: raw.conversion_add_to_cart_to_order as string | number,
  };
}
