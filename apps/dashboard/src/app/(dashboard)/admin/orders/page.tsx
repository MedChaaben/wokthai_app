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
  delivering: "En cours de livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_STYLE: Record<OrderRow["status"], string> = {
  pending:
    "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/50",
  confirmed:
    "bg-sky-100 text-sky-900 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/50",
  preparing:
    "bg-orange-100 text-orange-900 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-800/50",
  ready:
    "bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50",
  delivering:
    "bg-indigo-100 text-indigo-900 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800/50",
  delivered: "bg-stone-100 text-stone-700 ring-stone-300 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700",
  cancelled:
    "bg-red-50 text-red-800 line-through ring-red-200 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-900/50",
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

  const counts = useMemo(() => {
    const c = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivering: 0,
      active: 0,
      history: 0,
    };
    for (const o of list) {
      if (o.status === "pending") c.pending++;
      if (o.status === "confirmed") c.confirmed++;
      if (o.status === "preparing") c.preparing++;
      if (o.status === "ready") c.ready++;
      if (o.status === "delivering") c.delivering++;
      if (!TERMINAL.includes(o.status)) c.active++;
      else c.history++;
    }
    return c;
  }, [list]);

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

  if (!isAdmin) return null;

  if (orders.isLoading || storesQuery.isLoading) {
    return <p className="text-stone-600 dark:text-zinc-400">Chargement des commandes…</p>;
  }

  if (orders.error) {
    return <p className="text-red-600 dark:text-red-400">{orders.error.message}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Toutes les commandes</h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
          Filtrez par point de vente ou consultez l’ensemble du réseau. Le détail d’une commande ouvre la même fiche que pour un
          magasin.
        </p>
        <div className="mt-4 max-w-md">
          <label htmlFor="admin-store-filter" className="block text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">
            Magasin
          </label>
          <select
            id="admin-store-filter"
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Tous les points de vente</option>
            {(storesQuery.data ?? []).map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} · {st.city}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="mt-6" aria-label="Répartition des statuts">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-zinc-500">Aperçu</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "pending" ? "all" : "pending");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "pending"
                ? "border-amber-500 bg-amber-100 ring-2 ring-amber-300 dark:bg-amber-950/50 dark:ring-amber-800/50"
                : "wt-stat-inactive border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            }`}
          >
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{counts.pending}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">En attente</p>
          </button>
          <div className="rounded-xl border border-stone-200 bg-stone-100/90 px-3 py-3 dark:border-zinc-700/80 dark:bg-zinc-900/70">
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{counts.active}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">Total en cours</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setView("history");
              setStatusFilter("all");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              view === "history"
                ? "border-stone-400 bg-stone-100 ring-2 ring-stone-400 dark:border-zinc-600 dark:bg-zinc-800 dark:ring-zinc-600"
                : "border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
            }`}
          >
            <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{counts.history}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">Historique</p>
          </button>
        </div>
      </section>

      <div className="sticky -top-4 z-20 -mx-4 mt-6 border-b border-stone-200/90 bg-background/95 px-4 pb-4 pt-4 backdrop-blur-md md:-top-8 md:-mx-8 md:px-8 md:pt-8 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Vue liste">
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
                  ? "bg-wt-bordeaux text-white shadow-sm"
                  : "bg-white text-zinc-700 shadow-sm ring-1 ring-stone-300 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "Tous"],
              ["delivery", "Livraison"],
              ["pickup", "À emporter"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTypeFilter(key)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                typeFilter === key ? "bg-wt-bordeaux text-white" : "bg-stone-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label htmlFor="admin-client-search" className="mt-4 block text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">
          Recherche client / magasin
        </label>
        <input
          id="admin-client-search"
          type="search"
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          placeholder="Nom, e-mail, téléphone, nom du magasin…"
          className="mt-1 w-full max-w-xl rounded-xl border border-stone-300 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <p className="mt-4 text-sm text-stone-600 dark:text-zinc-500">
        {filtered.length} commande{filtered.length !== 1 ? "s" : ""}
        {searchActive ? " (recherche)" : ""}
      </p>

      <ul className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <li className="wt-dashed-empty p-10 text-stone-600 dark:text-zinc-500">Aucune commande pour ces filtres.</li>
        ) : (
          filtered.map((o) => (
            <li key={o.id} className="group relative rounded-xl">
              <Link
                href={`/orders/${o.id}`}
                className="absolute inset-0 z-0 rounded-xl"
                aria-label={`Commande ${o.id}`}
              />
              <div
                className={`pointer-events-none relative z-10 flex flex-col gap-2 wt-card border-l-4 p-4 md:flex-row md:items-start md:justify-between ${
                  o.type === "delivery" ? "border-l-wt-bordeaux" : "border-l-zinc-400 dark:border-l-zinc-500"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_STYLE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                    <span className="text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">
                      {o.type === "delivery" ? "Livraison" : "À emporter"}
                    </span>
                    {o.stores?.name ? (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {o.stores.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCustomerDisplayName(o.users)}
                  </p>
                  <p className="text-sm text-stone-600 dark:text-zinc-400">{placeSummary(o)}</p>
                  <p className="text-xs text-stone-600 dark:text-zinc-500">
                    {new Date(o.created_at).toLocaleString("fr-TN", { dateStyle: "short", timeStyle: "medium" })}
                  </p>
                </div>
                <p className="shrink-0 text-xl font-bold text-wt-bordeaux md:pt-1 md:text-right dark:text-wt-accent">
                  {Number(o.total_price).toFixed(2)} TND
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
