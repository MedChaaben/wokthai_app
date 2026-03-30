"use client";

import { useStaffProfile, useAdminDashboardSummary, useAdminOrdersRealtime } from "@wokthai/shared";

function fmtMoney(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return `${n.toFixed(2)} TND`;
}

export default function AdminOverviewPage() {
  const staff = useStaffProfile();
  const isAdmin = staff.data?.role === "platform_admin";
  const summary = useAdminDashboardSummary(Boolean(isAdmin));
  useAdminOrdersRealtime(Boolean(isAdmin));

  if (!isAdmin) return null;

  if (summary.isLoading) {
    return <p className="text-stone-600 dark:text-zinc-400">Chargement des indicateurs…</p>;
  }

  if (summary.error) {
    return <p className="text-red-600 dark:text-red-400">{summary.error.message}</p>;
  }

  const s = summary.data!;

  return (
    <div className="space-y-8">
      <section aria-label="Indicateurs globaux">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Aujourd’hui (Tunis)</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="wt-card rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">En attente</p>
            <p className="mt-1 text-3xl font-bold text-amber-800 dark:text-amber-300">{s.pending_count}</p>
            <p className="mt-1 text-xs text-stone-600 dark:text-zinc-500">Tous magasins</p>
          </div>
          <div className="wt-card rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">Commandes actives</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{s.active_count}</p>
            <p className="mt-1 text-xs text-stone-600 dark:text-zinc-500">Hors livrées / annulées</p>
          </div>
          <div className="wt-card rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">Commandes du jour</p>
            <p className="mt-1 text-3xl font-bold text-wt-bordeaux dark:text-wt-accent">{s.orders_today}</p>
            <p className="mt-1 text-xs text-stone-600 dark:text-zinc-500">Créées aujourd’hui</p>
          </div>
          <div className="wt-card rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">CA du jour</p>
            <p className="mt-1 text-3xl font-bold text-wt-bordeaux dark:text-wt-accent">{fmtMoney(s.revenue_today_tnd)}</p>
            <p className="mt-1 text-xs text-stone-600 dark:text-zinc-500">Hors annulées</p>
          </div>
        </div>
      </section>

      <section aria-label="Fenêtre 7 jours">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">7 derniers jours</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="wt-card rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
            <p className="text-sm text-stone-600 dark:text-zinc-400">Nombre de commandes</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{s.orders_last_7_days}</p>
          </div>
          <div className="wt-card rounded-xl border border-stone-200 p-4 dark:border-zinc-800">
            <p className="text-sm text-stone-600 dark:text-zinc-400">Chiffre d’affaires</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fmtMoney(s.revenue_last_7_days_tnd)}</p>
          </div>
        </div>
      </section>

      <section aria-label="Réseau">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Points de vente</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          {s.stores_active} actif{s.stores_active !== 1 ? "s" : ""} sur {s.stores_total} enregistré{s.stores_total !== 1 ? "s" : ""}
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 dark:border-zinc-800">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">Magasin</th>
                <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">En attente</th>
                <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">Actives</th>
                <th className="px-4 py-3 font-semibold text-zinc-800 dark:text-zinc-200">CA 7 j.</th>
              </tr>
            </thead>
            <tbody>
              {s.by_store.map((row) => (
                <tr key={row.store_id} className="border-b border-stone-100 dark:border-zinc-800/80">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{row.store_name}</td>
                  <td className="px-4 py-3 tabular-nums text-stone-700 dark:text-zinc-300">{row.pending}</td>
                  <td className="px-4 py-3 tabular-nums text-stone-700 dark:text-zinc-300">{row.active}</td>
                  <td className="px-4 py-3 tabular-nums text-stone-700 dark:text-zinc-300">{fmtMoney(row.revenue_7d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
