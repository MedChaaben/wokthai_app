"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import {
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

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Paiement à confirmer",
  paid_on_delivery: "Paiement à la livraison",
};

type ViewMode = "active" | "history" | "all";

type StoreOption = { id: string; name: string; city: string | null };

type AdminOrdersCommandCenterProps = {
  variant: "admin";
  ordersQuery: UseQueryResult<OrderListRow[], Error>;
  storesQuery: UseQueryResult<StoreOption[], Error>;
  storeFilter: string;
  onStoreFilterChange: (storeId: string) => void;
};

type StaffOrdersCommandCenterProps = {
  variant: "staff";
  ordersQuery: UseQueryResult<OrderListRow[], Error>;
  storeLabel: string;
};

export type OrdersCommandCenterProps = AdminOrdersCommandCenterProps | StaffOrdersCommandCenterProps;

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

function orderMatchesClientQuery(o: OrderListRow, queryRaw: string, includeStoreInSearch: boolean): boolean {
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
    ...(includeStoreInSearch ? [o.stores?.name ?? ""] : []),
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

function formatOrderWhen(iso: string): { relative: string; absolute: string } {
  const d = new Date(iso);
  const abs = d.toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" });
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffSec = Math.round(diffMs / 1000);
  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const absSec = Math.abs(diffSec);
  const minute = 60;
  const hour = 3600;
  const day = 86400;
  let relative: string;
  if (absSec < 45) relative = "à l’instant";
  else if (absSec < minute * 45) relative = rtf.format(Math.round(diffSec / minute), "minute");
  else if (absSec < hour * 36) relative = rtf.format(Math.round(diffSec / hour), "hour");
  else if (absSec < day * 25) relative = rtf.format(Math.round(diffSec / day), "day");
  else relative = rtf.format(Math.round(diffSec / day), "day");
  return { relative, absolute: abs };
}

function sumFilteredTotal(rows: OrderListRow[]): number {
  let s = 0;
  for (const o of rows) {
    const n = Number(o.total_price);
    if (!Number.isNaN(n)) s += n;
  }
  return s;
}

export function OrdersCommandCenterSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-36 rounded-3xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-20 w-24 shrink-0 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        ))}
      </div>
      <div className="h-24 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        ))}
      </div>
    </div>
  );
}

export function OrdersCommandCenter(props: OrdersCommandCenterProps) {
  const { ordersQuery } = props;
  const [view, setView] = useState<ViewMode>("active");
  const [statusFilter, setStatusFilter] = useState<OrderRow["status"] | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "delivery" | "pickup">("all");
  const [clientSearch, setClientSearch] = useState("");
  const [pipelineOpen, setPipelineOpen] = useState(true);

  const list = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const includeStoreInSearch = props.variant === "admin";

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
      rows = rows.filter((o) => orderMatchesClientQuery(o, clientSearch, includeStoreInSearch));
    } else {
      if (view === "active") rows = rows.filter((o) => !TERMINAL.includes(o.status));
      else if (view === "history") rows = rows.filter((o) => TERMINAL.includes(o.status));
    }
    if (statusFilter !== "all") rows = rows.filter((o) => o.status === statusFilter);
    if (typeFilter === "delivery") rows = rows.filter((o) => o.type === "delivery");
    if (typeFilter === "pickup") rows = rows.filter((o) => o.type === "pickup");
    rows.sort(sortOrders);
    return rows;
  }, [list, view, statusFilter, typeFilter, clientSearch, includeStoreInSearch]);

  const filteredTotalTnd = useMemo(() => sumFilteredTotal(filtered), [filtered]);

  const storeFilterActive = props.variant === "admin" && Boolean(props.storeFilter);

  const filtersDirty =
    storeFilterActive ||
    searchActive ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    view !== "active";

  function resetFilters() {
    if (props.variant === "admin") props.onStoreFilterChange("");
    setClientSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setView("active");
  }

  function applyStatusChip(s: OrderRow["status"] | "all") {
    setTypeFilter("all");
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

  const adminLoading = props.variant === "admin" && props.storesQuery.isLoading;
  if (ordersQuery.isLoading || adminLoading) {
    return <OrdersCommandCenterSkeleton />;
  }

  if (ordersQuery.error) {
    return (
      <div className="wt-panel rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <p className="font-semibold">Impossible de charger les commandes</p>
        <p className="mt-1 text-sm opacity-90">{ordersQuery.error.message}</p>
      </div>
    );
  }

  const stores = props.variant === "admin" ? (props.storesQuery.data ?? []) : [];
  const searchInputId = props.variant === "admin" ? "admin-client-search" : "staff-client-search";

  return (
    <div className="-mx-4 space-y-8 px-4 pb-8 md:-mx-8 md:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-white via-wt-bordeaux-muted/30 to-zinc-50 px-5 py-6 shadow-sm dark:border-zinc-700/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:shadow-[0_8px_40px_-16px_rgba(0,0,0,0.5)] sm:px-8 sm:py-7">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-wt-bordeaux/10 blur-3xl dark:bg-wt-accent/12"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-wt-bordeaux dark:text-wt-accent">Commandes</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300/95">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Temps réel
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              {props.variant === "admin" ? "Toutes les commandes" : "Commandes du magasin"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {props.variant === "admin"
                ? "Filtrez par magasin, statut ou recherche. Chaque carte ouvre la fiche complète."
                : "Uniquement les commandes du point de vente auquel vous êtes connecté. Filtrez par statut ou recherche — chaque carte ouvre la fiche complète."}
            </p>
            {props.variant === "admin" && props.storesQuery.isError ? (
              <p className="mt-3 max-w-xl rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200/95">
                Liste des magasins indisponible — tous les PDV conservés. ({props.storesQuery.error?.message})
              </p>
            ) : null}
          </div>

          <div className="w-full shrink-0 lg:max-w-xs">
            {props.variant === "admin" ? (
              <>
                <label htmlFor="admin-store-filter" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Point de vente
                </label>
                <div className="mt-1.5 rounded-xl border border-zinc-200/90 bg-white/90 p-0.5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/90">
                  <select
                    id="admin-store-filter"
                    value={props.storeFilter}
                    onChange={(e) => props.onStoreFilterChange(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border-0 bg-transparent px-3 py-2.5 text-sm font-medium text-zinc-900 outline-none ring-0 dark:text-zinc-100"
                  >
                    <option value="">Tous les points de vente</option>
                    {stores.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} · {st.city}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Point de vente</p>
                <div className="mt-1.5 rounded-xl border border-zinc-200/90 bg-white/90 px-3 py-2.5 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/90">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{props.storeLabel}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-700/60 dark:bg-zinc-900/40" aria-label="Répartition des statuts">
        <button
          type="button"
          onClick={() => setPipelineOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 sm:px-5"
          aria-expanded={pipelineOpen}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Pipeline</p>
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {activeTotal} en cours · {historyTotal} historique
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {pipelineOpen ? "Replier" : "Déplier"}
            <svg
              className={`h-4 w-4 transition-transform ${pipelineOpen ? "rotate-180" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {pipelineOpen ? (
          <div className="border-t border-zinc-200/80 px-4 pb-4 pt-2 dark:border-zinc-700/60 sm:px-5">
            <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-500">Clic = filtre · second clic = tout</p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => {
                  setView("active");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className={`flex min-w-[5.5rem] shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition ${
                  view === "active" && statusFilter === "all"
                    ? "border-wt-bordeaux/50 bg-wt-bordeaux/10 ring-2 ring-wt-bordeaux/20 dark:border-wt-accent/40 dark:bg-wt-accent/15 dark:ring-wt-accent/15"
                    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <span className="text-xl font-bold tabular-nums leading-tight text-zinc-900 dark:text-zinc-50">{activeTotal}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">En cours</span>
              </button>
              {PIPELINE_STATUSES.map((st) => {
                const n = statusCounts[st];
                const sel = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => applyStatusChip(st)}
                    className={`flex min-w-[5.5rem] shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition ${
                      sel
                        ? "border-amber-400/70 bg-amber-50 ring-2 ring-amber-300/40 dark:border-amber-700/50 dark:bg-amber-950/40 dark:ring-amber-800/35"
                        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <span className="text-xl font-bold tabular-nums leading-tight text-zinc-900 dark:text-zinc-50">{n}</span>
                    <span className="text-[10px] font-medium leading-tight text-zinc-600 dark:text-zinc-400">{STATUS_LABEL[st]}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setView("history");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className={`flex min-w-[5.5rem] shrink-0 flex-col rounded-xl border px-3 py-2 text-left transition ${
                  view === "history" && statusFilter === "all"
                    ? "border-zinc-400 bg-zinc-200/80 ring-2 ring-zinc-300/50 dark:border-zinc-600 dark:bg-zinc-800 dark:ring-zinc-600/40"
                    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <span className="text-xl font-bold tabular-nums leading-tight text-zinc-800 dark:text-zinc-200">{historyTotal}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Historique</span>
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
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
          </div>
        ) : null}
      </section>

      <div className="sticky top-0 z-20 -mx-4 border-b border-zinc-200 bg-background shadow-[0_4px_14px_-6px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:shadow-[0_6px_18px_-8px_rgba(0,0,0,0.45)] md:-mx-8">
        <div className="px-4 py-3 md:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
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
                    setTypeFilter("all");
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm ${
                    view === key
                      ? "bg-wt-bordeaux text-white shadow-sm dark:bg-wt-accent"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="hidden h-6 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700 lg:block" aria-hidden />
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Type de commande">
              {(
                [
                  ["all", "Tous types"],
                  ["delivery", "Livraison"],
                  ["pickup", "Retrait"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    typeFilter === key
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="w-full min-w-0 flex-1 lg:max-w-md lg:min-w-[220px]">
              <label htmlFor={searchInputId} className="sr-only">
                Recherche client ou commande
              </label>
              <input
                id={searchInputId}
                type="search"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-wt-bordeaux/50 focus:outline-none focus:ring-2 focus:ring-wt-bordeaux/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-wt-accent/50 dark:focus:ring-wt-accent/20"
              />
            </div>
          </div>
        </div>
        {typeFilter !== "all" ? (
          <div
            role="alert"
            aria-live="polite"
            className="border-t border-amber-400/80 bg-amber-50 px-4 py-3 dark:border-amber-700/70 dark:bg-amber-950/55 md:px-8"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm font-semibold leading-snug text-amber-950 dark:text-amber-100">
                {typeFilter === "delivery"
                  ? "Vous ne voyez que les livraisons. Les commandes à retrait n’apparaissent pas dans cette liste."
                  : "Vous ne voyez que les retraits. Les commandes en livraison n’apparaissent pas dans cette liste."}
              </p>
              <button
                type="button"
                onClick={() => setTypeFilter("all")}
                className="shrink-0 rounded-xl bg-wt-bordeaux px-4 py-2.5 text-center text-sm font-bold text-white shadow-md transition hover:bg-wt-bordeaux-hover focus-visible:outline focus-visible:ring-2 focus-visible:ring-wt-bordeaux/50 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:bg-wt-accent dark:hover:bg-wt-accent-hover dark:focus-visible:ring-wt-accent/40 dark:focus-visible:ring-offset-amber-950/80 sm:min-w-[14rem]"
              >
                Voir toutes les commandes
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Résultats</p>
          <p className="mt-0.5 text-zinc-800 dark:text-zinc-200">
            <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">{filtered.length}</span>
            <span className="ml-2 text-sm text-zinc-600 dark:text-zinc-400">
              commande{filtered.length !== 1 ? "s" : ""}
              {searchActive ? " · filtrées par recherche" : ""}
            </span>
          </p>
          {filtered.length > 0 ? (
            <p className="mt-1 text-sm font-medium text-wt-bordeaux dark:text-wt-accent">
              Total affiché : {filteredTotalTnd.toFixed(2)} TND
            </p>
          ) : null}
        </div>
        {filtersDirty ? (
          <button
            type="button"
            onClick={() => resetFilters()}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            Réinitialiser les filtres
          </button>
        ) : null}
      </div>

      <ul className="space-y-2">
        {filtered.length === 0 ? (
          <li className="wt-dashed-empty p-10 text-center text-zinc-600 dark:text-zinc-400">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">Aucun résultat</p>
            <p className="mt-2 text-sm">Élargissez la vue ou réinitialisez les filtres.</p>
          </li>
        ) : (
          filtered.map((o) => {
            const src = o.source ?? "app";
            const srcLabel = SOURCE_LABEL[src] ?? src;
            const phoneLine = customerPhoneLine(o);
            const when = formatOrderWhen(o.created_at);
            const pay = o.payment_status ? PAYMENT_LABEL[o.payment_status] ?? o.payment_status : null;
            const showStoreChip = props.variant === "admin" && Boolean(o.stores?.name);
            return (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className={`group block rounded-xl border border-zinc-200/90 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-wt-bordeaux/35 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:hover:border-zinc-600 dark:focus-visible:ring-wt-accent/35 sm:p-4 ${
                    o.type === "delivery"
                      ? "border-l-[3px] border-l-wt-bordeaux dark:border-l-wt-accent"
                      : "border-l-[3px] border-l-zinc-300 dark:border-l-zinc-600"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${STATUS_STYLE[o.status]}`}>
                          {STATUS_LABEL[o.status]}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {o.type === "delivery" ? "Livraison" : "Retrait"}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          {srcLabel}
                        </span>
                        {o.has_upsell ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            Upsell
                          </span>
                        ) : null}
                        {showStoreChip ? (
                          <span className="max-w-[10rem] truncate rounded-full bg-wt-bordeaux/10 px-2 py-0.5 text-[10px] font-semibold text-wt-bordeaux dark:bg-wt-accent/15 dark:text-wt-accent">
                            {o.stores?.name}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                        <span className="truncate text-base font-bold text-zinc-900 dark:text-zinc-50 sm:text-lg">
                          {formatCustomerDisplayName(o.users)}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                          {shortOrderRef(o.id)}
                        </span>
                      </div>
                      {phoneLine ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{phoneLine}</p> : null}
                      <p className="mt-1 line-clamp-2 text-xs leading-snug text-zinc-600 dark:text-zinc-400 sm:text-sm">{placeSummary(o)}</p>
                      <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-500">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{when.relative}</span>
                        <span className="mx-1.5 text-zinc-400">·</span>
                        <span>{when.absolute}</span>
                        {pay ? (
                          <>
                            <span className="mx-1.5 text-zinc-400">·</span>
                            <span>{pay}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                      <p className="text-lg font-bold tabular-nums text-wt-bordeaux sm:text-right sm:text-xl dark:text-wt-accent">
                        {Number(o.total_price).toFixed(2)} TND
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-wt-bordeaux px-3 py-1.5 text-xs font-bold text-white shadow-sm transition group-hover:bg-wt-bordeaux-hover dark:bg-wt-accent dark:group-hover:bg-wt-accent-hover">
                        Ouvrir
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                          <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
