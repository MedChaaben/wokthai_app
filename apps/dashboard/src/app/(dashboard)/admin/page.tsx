"use client";

import { useStaffProfile, useAdminDashboardSummary, useAdminOrdersRealtime } from "@wokthai/shared";
import type { AdminDashboardByStore, AdminDashboardSummary } from "@wokthai/shared";

function fmtMoney(v: string | number): string {
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "—";
  return `${n.toFixed(2)} TND`;
}

function toNum(v: string | number): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isNaN(n) ? 0 : n;
}

function KpiTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "amber" | "slate" | "bordeaux" | "emerald";
}) {
  const accentClass =
    accent === "amber"
      ? "from-amber-500/14 via-amber-500/5 to-transparent dark:from-amber-400/12"
      : accent === "bordeaux"
        ? "from-wt-bordeaux/12 via-wt-bordeaux/5 to-transparent dark:from-wt-accent/16"
        : accent === "emerald"
          ? "from-emerald-500/12 via-emerald-500/5 to-transparent dark:from-emerald-400/12"
          : "from-zinc-500/8 via-transparent to-transparent dark:from-zinc-400/10";

  const display = typeof value === "number" ? value.toLocaleString("fr-TN") : value;

  return (
    <div
      className={`wt-panel relative overflow-hidden rounded-2xl border border-zinc-200/90 p-5 dark:border-zinc-700/80 ${accent ? `bg-gradient-to-br ${accentClass}` : ""}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums tracking-tight ${
          accent === "amber"
            ? "text-amber-900 dark:text-amber-200"
            : accent === "bordeaux"
              ? "text-wt-bordeaux dark:text-wt-accent"
              : "text-zinc-900 dark:text-zinc-50"
        }`}
      >
        {display}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="h-36 rounded-3xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-48 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 lg:col-span-7" />
        <div className="h-48 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 lg:col-span-5" />
      </div>
      <div className="h-64 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
    </div>
  );
}

function StoreRevenueBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex min-w-[6rem] flex-col items-end gap-1 sm:min-w-[8rem]">
      <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{fmtMoney(value)}</span>
      <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-wt-bordeaux to-wt-bordeaux-hover dark:from-wt-accent dark:to-wt-accent-hover"
          style={{ width: `${pct}%`, minWidth: value > 0 ? "4px" : "0" }}
        />
      </div>
    </div>
  );
}

function StoresTable({ rows, maxRevenue }: { rows: AdminDashboardByStore[]; maxRevenue: number }) {
  if (rows.length === 0) {
    return (
      <div className="wt-dashed-empty text-sm text-zinc-600 dark:text-zinc-400">
        Aucun point de vente enregistré pour le moment.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200/90 dark:border-zinc-700/80">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/90">
            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
              Restaurant
            </th>
            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
              En attente
            </th>
            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
              Actives
            </th>
            <th className="px-5 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
              CA 7 j.
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rev = toNum(row.revenue_7d);
            const pendingHot = row.pending > 0;
            return (
              <tr
                key={row.store_id}
                className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-wt-bordeaux/10 text-xs font-bold text-wt-bordeaux dark:bg-wt-accent/15 dark:text-wt-accent">
                      {row.store_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{row.store_name}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-flex min-w-[2rem] items-center justify-center rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
                      pendingHot
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {row.pending}
                  </span>
                </td>
                <td className="px-5 py-4 tabular-nums font-medium text-zinc-800 dark:text-zinc-200">{row.active}</td>
                <td className="px-5 py-4 text-right">
                  <StoreRevenueBar value={rev} max={maxRevenue} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildInsights(s: AdminDashboardSummary): { variant: "amber" | "emerald" | "zinc"; text: string } | null {
  if (s.pending_count >= 5) {
    return {
      variant: "amber",
      text: `${s.pending_count} commandes en attente sur le réseau — vérifier la charge cuisine / caisse.`,
    };
  }
  if (s.pending_count > 0) {
    return {
      variant: "amber",
      text: `${s.pending_count} commande${s.pending_count > 1 ? "s" : ""} en attente de prise en charge.`,
    };
  }
  if (s.orders_today > 0 && s.stores_active > 0) {
    return {
      variant: "emerald",
      text: `Activité du jour : ${s.orders_today} commande${s.orders_today > 1 ? "s" : ""} créée${s.orders_today > 1 ? "s" : ""}, réseau opérationnel.`,
    };
  }
  if (s.stores_active === 0 && s.stores_total > 0) {
    return { variant: "amber", text: "Aucun point de vente actif — activer un restaurant pour recevoir des commandes." };
  }
  return {
    variant: "zinc",
    text: "Vue consolidée : tous canaux (app, caisse, autres) — fuseau Africa/Tunis.",
  };
}

export default function AdminOverviewPage() {
  const staff = useStaffProfile();
  const isAdmin = staff.data?.role === "platform_admin";
  const summary = useAdminDashboardSummary(Boolean(isAdmin));
  useAdminOrdersRealtime(Boolean(isAdmin));

  if (!isAdmin) return null;

  if (summary.isLoading) {
    return <OverviewSkeleton />;
  }

  if (summary.error) {
    return (
      <div className="wt-panel rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <p className="font-semibold">Impossible de charger le tableau de bord</p>
        <p className="mt-1 text-sm opacity-90">{summary.error.message}</p>
      </div>
    );
  }

  const s = summary.data!;
  const rev7 = toNum(s.revenue_last_7_days_tnd);
  const orders7 = s.orders_last_7_days;
  const avgBasket7 = orders7 > 0 ? rev7 / orders7 : 0;
  const revToday = toNum(s.revenue_today_tnd);
  const avgBasketToday = s.orders_today > 0 ? revToday / s.orders_today : 0;

  const storeRevenues = s.by_store.map((r) => toNum(r.revenue_7d));
  const maxStoreRev = Math.max(...storeRevenues, 1);
  const totalPendingStores = s.by_store.filter((r) => r.pending > 0).length;

  const insight = buildInsights(s);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white via-wt-bordeaux-muted/35 to-zinc-50 px-6 py-8 shadow-sm dark:border-zinc-700/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.5)] sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-wt-bordeaux/10 blur-3xl dark:bg-wt-accent/12"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-wt-bordeaux dark:text-wt-accent">Siège</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300/95">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Temps réel
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Vue d’ensemble</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Pilotage multi-restaurants : files d’attente, charge opérationnelle et chiffres consolidés (tous canaux). Les totaux du jour sont
              calculés en fuseau <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Africa/Tunis</strong>.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white/80 px-5 py-4 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Réseau</p>
            <p className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {s.stores_active}
              <span className="text-lg font-semibold text-zinc-400 dark:text-zinc-500">/{s.stores_total}</span>
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">points de vente actifs</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-wt-bordeaux dark:bg-wt-accent"
                style={{
                  width: `${s.stores_total > 0 ? (s.stores_active / s.stores_total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {insight ? (
          <div
            className={`relative mt-8 max-w-3xl rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
              insight.variant === "amber"
                ? "border-amber-200/90 bg-amber-50/95 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/35 dark:text-amber-100/95"
                : insight.variant === "emerald"
                  ? "border-emerald-200/90 bg-emerald-50/95 text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/35 dark:text-emerald-100/95"
                  : "border-zinc-200/90 bg-zinc-50/90 text-zinc-800 dark:border-zinc-700/80 dark:bg-zinc-950/50 dark:text-zinc-200"
            }`}
          >
            <span className="font-semibold">Insight · </span>
            {insight.text}
          </div>
        ) : null}
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="En attente" value={s.pending_count} hint="Tous restaurants · à traiter" accent="amber" />
        <KpiTile label="Commandes actives" value={s.active_count} hint="Hors livrées / annulées" accent="slate" />
        <KpiTile label="Commandes du jour" value={s.orders_today} hint="Créées aujourd’hui (Tunis)" accent="bordeaux" />
        <KpiTile label="CA du jour" value={fmtMoney(s.revenue_today_tnd)} hint="Hors annulées · tous canaux" accent="emerald" />
      </div>

      {/* Bento : aujourd'hui detail + 7 jours */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="wt-panel relative overflow-hidden rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-7">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-wt-bordeaux/[0.06] dark:bg-wt-accent/10" aria-hidden />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Aujourd’hui</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">Synthèse opérationnelle</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {totalPendingStores > 0
                ? `${totalPendingStores} point${totalPendingStores > 1 ? "s" : ""} de vente avec au moins une commande en attente.`
                : "Aucune commande en attente sur le réseau."}
            </p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Panier moyen (jour)</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {s.orders_today > 0 ? fmtMoney(avgBasketToday) : "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/50">
                <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-500">File réseau</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-amber-900 dark:text-amber-200">{s.pending_count}</dd>
                <dd className="text-xs text-zinc-500">en attente globale</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="wt-panel flex flex-col justify-between rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80 lg:col-span-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Fenêtre glissante</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">7 derniers jours</h2>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">Tous canaux · rolling depuis maintenant (UTC serveur)</p>
          </div>
          <dl className="mt-6 space-y-4">
            <div className="flex items-end justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Commandes</dt>
              <dd className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{orders7.toLocaleString("fr-TN")}</dd>
            </div>
            <div className="flex items-end justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Chiffre d’affaires</dt>
              <dd className="text-2xl font-bold tabular-nums text-wt-bordeaux dark:text-wt-accent">{fmtMoney(s.revenue_last_7_days_tnd)}</dd>
            </div>
            <div className="flex items-end justify-between">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Panier moyen</dt>
              <dd className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                {orders7 > 0 ? fmtMoney(avgBasket7) : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Réseau */}
      <section className="wt-panel rounded-2xl border border-zinc-200/90 p-6 dark:border-zinc-700/80" aria-label="Réseau">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Réseau</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">Points de vente</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {s.stores_active} actif{s.stores_active !== 1 ? "s" : ""} sur {s.stores_total} enregistré{s.stores_total !== 1 ? "s" : ""} · charge et
              CA 7 j. par site
            </p>
          </div>
        </div>
        <div className="mt-6">
          <StoresTable rows={s.by_store} maxRevenue={maxStoreRev} />
        </div>
      </section>
    </div>
  );
}
