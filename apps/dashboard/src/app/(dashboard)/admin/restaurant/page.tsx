"use client";

import { useStaffProfile, useAdminRestaurantBusiness } from "@wokthai/shared";

function fmtMoney(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return `${n.toFixed(2)} TND`;
}

function fmtPct(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(1)} %`;
}

function evolutionLabel(pct: number): { text: string; good: boolean } {
  if (pct > 0.005) return { text: `+${(pct * 100).toFixed(0)} % vs la semaine d’avant`, good: true };
  if (pct < -0.005) return { text: `${(pct * 100).toFixed(0)} % vs la semaine d’avant`, good: false };
  return { text: "Stable vs la semaine d’avant", good: true };
}

export default function AdminRestaurantBusinessPage() {
  const staff = useStaffProfile();
  const isAdmin = staff.data?.role === "platform_admin";
  const q = useAdminRestaurantBusiness(Boolean(isAdmin));

  if (!isAdmin) return null;

  if (q.isLoading) {
    return <p className="text-stone-600 dark:text-zinc-400">Chargement…</p>;
  }
  if (q.error) {
    return <p className="text-red-600 dark:text-red-400">{q.error.message}</p>;
  }

  const b = q.data!;
  const mt = b.money_today;
  const mw = b.money_week;
  const perf = b.performance;
  const up = b.upsell_7d;
  const cl = b.clients;
  const evo = evolutionLabel(Number(perf.app_orders_evolution_pct));
  const extraUpsell = Number(up.estimated_extra_revenue_tnd);
  const headline =
    extraUpsell > 0
      ? `Sur 7 jours, l’upsell représente environ ${extraUpsell.toFixed(0)} TND de panier en plus (estimation).`
      : "Les chiffres s’affineront dès plus de commandes avec upsell.";

  const funnelV = b.funnel_events_7d.view_product ?? 0;
  const funnelA = b.funnel_events_7d.add_to_cart ?? 0;
  const funnelO = b.funnel_events_7d.order_completed ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300/90">{headline}</p>

      <section className="wt-card rounded-2xl border border-stone-200 p-5 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">
          Argent
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">Aujourd’hui (app)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-stone-600 dark:text-zinc-400">Chiffre d’affaires</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmtMoney(mt.revenue_tnd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-stone-600 dark:text-zinc-400">Commandes</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {mt.orders_count}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-stone-600 dark:text-zinc-400">Panier moyen</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {fmtMoney(mt.avg_basket_tnd)}
            </p>
          </div>
        </div>
        <div className="mt-6 border-t border-stone-100 pt-5 dark:border-zinc-800">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Ces 7 jours (lun → aujourd’hui, Tunis)</p>
          <div className="mt-3 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-stone-500 dark:text-zinc-500">CA</p>
              <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                {fmtMoney(mw.revenue_tnd)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-zinc-500">Commandes</p>
              <p className="text-lg font-bold tabular-nums">{mw.orders_count}</p>
            </div>
            <div>
              <p className="text-xs text-stone-500 dark:text-zinc-500">Panier moyen</p>
              <p className="text-lg font-bold tabular-nums">{fmtMoney(mw.avg_basket_tnd)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="wt-card rounded-2xl border border-stone-200 p-5 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">
          Performance
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">L’app dans le total</h2>
        <p className="mt-3 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
          {fmtPct(perf.app_share_7d)} <span className="text-base font-semibold text-stone-600 dark:text-zinc-400">des commandes (7 j.)</span>
        </p>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
          {perf.app_orders_7d} commandes app sur {perf.all_orders_7d} au total (hors annulées).
        </p>
        <p
          className={`mt-3 text-sm font-semibold ${evo.good ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {evo.text}
        </p>
        <p className="mt-4 text-xs text-stone-500 dark:text-zinc-500">
          Conversion événements (7 j.) : {fmtPct(Number(b.conversion_add_to_cart_to_order))} des « add_to_cart » mènent à un «
          order_completed » (tracking app).
        </p>
      </section>

      <section className="wt-card rounded-2xl border border-stone-200 p-5 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">Upsell</p>
        <h2 className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">Impact des suggestions</h2>
        <p className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{fmtPct(up.rate)}</p>
        <p className="text-sm text-stone-600 dark:text-zinc-400">des commandes app (7 j.) avec au moins un article upsell</p>
        <div className="mt-4 grid gap-2 text-sm text-stone-700 dark:text-zinc-300">
          <p>
            Panier moyen avec upsell : <strong>{fmtMoney(up.avg_with_upsell_tnd)}</strong>
          </p>
          <p>
            Panier moyen sans upsell : <strong>{fmtMoney(up.avg_without_upsell_tnd)}</strong>
          </p>
          <p className="text-emerald-800 dark:text-emerald-300/90">
            Estimation contribution upsell (7 j.) : <strong>{fmtMoney(up.estimated_extra_revenue_tnd)}</strong>
          </p>
        </div>
      </section>

      <section className="wt-card rounded-2xl border border-stone-200 p-5 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">Clients</p>
        <h2 className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">Fidélité</h2>
        <div className="mt-4 space-y-2 text-sm text-stone-700 dark:text-zinc-300">
          <p>
            <strong>{cl.users_with_orders}</strong> clients avec au moins une commande (hors invités)
          </p>
          <p>
            <strong>{fmtPct(cl.repeat_rate)}</strong> ont commandé 2 fois ou plus
          </p>
          <p>
            <strong>{Number(cl.orders_per_user).toFixed(2)}</strong> commandes / client en moyenne
          </p>
        </div>
      </section>

      <section className="wt-card rounded-2xl border border-stone-200 p-5 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">Funnel (app)</p>
        <h2 className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">Vue produit → panier → commande</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">Comptage des événements sur 7 jours</p>
        <ul className="mt-4 space-y-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <li>Vue produit : {funnelV}</li>
          <li>Ajout panier : {funnelA}</li>
          <li>Commande validée : {funnelO}</li>
        </ul>
      </section>

      {b.top_products_30d.length > 0 ? (
        <section className="wt-card rounded-2xl border border-stone-200 p-5 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">Top produits</p>
          <h2 className="mt-1 text-xl font-extrabold text-zinc-900 dark:text-zinc-100">30 derniers jours</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-800 dark:text-zinc-200">
            {b.top_products_30d.map((row) => (
              <li key={row.product_name}>
                {row.product_name}{" "}
                <span className="text-stone-500 dark:text-zinc-500">({row.total_qty} vendus)</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
