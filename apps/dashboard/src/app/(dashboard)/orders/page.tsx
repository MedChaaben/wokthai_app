"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useOrders,
  useStaffProfile,
  formatCustomerDisplayName,
  normalizeCustomerPhone,
  phoneStorageToDisplay,
  phoneToTelHref,
  type OrderListRow,
} from "@wokthai/shared";
import type { OrderRow } from "@wokthai/shared";

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

/** Recherche sur nom affiché, prénom, nom, e-mail, téléphone (y compris partiel sur les chiffres). */
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

export default function OrdersPage() {
  const staff = useStaffProfile();
  const storeId = staff.data?.store_id;
  const orders = useOrders({ mode: "staff", storeId });

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

  if (staff.isLoading || orders.isLoading) {
    return <p className="text-stone-600 dark:text-zinc-400">Chargement des commandes…</p>;
  }

  if (orders.error) {
    return <p className="text-red-600 dark:text-red-400">{orders.error.message}</p>;
  }

  const storeLabel = staff.data?.stores?.name
    ? `${staff.data.stores.name} · ${staff.data.stores.city ?? ""}`
    : "Restaurant";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-stone-200 dark:border-zinc-800 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">
          Restaurant
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Commandes à traiter</h1>
        <p className="mt-2 text-stone-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{storeLabel}</span>
          <span className="text-stone-600 dark:text-zinc-500"> — uniquement les commandes passées sur ce magasin.</span>
        </p>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-500">Mise à jour en temps réel.</p>
      </header>

      {/* Compteurs — clic = filtre statut */}
      <section className="mt-6" aria-label="Répartition des statuts">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-zinc-500">
          Aperçu (cliquer pour filtrer un statut)
        </p>
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
                : "wt-stat-inactive border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-600"
            }`}
          >
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{counts.pending}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">En attente</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "confirmed" ? "all" : "confirmed");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "confirmed"
                ? "border-sky-500 bg-sky-100 ring-2 ring-sky-300 dark:bg-sky-950/50 dark:ring-sky-800/50"
                : "wt-stat-inactive border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-sky-600"
            }`}
          >
            <p className="text-2xl font-bold text-sky-800 dark:text-sky-300">{counts.confirmed}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">Confirmées</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "preparing" ? "all" : "preparing");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "preparing"
                ? "border-orange-400 bg-orange-100 ring-2 ring-orange-300 dark:bg-orange-950/50 dark:ring-orange-800/50"
                : "wt-stat-inactive border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-600"
            }`}
          >
            <p className="text-2xl font-bold text-orange-800 dark:text-orange-300">{counts.preparing}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">En préparation</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "ready" ? "all" : "ready");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "ready"
                ? "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300 dark:bg-emerald-950/50 dark:ring-emerald-800/50"
                : "wt-stat-inactive border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-600"
            }`}
          >
            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{counts.ready}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">Prêtes</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "delivering" ? "all" : "delivering");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "delivering"
                ? "border-indigo-500 bg-indigo-100 ring-2 ring-indigo-300 dark:bg-indigo-950/50 dark:ring-indigo-800/50"
                : "wt-stat-inactive border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-600"
            }`}
          >
            <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-300">{counts.delivering}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">En livraison</p>
          </button>
          <div className="rounded-xl border border-stone-200 bg-stone-100/90 px-3 py-3 text-left dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
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
                ? "border-stone-400 dark:border-zinc-600 bg-stone-100 dark:bg-zinc-800 ring-2 ring-stone-400 dark:ring-zinc-600"
                : "border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-stone-300 dark:hover:border-zinc-700"
            }`}
          >
            <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{counts.history}</p>
            <p className="text-xs font-medium text-stone-600 dark:text-zinc-400">Historique</p>
          </button>
        </div>
      </section>

      {/* Barre d’outils : sticky doit rester enfant du bloc page (pas un wrapper court) sinon le parent limite la zone de collage. -top-* compense le padding du <main>. */}
      <div
        className="sticky -top-4 z-20 -mx-4 mt-6 border-b border-stone-200/90 bg-background/95 px-4 pb-4 pt-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 dark:border-zinc-800 md:-top-8 md:-mx-8 md:px-8 md:pt-8"
        aria-label="Filtres et recherche"
      >
          {/* Vues + type */}
          <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Vue liste">
              <span className="mr-1 self-center text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">Vue</span>
              {(
                [
                  ["active", "En cours", "Commandes à préparer / livrer"],
                  ["all", "Toutes", "Inclut terminées et annulées"],
                  ["history", "Historique", "Livrées et annulées"],
                ] as const
              ).map(([key, label, title]) => (
                <button
                  key={key}
                  type="button"
                  title={title}
                  onClick={() => {
                    setView(key);
                    if (key !== "active") setStatusFilter("all");
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    view === key
                      ? "bg-wt-bordeaux text-white shadow-sm hover:bg-wt-bordeaux-hover"
                      : "bg-white text-zinc-700 shadow-sm ring-1 ring-stone-300 hover:bg-stone-100 dark:bg-zinc-900 dark:text-zinc-300 dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.45)] dark:ring-zinc-700 dark:hover:bg-zinc-950"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Type de commande">
              <span className="mr-1 self-center text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">Type</span>
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
                    typeFilter === key
                      ? "bg-wt-bordeaux text-white hover:bg-wt-bordeaux-hover"
                      : "bg-stone-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6" aria-label="Recherche client">
            <label
              htmlFor="orders-client-search"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-zinc-500"
            >
              Recherche client (toutes les commandes du magasin)
            </label>
            <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id="orders-client-search"
                type="search"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Nom, prénom, e-mail, téléphone…"
                autoComplete="off"
                className="w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none ring-wt-bordeaux/20 dark:ring-wt-bordeaux/30 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-wt-bordeaux focus:ring-2 focus:ring-wt-bordeaux/30"
              />
              {searchActive ? (
                <button
                  type="button"
                  onClick={() => setClientSearch("")}
                  className="shrink-0 rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-950"
                >
                  Effacer
                </button>
              ) : null}
            </div>
            {searchActive ? (
              <p className="mt-2 text-sm text-wt-bordeaux dark:text-wt-accent">
                Filtre « vue » (En cours / Toutes / Historique) désactivé pendant la recherche — portée : toutes les
                commandes du magasin, avec les filtres type et statut ci-dessous si actifs.
              </p>
            ) : null}
          </section>
      </div>

      {(statusFilter !== "all" || typeFilter !== "all") && (
        <p className="mt-3 text-sm text-stone-600 dark:text-zinc-400">
          Filtres actifs :
          {statusFilter !== "all" && (
            <button
              type="button"
              className="ml-2 rounded-md bg-stone-200 dark:bg-zinc-700 px-2 py-0.5 text-zinc-800 dark:text-zinc-200 hover:bg-stone-300 dark:hover:bg-zinc-600"
              onClick={() => setStatusFilter("all")}
            >
              Statut : {STATUS_LABEL[statusFilter]} ✕
            </button>
          )}
          {typeFilter !== "all" && (
            <button
              type="button"
              className="ml-2 rounded-md bg-stone-200 dark:bg-zinc-700 px-2 py-0.5 text-zinc-800 dark:text-zinc-200 hover:bg-stone-300 dark:hover:bg-zinc-600"
              onClick={() => setTypeFilter("all")}
            >
              Type : {typeFilter === "delivery" ? "Livraison" : "À emporter"} ✕
            </button>
          )}
        </p>
      )}

      <p className="mt-4 text-sm text-stone-600 dark:text-zinc-500">
        {filtered.length} commande{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}
        {searchActive ? " (recherche active)" : ""}
      </p>

      <ul className="relative z-0 mt-4 space-y-3">
        {filtered.length === 0 ? (
          <li className="wt-dashed-empty p-10 text-stone-600 dark:text-zinc-500">
            {searchActive
              ? "Aucune commande ne correspond à cette recherche ou aux filtres actifs."
              : "Aucune commande pour ces filtres."}
          </li>
        ) : (
          filtered.map((o) => (
            <li
              key={o.id}
              className="group relative rounded-xl focus-within:ring-2 focus-within:ring-wt-bordeaux/60 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-wt-accent/50 dark:focus-within:ring-offset-zinc-950"
            >
              {/* Lien pleine carte sous le contenu : évite <a> imbriqués avec tel:/mailto: */}
              <Link
                href={`/orders/${o.id}`}
                className="absolute inset-0 z-0 rounded-xl"
                aria-label={`Ouvrir la commande ${formatCustomerDisplayName(o.users)} — ${Number(o.total_price).toFixed(2)} TND`}
              />
              <div
                className={`pointer-events-none relative z-10 flex flex-col gap-2 wt-card border-l-4 p-4 transition group-hover:border-wt-bordeaux/35 md:flex-row md:items-start md:justify-between ${
                  o.type === "delivery" ? "border-l-wt-bordeaux" : "border-l-zinc-400 dark:border-l-zinc-500"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_STYLE[o.status]}`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                    <span className="text-xs font-semibold uppercase text-stone-600 dark:text-zinc-500">
                      {o.type === "delivery" ? "Livraison" : "À emporter"}
                    </span>
                  </div>
                  <p className="truncate text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {formatCustomerDisplayName(o.users)}
                  </p>
                  <div className="space-y-0.5 text-sm text-stone-600 dark:text-zinc-400">
                    <p>
                      <span className="font-medium text-stone-600 dark:text-zinc-500">Tél. </span>
                      {(() => {
                        const u = o.users;
                        const p = u?.phone?.trim();
                        if (!u || !p) {
                          return <span className="text-stone-600 dark:text-zinc-400">—</span>;
                        }
                        const tel = phoneToTelHref(u.phone);
                        const label = phoneStorageToDisplay(u.phone);
                        if (tel) {
                          return (
                            <a
                              href={`tel:${tel}`}
                              className="pointer-events-auto text-wt-bordeaux underline-offset-2 hover:underline dark:text-wt-accent"
                            >
                              {label}
                            </a>
                          );
                        }
                        return <span>{label}</span>;
                      })()}
                    </p>
                    <p className="truncate">
                      <span className="font-medium text-stone-600 dark:text-zinc-500">E-mail </span>
                      {o.users?.email?.trim() ? (
                        <a
                          href={`mailto:${o.users.email.trim()}`}
                          className="pointer-events-auto text-wt-bordeaux underline-offset-2 hover:underline dark:text-wt-accent"
                        >
                          {o.users.email.trim()}
                        </a>
                      ) : (
                        <span className="text-stone-600 dark:text-zinc-400">—</span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">{placeSummary(o)}</p>
                  <p className="font-mono text-xs text-stone-600 dark:text-zinc-400">{o.id}</p>
                  <p className="text-xs text-stone-600 dark:text-zinc-500">
                    {new Date(o.created_at).toLocaleString("fr-TN", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
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
