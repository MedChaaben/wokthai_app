"use client";

import { useStaffProfile, useAdminRestaurantBusiness } from "@wokthai/shared";
import type { AdminRestaurantBusiness } from "@wokthai/shared";

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

function toNum(v: string | number): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isNaN(n) ? 0 : n;
}

function evolutionLabel(pct: number): { text: string; good: boolean } {
  if (pct > 0.005) return { text: `+${(pct * 100).toFixed(0)} % vs semaine précédente`, good: true };
  if (pct < -0.005) return { text: `${(pct * 100).toFixed(0)} % vs semaine précédente`, good: false };
  return { text: "Stable vs semaine précédente", good: true };
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "emerald" | "bordeaux" | "neutral";
}) {
  const accentClass =
    accent === "emerald"
      ? "from-emerald-500/12 via-emerald-500/5 to-transparent dark:from-emerald-400/15"
      : accent === "bordeaux"
        ? "from-wt-bordeaux/12 via-wt-bordeaux/5 to-transparent dark:from-wt-accent/18"
        : "from-zinc-500/8 via-transparent to-transparent dark:from-zinc-400/10";

  return (
    <div
      className={`wt-panel relative overflow-hidden rounded-2xl border border-zinc-200/90 p-5 dark:border-zinc-700/80 ${accent ? `bg-gradient-to-br ${accentClass}` : ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function FunnelBars({ view: v, add: a, order: o }: { view: number; add: number; order: number }) {
  const max = Math.max(v, a, o, 1);
  const steps = [
    { label: "Vue produit", n: v, color: "bg-zinc-400 dark:bg-zinc-500" },
    { label: "Ajout panier", n: a, color: "bg-wt-bordeaux/80 dark:bg-wt-accent/90" },
    { label: "Commande validée", n: o, color: "bg-emerald-600 dark:bg-emerald-500" },
  ];
  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <div key={s.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{s.label}</span>
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{s.n.toLocaleString("fr-TN")}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${s.color}`}
              style={{ width: `${(s.n / max) * 100}%`, minWidth: s.n > 0 ? "4px" : "0" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-24 rounded-3xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-64 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 lg:col-span-8" />
        <div className="h-64 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 lg:col-span-4" />
        <div className="h-72 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 lg:col-span-6" />
        <div className="h-72 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 lg:col-span-6" />
      </div>
    </div>
  );
}

function AppShareRing({ share }: { share: number }) {
  const pct = Math.min(100, Math.max(0, share * 100));
  const deg = (pct / 100) * 360;
  const ringLight = `conic-gradient(rgb(107 21 32) ${deg}deg, rgb(228 228 231) ${deg}deg)`;
  const ringDark = `conic-gradient(rgb(168 50 64) ${deg}deg, rgb(63 63 70) ${deg}deg)`;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative h-36 w-36 shrink-0">
        <div
          className="absolute inset-0 grid place-items-center rounded-full p-[10px] dark:hidden"
          style={{ background: ringLight }}
        >
          <div className="flex h-[calc(100%-10px)] w-[calc(100%-10px)] flex-col items-center justify-center rounded-full bg-white">
            <span className="text-2xl font-bold tabular-nums text-zinc-900">{fmtPct(share)}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">des cmd. app</span>
          </div>
        </div>
        <div
          className="absolute inset-0 hidden place-items-center rounded-full p-[10px] dark:grid"
          style={{ background: ringDark }}
        >
          <div className="flex h-[calc(100%-10px)] w-[calc(100%-10px)] flex-col items-center justify-center rounded-full bg-zinc-900">
            <span className="text-2xl font-bold tabular-nums text-zinc-50">{fmtPct(share)}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">des cmd. app</span>
          </div>
        </div>
      </div>
      <p className="max-w-xs text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-left">
        Part des commandes passées via l’application sur les 7 derniers jours (lun → aujourd’hui, Tunis), hors annulées.
      </p>
    </div>
  );
}

function TopProductsChart({ rows }: { rows: AdminRestaurantBusiness["top_products_30d"] }) {
  const max = Math.max(...rows.map((r) => r.total_qty), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row, i) => {
        const w = (row.total_qty / max) * 100;
        return (
          <li
            key={row.product_name}
            className="group rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-wt-bordeaux/10 text-xs font-bold text-wt-bordeaux dark:bg-wt-accent/15 dark:text-wt-accent">
                  {i + 1}
                </span>
                <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{row.product_name}</span>
              </div>
              <span className="shrink-0 tabular-nums text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                {row.total_qty} <span className="font-normal text-zinc-500">vendus</span>
              </span>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-wt-bordeaux to-wt-bordeaux-hover dark:from-wt-accent dark:to-wt-accent-hover"
                style={{ width: `${w}%`, minWidth: row.total_qty > 0 ? "6px" : "0" }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function AdminRestaurantBusinessPage() {
  const staff = useStaffProfile();
  const isAdmin = staff.data?.role === "platform_admin";
  const q = useAdminRestaurantBusiness(Boolean(isAdmin));

  if (!isAdmin) return null;

  if (q.isLoading) {
    return <DashboardSkeleton />;
  }
  if (q.error) {
    return (
      <div className="wt-panel rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <p className="font-semibold">Impossible de charger les indicateurs</p>
        <p className="mt-1 text-sm opacity-90">{q.error.message}</p>
      </div>
    );
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

  const share = toNum(perf.app_share_7d);
  const avgWith = toNum(up.avg_with_upsell_tnd);
  const avgWithout = toNum(up.avg_without_upsell_tnd);
  const basketMax = Math.max(avgWith, avgWithout, 1);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white via-wt-bordeaux-muted/40 to-zinc-50 px-6 py-8 shadow-sm dark:border-zinc-700/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.5)] sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-wt-bordeaux/10 blur-3xl dark:bg-wt-accent/15"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-wt-bordeaux dark:text-wt-accent">Vue restaurant</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Performance commerciale
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Tableau de bord exécutif : chiffres du jour, tendance sur 7 jours, impact de l’app et de l’upsell — prêt à présenter à vos
            partenaires.
          </p>
          <div className="mt-6 inline-flex max-w-full items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200/95">
            <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
            <span>{headline}</span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="CA aujourd’hui (app)" value={fmtMoney(mt.revenue_tnd)} hint={`${mt.orders_count} commandes`} accent="emerald" />
        <KpiTile label="Panier moyen · jour" value={fmtMoney(mt.avg_basket_tnd)} accent="neutral" />
        <KpiTile label="CA 7 jours" value={fmtMoney(mw.revenue_tnd)} hint={`${mw.orders_count} commandes · panier ${fmtMoney(mw.avg_basket_tnd)}`} />
        <KpiTile label="Part app (7 j.)" value={fmtPct(share)} hint={`${perf.app_orders_7d} / ${perf.all_orders_7d} commandes`} accent="bordeaux" />
      </div>

      {/* Bento grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Aujourd'hui — large */}
        <section className="wt-panel relative overflow-hidden rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-8">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-emerald-500/5 dark:bg-emerald-400/10" aria-hidden />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Aujourd’hui</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">Activité application</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Chiffre d’affaires</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{fmtMoney(mt.revenue_tnd)}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Commandes</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{mt.orders_count}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Panier moyen</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{fmtMoney(mt.avg_basket_tnd)}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Semaine — sidebar */}
        <section className="wt-panel flex flex-col justify-between rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Rolling 7 jours</p>
            <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">Lun → aujourd’hui</h2>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Fuseau Tunis</p>
          </div>
          <dl className="mt-6 space-y-4">
            <div className="flex items-end justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">CA cumulé</dt>
              <dd className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{fmtMoney(mw.revenue_tnd)}</dd>
            </div>
            <div className="flex items-end justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">Commandes</dt>
              <dd className="text-lg font-bold tabular-nums">{mw.orders_count}</dd>
            </div>
            <div className="flex items-end justify-between">
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">Panier moyen</dt>
              <dd className="text-lg font-bold tabular-nums">{fmtMoney(mw.avg_basket_tnd)}</dd>
            </div>
          </dl>
        </section>

        {/* Performance */}
        <section className="wt-panel rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Performance</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">L’app dans le total</h2>
          <div className="mt-6">
            <AppShareRing share={share} />
          </div>
          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400 sm:text-left">
            {perf.app_orders_7d} commandes app sur {perf.all_orders_7d} au total.
          </p>
          <p
            className={`mt-3 text-center text-sm font-semibold sm:text-left ${evo.good ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {evo.text}
          </p>
          <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-400">
            Conversion tracking (7 j.) : <strong className="text-zinc-800 dark:text-zinc-200">{fmtPct(Number(b.conversion_add_to_cart_to_order))}</strong> des
            « add_to_cart » mènent à un « order_completed ».
          </p>
        </section>

        {/* Upsell */}
        <section className="wt-panel rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Upsell</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">Impact des suggestions</h2>
          <p className="mt-4 text-4xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{fmtPct(up.rate)}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            des commandes app (7 j.) avec au moins un article upsell · {up.orders_with_upsell} / {up.orders_total}
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <span>Avec upsell</span>
                <span className="tabular-nums">{fmtMoney(up.avg_with_upsell_tnd)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                  style={{ width: `${(avgWith / basketMax) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <span>Sans upsell</span>
                <span className="tabular-nums">{fmtMoney(up.avg_without_upsell_tnd)}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-400 dark:bg-zinc-600"
                  style={{ width: `${(avgWithout / basketMax) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm font-medium text-emerald-800 dark:text-emerald-300/95">
            Estimation contribution upsell (7 j.) : <span className="tabular-nums">{fmtMoney(up.estimated_extra_revenue_tnd)}</span>
          </p>
        </section>

        {/* Clients */}
        <section className="wt-panel rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Clients</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">Fidélité</h2>
          <ul className="mt-6 space-y-4">
            <li className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Clients avec commande</span>
              <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{cl.users_with_orders}</span>
            </li>
            <li className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Taux de réachat (2+ cmd.)</span>
              <span className="text-xl font-bold tabular-nums text-wt-bordeaux dark:text-wt-accent">{fmtPct(cl.repeat_rate)}</span>
            </li>
            <li className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Commandes / client</span>
              <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{Number(cl.orders_per_user).toFixed(2)}</span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">Hors invités · comptes identifiés uniquement.</p>
        </section>

        {/* Funnel */}
        <section className="wt-panel rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Funnel application</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">Produit → panier → commande</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Événements agrégés sur 7 jours</p>
          <div className="mt-6">
            <FunnelBars view={funnelV} add={funnelA} order={funnelO} />
          </div>
        </section>

        {/* Top produits */}
        {b.top_products_30d.length > 0 ? (
          <section className="wt-panel rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-12">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Top produits</p>
                <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-50">30 derniers jours</h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">Classement par quantité vendue</p>
            </div>
            <div className="mt-6">
              <TopProductsChart rows={b.top_products_30d} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
