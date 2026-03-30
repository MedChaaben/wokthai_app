import type { WokthaiSupabaseClient } from '../supabase/client';

export type AdminDashboardByStore = {
  store_id: string;
  store_name: string;
  pending: number;
  active: number;
  revenue_7d: string | number;
};

export type AdminDashboardSummary = {
  pending_count: number;
  active_count: number;
  orders_today: number;
  revenue_today_tnd: string | number;
  orders_last_7_days: number;
  revenue_last_7_days_tnd: string | number;
  stores_total: number;
  stores_active: number;
  by_store: AdminDashboardByStore[];
};

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

export async function fetchAdminDashboardSummary(
  client: WokthaiSupabaseClient
): Promise<AdminDashboardSummary> {
  const { data, error } = await client.rpc('admin_dashboard_summary');
  if (error) throw error;
  const raw = data as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    throw new Error('Réponse admin_dashboard_summary invalide');
  }
  const byStoreRaw = raw.by_store;
  const by_store: AdminDashboardByStore[] = Array.isArray(byStoreRaw)
    ? byStoreRaw.map((row) => {
        const r = row as Record<string, unknown>;
        return {
          store_id: String(r.store_id ?? ''),
          store_name: String(r.store_name ?? ''),
          pending: asNumber(r.pending),
          active: asNumber(r.active),
          revenue_7d: r.revenue_7d as string | number,
        };
      })
    : [];

  return {
    pending_count: asNumber(raw.pending_count),
    active_count: asNumber(raw.active_count),
    orders_today: asNumber(raw.orders_today),
    revenue_today_tnd: raw.revenue_today_tnd as string | number,
    orders_last_7_days: asNumber(raw.orders_last_7_days),
    revenue_last_7_days_tnd: raw.revenue_last_7_days_tnd as string | number,
    stores_total: asNumber(raw.stores_total),
    stores_active: asNumber(raw.stores_active),
    by_store,
  };
}
