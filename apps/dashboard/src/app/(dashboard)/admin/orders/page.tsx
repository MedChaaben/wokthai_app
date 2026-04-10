"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useOrders,
  useStaffProfile,
  useAdminOrdersRealtime,
  fetchAllStores,
  useSupabase,
  formatCustomerDisplayName,
  normalizeCustomerPhone,
  phoneStorageToDisplay,
  type OrderListRow,
  type OrderRow,
} from "@wokthai/shared";

const STATUS_LABEL: Record<OrderRow["status"], string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_STYLE: Record<OrderRow["status"], string> = {
  pending:
    "bg-amber-100 text-amber-900 ring-amber-200/80 dark:bg-amber-950/55 dark:text-amber-200 dark:ring-amber-800/40",
  confirmed:
    "bg-sky-100 text-sky-900 ring-sky-200/80 dark:bg-sky-950/55 dark:text-sky-200 dark:ring-sky-800/40",
  preparing:
    "bg-orange-100 text-orange-900 ring-orange-200/80 dark:bg-orange-950/55 dark:text-orange-200 dark:ring-orange-800/40",
  ready:
    "bg-emerald-100 text-emerald-900 ring-emerald-200/80 dark:bg-emerald-950/55 dark:text-emerald-200 dark:ring-emerald-800/40",
  delivering:
    "bg-indigo-100 text-indigo-900 ring-indigo-200/80 dark:bg-indigo-950/55 dark:text-indigo-200 dark:ring-indigo-800/40",
  delivered: "bg-zinc-100 text-zinc-700 ring-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-600/50",
  cancelled:
    "bg-red-50 text-red-800 line-through ring-red-200/80 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900/40",
};

const STATUS_ORDER: Record<OrderRow["status"], number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  delivering: 4,
  delivered: 10,
  cancelled: 11,
};

const TERMINAL: OrderRow["status"][] = ["delivered", "cancelled"];

const PIPELINE_STATUSES: OrderRow["status"][] = ["pending", "confirmed", "preparing", "ready", "delivering"];

const SOURCE_LABEL: Record<string, string> = {
  app: "App",
  pos: "Caisse",
  other: "Autre",
};

type ViewMode = "active" | "history" | "all";

function placeSummary(o: OrderListRow): string {
  if (o.type === "delivery") {
    const a = o.addresses;
    if (a) return `${a.label} · ${a.address}, ${a.city}`;
    if (o.guest_delivery_address && o.guest_delivery_city) {
      const lab = o.guest_delivery_label?.trim() || "Livraison";
      return `${lab} · ${o.guest_delivery_address}, ${o.guest_delivery_city}`;
    }
    return "Livraison — adresse non disponible";
  }
  const s = o.stores;
  if (!s) return "À emporter — lieu inconnu";
  return `${s.name} · ${s.address}, ${s.city}`;
}

function sortOrders(a: OrderListRow, b: OrderListRow): number {
  const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (so !== 0) return so;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function normalizeDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function orderMatchesClientQuery(o: OrderListRow, queryRaw: string): boolean {
  const q = queryRaw.trim().toLowerCase();
  if (!q) return true;
  const u = o.users;
  const phoneShown = u?.phone != null ? phoneStorageToDisplay(u.phone) : "";
  const guestPhone = o.guest_phone?.trim() ?? "";
  const chunks = [
    formatCustomerDisplayName(u),
    u?.first_name ?? "",
    u?.last_name ?? "",
    u?.email ?? "",
    u?.phone ?? "",
    phoneShown,
    guestPhone,
    guestPhone ? phoneStorageToDisplay(guestPhone) : "",
    o.stores?.name ?? "",
    o.id,
  ];
  const haystack = chunks.join(" \n ").toLowerCase();
  if (haystack.includes(q)) return true;
  const qDigits = normalizeDigits(q);
  if (qDigits.length >= 2 && u?.phone) {
    const normalizedKey = normalizeCustomerPhone(u.phone) ?? "";
    const phoneDigits = normalizedKey || normalizeDigits(u.phone);
    if (phoneDigits.includes(qDigits)) return true;
  }
  if (qDigits.length >= 2 && guestPhone) {
    const gKey = normalizeCustomerPhone(guestPhone) ?? "";
    const gDigits = gKey || normalizeDigits(guestPhone);
    if (gDigits.includes(qDigits)) return true;
  }
  return false;
}

function shortOrderRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function customerPhoneLine(o: OrderListRow): string | null {
  const u = o.users;
  if (u?.phone) return phoneStorageToDisplay(u.phone);
  const g = o.guest_phone?.trim();
  if (g) return phoneStorageToDisplay(g);
  return null;
}

function OrdersSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="h-40 rounded-3xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 w-28 shrink-0 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        ))}
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const staff = useStaffProfile();
  const supabase = useSupabase();
  const isAdmin = staff.data?.role === "platform_admin";

  const storesQuery = useQuery({
    queryKey: ["admin", "stores", "all"],
    queryFn: () => fetchAllStores(supabase),
    enabled: Boolean(isAdmin),
  });

  const [storeFilter, setStoreFilter] = useState<string>("");
  const storeIdForQuery = storeFilter || null;

  const orders = useOrders({
    mode: "admin",
    storeId: storeIdForQuery,
    enabled: Boolean(isAdmin),
  });

  useAdminOrdersRealtime(Boolean(isAdmin));

  const [view, setView] = useState<ViewMode>("active");
  const [statusFilter, setStatusFilter] = useState<OrderRow["status"] | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "delivery" | "pickup">("all");
  const [clientSearch, setClientSearch] = useState("");

  const list = useMemo(() => orders.data ?? [], [orders.data]);

  const statusCounts = useMemo(() => {
    const c: Record<OrderRow["status"], number> = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivering: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of list) c[o.status]++;
    return c;
  }, [list]);

  const activeTotal = useMemo(() => list.filter((o) => !TERMINAL.includes(o.status)).length, [list]);
  const historyTotal = useMemo(() => list.filter((o) => TERMINAL.includes(o.status)).length, [list]);

  const searchActive = clientSearch.trim().length > 0;

  const filtered = useMemo(() => {
    let rows = [...list];
    if (clientSearch.trim()) {
      rows = rows.filter((o) => orderMatchesClientQuery(o, clientSearch));
    } else {
      if (view === "active") rows = rows.filter((o) => !TERMINAL.includes(o.status));
      else if (view === "history") rows = rows.filter((o) => TERMINAL.includes(o.status));
    }
    if (statusFilter !== "all") rows = rows.filter((o) => o.status === statusFilter);
    if (typeFilter === "delivery") rows = rows.filter((o) => o.type === "delivery");
    if (typeFilter === "pickup") rows = rows.filter((o) => o.type === "pickup");
    rows.sort(sortOrders);
    return rows;
  }, [list, view, statusFilter, typeFilter, clientSearch]);

  function applyStatusChip(s: OrderRow["status"] | "all") {
    if (s === "all") {
      setStatusFilter("all");
      return;
    }
    setStatusFilter((prev) => (prev === s ? "all" : s));
    if (TERMINAL.includes(s)) {
      setView((v) => (v === "active" ? "history" : v));
    } else {
      setView("active");
    }
  }

  if (!isAdmin) return null;

  if (orders.isLoading || storesQuery.isLoading) {
    return <OrdersSkeleton />;
  }

  if (orders.error) {
    return (
      <div className="wt-panel rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <p className="font-semibold">Impossible de charger les commandes</p>
        <p className="mt-1 text-sm opacity-90">{orders.error.message}</p>
      </div>
    );
  }

  const stores = storesQuery.data ?? [];

  return (
    <div className="-mx-4 space-y-10 px-4 pb-8 md:-mx-8 md:px-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white via-wt-bordeaux-muted/30 to-zinc-50 px-6 py-8 shadow-sm dark:border-zinc-700/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.5)] sm:px-10 sm:py-9">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-wt-bordeaux/10 blur-3xl dark:bg-wt-accent/12"
          aria-hidden
        />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-wt-bordeaux dark:text-wt-accent">Commandes</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300/95">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Temps réel
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Toutes les commandes</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Filtrez par restaurant ou parcourez le réseau entier. Chaque ligne ouvre la fiche détail (même écran que côté restaurant).
            </p>
            {storesQuery.isError ? (
              <p className="mt-4 max-w-xl rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200/95">
                Liste des magasins indisponible — filtre « tous les PDV » conservé. ({storesQuery.error?.message})
              </p>
            ) : null}
          </div>

          <div className="w-full shrink-0 lg:max-w-sm">
            <label htmlFor="admin-store-filter" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-500">
              Point de vente
            </label>
            <div className="mt-2 rounded-2xl border border-zinc-200/90 bg-white/90 p-1 shadow-sm backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/90">
              <select
                id="admin-store-filter"
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="w-full cursor-pointer rounded-xl border-0 bg-transparent px-4 py-3 text-sm font-medium text-zinc-900 outline-none ring-0 dark:text-zinc-100"
              >
                <option value="">Tous les points de vente</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} · {st.city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline + volumes */}
      <section aria-label="Répartition des statuts">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Pipeline</p>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Charge par statut</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">Cliquer filtre la liste · second clic réinitialise</p>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter("all");
            }}
            className={`flex min-w-[7.5rem] shrink-0 flex-col rounded-2xl border px-4 py-3 text-left transition ${
              view === "active" && statusFilter === "all"
                ? "border-wt-bordeaux/50 bg-wt-bordeaux/10 ring-2 ring-wt-bordeaux/25 dark:border-wt-accent/40 dark:bg-wt-accent/15 dark:ring-wt-accent/20"
                : "wt-panel border-zinc-200/90 dark:border-zinc-700/80"
            }`}
          >
            <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{activeTotal}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">En cours</span>
          </button>
          {PIPELINE_STATUSES.map((st) => {
            const n = statusCounts[st];
            const sel = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => applyStatusChip(st)}
                className={`flex min-w-[7.5rem] shrink-0 flex-col rounded-2xl border px-4 py-3 text-left transition ${
                  sel
                    ? "border-amber-400/60 bg-amber-50 ring-2 ring-amber-300/50 dark:border-amber-700/50 dark:bg-amber-950/40 dark:ring-amber-800/40"
                    : "wt-panel border-zinc-200/90 dark:border-zinc-700/80"
                }`}
              >
                <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{n}</span>
                <span className="text-[11px] font-medium leading-tight text-zinc-600 dark:text-zinc-400">{STATUS_LABEL[st]}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setView("history");
              setStatusFilter("all");
            }}
            className={`flex min-w-[7.5rem] shrink-0 flex-col rounded-2xl border px-4 py-3 text-left transition ${
              view === "history" && statusFilter === "all"
                ? "border-zinc-400/70 bg-zinc-100 ring-2 ring-zinc-300/60 dark:border-zinc-600 dark:bg-zinc-800 dark:ring-zinc-600/50"
                : "wt-panel border-zinc-200/90 dark:border-zinc-700/80"
            }`}
          >
            <span className="text-2xl font-bold tabular-nums text-zinc-800 dark:text-zinc-200">{historyTotal}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Historique</span>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["delivered", STATUS_LABEL.delivered],
              ["cancelled", STATUS_LABEL.cancelled],
            ] as const
          ).map(([st, label]) => {
            const n = statusCounts[st];
            const sel = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => applyStatusChip(st)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  sel
                    ? "border-zinc-500 bg-zinc-200 text-zinc-900 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100"
                    : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                <span>{label}</span>
                <span className="tabular-nums opacity-80">{n}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sticky toolbar — pleine largeur, fond opaque, pas de coins arrondis (évite les fuites au scroll) */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-zinc-200 bg-background px-4 py-4 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.5)] md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Vue liste">
          {(
            [
              ["active", "En cours"],
              ["all", "Toutes"],
              ["history", "Historique"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setView(key);
                if (key !== "active") setStatusFilter("all");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === key
                  ? "bg-wt-bordeaux text-white shadow-sm dark:bg-wt-accent"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "Types · tous"],
              ["delivery", "Livraison"],
              ["pickup", "À emporter"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTypeFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                typeFilter === key ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label htmlFor="admin-client-search" className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Recherche
        </label>
        <input
          id="admin-client-search"
          type="search"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          placeholder="Client, téléphone, e-mail, magasin, réf. commande…"
          className="mt-2 w-full max-w-xl rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-wt-bordeaux/50 focus:outline-none focus:ring-2 focus:ring-wt-bordeaux/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-wt-accent/50 dark:focus:ring-wt-accent/20"
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{filtered.length}</span>
          <span className="ml-2 text-zinc-500 dark:text-zinc-400">
            commande{filtered.length !== 1 ? "s" : ""}
            {searchActive ? " · recherche" : ""}
          </span>
        </p>
      </div>

      <ul className="space-y-3">
        {filtered.length === 0 ? (
          <li className="wt-dashed-empty p-12 text-center text-zinc-600 dark:text-zinc-400">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">Aucun résultat</p>
            <p className="mt-2 text-sm">Élargissez la vue, retirez un filtre de statut ou effacez la recherche.</p>
          </li>
        ) : (
          filtered.map((o) => {
            const src = o.source ?? "app";
            const srcLabel = SOURCE_LABEL[src] ?? src;
            const phoneLine = customerPhoneLine(o);
            return (
              <li key={o.id} className="group relative">
                <Link
                  href={`/orders/${o.id}`}
                  className="absolute inset-0 z-0 rounded-2xl"
                  aria-label={`Commande ${shortOrderRef(o.id)}`}
                />
                <div
                  className={`pointer-events-none relative z-10 flex flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm transition-[box-shadow,transform] duration-200 group-hover:border-zinc-300/90 group-hover:shadow-md dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:group-hover:border-zinc-600 ${
                    o.type === "delivery" ? "border-l-[3px] border-l-wt-bordeaux dark:border-l-wt-accent" : "border-l-[3px] border-l-zinc-300 dark:border-l-zinc-600"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_STYLE[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {o.type === "delivery" ? "Livraison" : "Retrait"}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {srcLabel}
                        </span>
                        {o.has_upsell ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Upsell
                          </span>
                        ) : null}
                        {o.stores?.name ? (
                          <span className="max-w-[12rem] truncate rounded-full bg-wt-bordeaux/10 px-2 py-0.5 text-xs font-semibold text-wt-bordeaux dark:bg-wt-accent/15 dark:text-wt-accent">
                            {o.stores.name}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="truncate text-lg font-bold text-zinc-900 dark:text-zinc-50">
                          {formatCustomerDisplayName(o.users)}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          Réf. {shortOrderRef(o.id)}
                        </p>
                      </div>
                      {phoneLine ? (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{phoneLine}</p>
                      ) : null}
                      <p className="text-sm leading-snug text-zinc-600 dark:text-zinc-400">{placeSummary(o)}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500">
                        {new Date(o.created_at).toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-row items-center justify-between gap-4 md:flex-col md:items-end">
                      <p className="text-xl font-bold tabular-nums text-wt-bordeaux dark:text-wt-accent md:text-2xl">
                        {Number(o.total_price).toFixed(2)}&nbsp;TND
                      </p>
                      <span className="pointer-events-none hidden text-xs font-semibold text-wt-bordeaux opacity-0 transition group-hover:opacity-100 dark:text-wt-accent md:inline">
                        Ouvrir →
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
