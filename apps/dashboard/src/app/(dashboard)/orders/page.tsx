"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useOrders,
  useStaffProfile,
  useStoreOrdersRealtime,
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
  pending: "bg-amber-100 text-amber-900 ring-amber-200",
  confirmed: "bg-sky-100 text-sky-900 ring-sky-200",
  preparing: "bg-orange-100 text-orange-900 ring-orange-200",
  ready: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  delivering: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  delivered: "bg-stone-100 text-stone-600 ring-stone-200",
  cancelled: "bg-red-50 text-red-800 line-through ring-red-100",
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

function clientLabel(u: OrderListRow["users"]): string {
  const email = u?.email?.trim();
  const phone = u?.phone?.trim();
  if (email) return email;
  if (phone) return phone;
  return "Client";
}

function placeSummary(o: OrderListRow): string {
  if (o.type === "delivery") {
    const a = o.addresses;
    if (!a) return "Livraison — adresse non disponible";
    return `${a.label} · ${a.address}, ${a.city}`;
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

export default function OrdersPage() {
  const staff = useStaffProfile();
  const storeId = staff.data?.store_id;
  const orders = useOrders({ mode: "staff", storeId });
  useStoreOrdersRealtime(storeId);

  const [view, setView] = useState<ViewMode>("active");
  const [statusFilter, setStatusFilter] = useState<OrderRow["status"] | "all">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "delivery" | "pickup">("all");

  const list = orders.data ?? [];

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

  const filtered = useMemo(() => {
    let rows = [...list];
    if (view === "active") rows = rows.filter((o) => !TERMINAL.includes(o.status));
    else if (view === "history") rows = rows.filter((o) => TERMINAL.includes(o.status));

    if (statusFilter !== "all") rows = rows.filter((o) => o.status === statusFilter);
    if (typeFilter === "delivery") rows = rows.filter((o) => o.type === "delivery");
    if (typeFilter === "pickup") rows = rows.filter((o) => o.type === "pickup");

    rows.sort(sortOrders);
    return rows;
  }, [list, view, statusFilter, typeFilter]);

  if (staff.isLoading || orders.isLoading) {
    return <p className="text-stone-600">Chargement des commandes…</p>;
  }

  if (orders.error) {
    return <p className="text-red-600">{orders.error.message}</p>;
  }

  const storeLabel = staff.data?.stores?.name
    ? `${staff.data.stores.name} · ${staff.data.stores.city ?? ""}`
    : "Magasin";

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Restaurant</p>
        <h1 className="mt-1 text-2xl font-extrabold text-stone-900">Commandes à traiter</h1>
        <p className="mt-2 text-stone-600">
          <span className="font-semibold text-stone-800">{storeLabel}</span>
          <span className="text-stone-500"> — uniquement les commandes passées sur ce magasin.</span>
        </p>
        <p className="mt-1 text-sm text-stone-500">Mise à jour en temps réel.</p>
      </header>

      {/* Compteurs — clic = filtre statut */}
      <section className="mt-6" aria-label="Répartition des statuts">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
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
                ? "border-amber-400 bg-amber-50 ring-2 ring-amber-200"
                : "border-stone-200 bg-white hover:border-amber-200"
            }`}
          >
            <p className="text-2xl font-bold text-amber-800">{counts.pending}</p>
            <p className="text-xs font-medium text-stone-600">En attente</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "confirmed" ? "all" : "confirmed");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "confirmed"
                ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                : "border-stone-200 bg-white hover:border-sky-200"
            }`}
          >
            <p className="text-2xl font-bold text-sky-800">{counts.confirmed}</p>
            <p className="text-xs font-medium text-stone-600">Confirmées</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "preparing" ? "all" : "preparing");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "preparing"
                ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
                : "border-stone-200 bg-white hover:border-orange-200"
            }`}
          >
            <p className="text-2xl font-bold text-orange-800">{counts.preparing}</p>
            <p className="text-xs font-medium text-stone-600">En préparation</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "ready" ? "all" : "ready");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "ready"
                ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200"
                : "border-stone-200 bg-white hover:border-emerald-200"
            }`}
          >
            <p className="text-2xl font-bold text-emerald-800">{counts.ready}</p>
            <p className="text-xs font-medium text-stone-600">Prêtes</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setView("active");
              setStatusFilter(statusFilter === "delivering" ? "all" : "delivering");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              statusFilter === "delivering"
                ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                : "border-stone-200 bg-white hover:border-indigo-200"
            }`}
          >
            <p className="text-2xl font-bold text-indigo-800">{counts.delivering}</p>
            <p className="text-xs font-medium text-stone-600">En livraison</p>
          </button>
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-left">
            <p className="text-2xl font-bold text-stone-800">{counts.active}</p>
            <p className="text-xs font-medium text-stone-600">Total en cours</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setView("history");
              setStatusFilter("all");
            }}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              view === "history"
                ? "border-stone-400 bg-stone-100 ring-2 ring-stone-300"
                : "border-stone-200 bg-white hover:border-stone-300"
            }`}
          >
            <p className="text-2xl font-bold text-stone-700">{counts.history}</p>
            <p className="text-xs font-medium text-stone-600">Historique</p>
          </button>
        </div>
      </section>

      {/* Vues + type */}
      <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Vue liste">
          <span className="mr-1 self-center text-xs font-semibold uppercase text-stone-500">Vue</span>
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
                  ? "bg-orange-600 text-white shadow-sm"
                  : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type de commande">
          <span className="mr-1 self-center text-xs font-semibold uppercase text-stone-500">Type</span>
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
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {(statusFilter !== "all" || typeFilter !== "all") && (
        <p className="mt-3 text-sm text-stone-600">
          Filtres actifs :
          {statusFilter !== "all" && (
            <button
              type="button"
              className="ml-2 rounded-md bg-stone-200 px-2 py-0.5 text-stone-800 hover:bg-stone-300"
              onClick={() => setStatusFilter("all")}
            >
              Statut : {STATUS_LABEL[statusFilter]} ✕
            </button>
          )}
          {typeFilter !== "all" && (
            <button
              type="button"
              className="ml-2 rounded-md bg-stone-200 px-2 py-0.5 text-stone-800 hover:bg-stone-300"
              onClick={() => setTypeFilter("all")}
            >
              Type : {typeFilter === "delivery" ? "Livraison" : "À emporter"} ✕
            </button>
          )}
        </p>
      )}

      <p className="mt-4 text-sm text-stone-500">
        {filtered.length} commande{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}
      </p>

      <ul className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">
            Aucune commande pour ces filtres.
          </li>
        ) : (
          filtered.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className={`flex flex-col gap-2 rounded-xl border-l-4 bg-white p-4 shadow-sm ring-1 ring-stone-100 transition hover:ring-orange-200 md:flex-row md:items-start md:justify-between ${
                  o.type === "delivery" ? "border-l-orange-500" : "border-l-violet-500"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${STATUS_STYLE[o.status]}`}
                    >
                      {STATUS_LABEL[o.status]}
                    </span>
                    <span className="text-xs font-semibold uppercase text-stone-500">
                      {o.type === "delivery" ? "Livraison" : "À emporter"}
                    </span>
                  </div>
                  <p className="truncate text-base font-bold text-stone-900">{clientLabel(o.users)}</p>
                  <p className="text-sm leading-snug text-stone-700">{placeSummary(o)}</p>
                  <p className="font-mono text-xs text-stone-400">{o.id}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(o.created_at).toLocaleString("fr-TN", {
                      dateStyle: "short",
                      timeStyle: "medium",
                    })}
                  </p>
                </div>
                <p className="shrink-0 text-xl font-bold text-orange-600 md:pt-1 md:text-right">
                  {Number(o.total_price).toFixed(2)} TND
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
