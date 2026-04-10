"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useOrder,
  useOrderRealtime,
  useStaffProfile,
  useUpdateOrderStatus,
  formatCustomerDisplayName,
  phoneStorageToDisplay,
  phoneToTelHref,
} from "@wokthai/shared";
import type { OrderItemDetail, OrderRow, OrderStatusEventRow } from "@wokthai/shared";

const EMPTY_ORDER_ITEMS: OrderItemDetail[] = [];

const STATUSES: OrderRow["status"][] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivering",
  "delivered",
  "cancelled",
];

/** Étapes du parcours « normal » (hors annulation). */
const STATUS_FLOW: OrderRow["status"][] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivering",
  "delivered",
];

const FLOW_SHORT: Record<OrderRow["status"], string> = {
  pending: "Attente",
  confirmed: "Confirmée",
  preparing: "Cuisine",
  ready: "Prête",
  delivering: "En route",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const LABELS: Record<OrderRow["status"], string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const STATUS_BADGE: Record<OrderRow["status"], string> = {
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
    "bg-red-50 text-red-800 ring-red-200/80 line-through dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900/40",
};

const SOURCE_LABEL: Record<string, string> = {
  app: "App",
  pos: "Caisse",
  other: "Autre",
};

function fmtMoney(n: string | number): string {
  return Number(n).toFixed(2);
}

function shortOrderRef(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatOrderWhen(iso: string): { relative: string; absolute: string } {
  const d = new Date(iso);
  const abs = d.toLocaleString("fr-TN", { dateStyle: "medium", timeStyle: "short" });
  if (Number.isNaN(d.getTime())) return { relative: "—", absolute: "—" };
  const now = Date.now();
  const diffSec = Math.round((d.getTime() - now) / 1000);
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

function fmtTimelineTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDurationBetween(prevIso: string, nextIso: string): string {
  const a = new Date(prevIso).getTime();
  const b = new Date(nextIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return "";
  const ms = b - a;
  if (ms < 0) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "moins d’1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function prepStorageKey(orderId: string): string {
  return `wokthai-order-prep:${orderId}`;
}

function useOrderLinePrepChecked(orderId: string, lineIds: string[]) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());

  const persist = useCallback(
    (next: Set<string>) => {
      try {
        localStorage.setItem(prepStorageKey(orderId), JSON.stringify([...next]));
      } catch {
        /* quota / private mode */
      }
    },
    [orderId]
  );

  useEffect(() => {
    if (!orderId) return;
    const validIds = new Set(lineIds);
    try {
      const raw = localStorage.getItem(prepStorageKey(orderId));
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr)) {
          const next = new Set(arr.filter((id): id is string => typeof id === "string" && validIds.has(id)));
          // Synchro depuis localStorage au chargement / changement de commande (source externe).
          // eslint-disable-next-line react-hooks/set-state-in-effect -- état dérivé du stockage navigateur
          setChecked(next);
          if (next.size !== arr.length) persist(next);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setChecked(new Set());
  }, [orderId, lineIds, persist]);

  const toggle = useCallback(
    (lineId: string) => {
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(lineId)) next.delete(lineId);
        else next.add(lineId);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setAll = useCallback(
    (value: boolean) => {
      const next = value ? new Set(lineIds) : new Set<string>();
      persist(next);
      setChecked(next);
    },
    [lineIds, persist]
  );

  return { checked, toggle, setAll };
}

function OrderStatusJourney({ status }: { status: OrderRow["status"] }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        <p className="font-bold">Commande annulée</p>
        <p className="mt-1 text-red-800/90 dark:text-red-300/90">Le parcours habituel ne s’applique plus.</p>
      </div>
    );
  }

  const idx = STATUS_FLOW.indexOf(status);
  const current = idx >= 0 ? idx : 0;
  const pct = Math.round((current / (STATUS_FLOW.length - 1)) * 100);

  return (
    <div className="space-y-4">
      <div className="relative h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-wt-bordeaux to-wt-bordeaux-hover transition-[width] duration-500 dark:from-wt-accent dark:to-wt-accent-hover"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-between sm:gap-1">
        {STATUS_FLOW.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div
              key={s}
              className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-1.5 text-center sm:min-w-0 sm:flex-1 ${
                active ? "opacity-100" : done ? "opacity-90" : "opacity-45"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums transition ${
                  done
                    ? "bg-wt-bordeaux text-white dark:bg-wt-accent"
                    : active
                      ? "bg-wt-bordeaux/15 text-wt-bordeaux ring-2 ring-wt-bordeaux/40 dark:bg-wt-accent/20 dark:text-wt-accent dark:ring-wt-accent/40"
                      : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                }`}
              >
                {done ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase leading-tight tracking-wide sm:text-[11px] ${
                  active ? "text-wt-bordeaux dark:text-wt-accent" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {FLOW_SHORT[s]}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-500">
        Étape {current + 1} / {STATUS_FLOW.length} · {LABELS[status]}
      </p>
    </div>
  );
}

function OrderTimelineChrono({ events }: { events: OrderStatusEventRow[] }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [events]
  );

  if (sorted.length === 0) return null;

  return (
    <ul className="flex flex-col">
      {sorted.map((ev, i) => {
        const isLatest = i === sorted.length - 1;
        const prev = i > 0 ? sorted[i - 1] : null;
        const gapLabel = prev ? fmtDurationBetween(prev.created_at, ev.created_at) : null;
        return (
          <li key={`${ev.created_at}-${ev.status}-${i}`} className="flex gap-3">
            <div className="flex w-[26px] shrink-0 flex-col items-center self-stretch">
              {i > 0 && gapLabel ? (
                <span className="mb-1 max-w-[4.5rem] text-center text-[9px] font-medium uppercase leading-tight tracking-wide text-zinc-400 dark:text-zinc-600">
                  +{gapLabel}
                </span>
              ) : null}
              <div
                className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                  isLatest
                    ? "border-wt-bordeaux bg-wt-bordeaux/20 dark:border-wt-accent dark:bg-wt-accent/25"
                    : "border-zinc-400 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700"
                }`}
              />
              {!isLatest ? (
                <div className="mt-1 min-h-[12px] w-0.5 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              ) : null}
            </div>
            <div className={`min-w-0 flex-1 ${isLatest ? "" : "pb-4"}`}>
              <p className="font-bold text-zinc-900 dark:text-zinc-100">{LABELS[ev.status] ?? ev.status}</p>
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{fmtTimelineTime(ev.created_at)}</p>
              {isLatest ? (
                <p className="mt-1 text-xs font-medium text-wt-bordeaux dark:text-wt-accent">Dernier changement enregistré</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="max-w-4xl animate-pulse space-y-6">
      <div className="h-40 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="h-64 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
      <div className="h-48 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
    </div>
  );
}

function ArticleLineCard({
  line,
  checked,
  onToggle,
}: {
  line: OrderItemDetail;
  checked: boolean;
  onToggle: () => void;
}) {
  const p = line.products;
  const name = p?.name ?? "Produit";
  const lineTotal = Number(line.unit_price) * line.quantity;
  const opts = line.order_item_options ?? [];
  const desc = p?.description?.trim();
  const lineId = line.id;

  return (
    <li
      className={`overflow-hidden rounded-2xl border transition-colors ${
        checked
          ? "border-emerald-200/90 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-zinc-200/90 dark:border-zinc-700/80"
      } wt-panel`}
    >
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-4">
        <label className="flex cursor-pointer items-start gap-3 sm:shrink-0 sm:pt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="mt-1 h-5 w-5 shrink-0 rounded-md border-zinc-300 text-wt-bordeaux focus:ring-wt-bordeaux/30 dark:border-zinc-600 dark:text-wt-accent dark:focus:ring-wt-accent/30"
            aria-label={`Marquer « ${name} » comme préparé`}
          />
          <span className="sr-only">Préparé</span>
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start">
          {p?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image_url}
              alt=""
              className={`h-24 w-full shrink-0 rounded-xl object-cover transition-opacity sm:h-24 sm:w-24 ${
                checked ? "opacity-60" : ""
              }`}
            />
          ) : (
            <div
              className={`flex h-24 w-full shrink-0 items-center justify-center rounded-xl wt-inset text-xs sm:w-24 ${
                checked ? "opacity-60" : ""
              }`}
            >
              Pas d’image
            </div>
          )}
          <div className={`min-w-0 flex-1 ${checked ? "opacity-75" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={`text-base font-bold ${checked ? "text-zinc-500 line-through decoration-zinc-400 dark:text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                {name}
                {line.quantity > 1 ? (
                  <span className="ml-2 tabular-nums text-sm font-semibold text-zinc-500 dark:text-zinc-400">×{line.quantity}</span>
                ) : null}
              </p>
              <p className="text-lg font-bold text-wt-bordeaux dark:text-wt-accent">{fmtMoney(lineTotal)} TND</p>
            </div>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-500">
              {line.quantity} × {fmtMoney(line.unit_price)} TND
            </p>
            {checked ? (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Préparé
              </p>
            ) : null}
            {opts.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <li className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Options</li>
                {opts.map((opt, i) => {
                  const mod = Number(opt.price_modifier);
                  const extra =
                    mod !== 0 ? (mod > 0 ? ` (+${fmtMoney(mod)} TND)` : ` (${fmtMoney(mod)} TND)`) : "";
                  return (
                    <li key={`${lineId}-opt-${i}`} className="text-sm text-zinc-700 dark:text-zinc-300">
                      · {opt.option_name}
                      {extra}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {desc ? (
              <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                  Description / ingrédients
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const staff = useStaffProfile();
  const isPlatformAdmin = staff.data?.role === "platform_admin";
  const ordersListHref = isPlatformAdmin ? "/admin/orders" : "/orders";
  const ordersListLabel = isPlatformAdmin ? "Toutes les commandes" : "Commandes";
  const order = useOrder(id);
  useOrderRealtime(id);
  const updateStatus = useUpdateOrderStatus();

  const items = order.data?.order_items ?? EMPTY_ORDER_ITEMS;
  const lineIds = useMemo(() => items.map((l) => l.id), [items]);
  const prepOrderId = order.data?.id ?? "";
  const { checked, toggle, setAll } = useOrderLinePrepChecked(prepOrderId, lineIds);

  if (order.isLoading) return <OrderDetailSkeleton />;
  if (order.error || !order.data) {
    return (
      <div className="max-w-4xl">
        <Link
          href={ordersListHref}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-wt-bordeaux shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-wt-accent dark:hover:bg-zinc-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {ordersListLabel}
        </Link>
        <div className="mt-8 wt-panel rounded-2xl border border-red-200 bg-red-50/80 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-semibold">Commande introuvable ou accès refusé</p>
          <p className="mt-2 text-sm opacity-90">Vérifiez le lien ou vos droits sur ce restaurant.</p>
        </div>
      </div>
    );
  }

  const o = order.data;
  const statusEvents = o.order_status_events ?? [{ status: o.status, created_at: o.created_at }];
  const when = formatOrderWhen(o.created_at);
  const refShort = shortOrderRef(o.id);
  const srcLabel = SOURCE_LABEL[o.source ?? "app"] ?? o.source ?? "—";
  const payLabel = o.payment_status === "paid_on_delivery" ? "Paiement à la livraison" : "Paiement à confirmer";

  const prepDone = lineIds.length > 0 ? lineIds.filter((lid) => checked.has(lid)).length : 0;
  const prepTotal = lineIds.length;
  const allChecked = prepTotal > 0 && prepDone === prepTotal;

  return (
    <div className="max-w-4xl space-y-8">
      {/* En-tête fiche */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white via-wt-bordeaux-muted/35 to-zinc-50 shadow-sm dark:border-zinc-700/70 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 dark:shadow-[0_8px_32px_-14px_rgba(0,0,0,0.45)]">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-wt-bordeaux/10 blur-3xl dark:bg-wt-accent/12"
          aria-hidden
        />
        <div className="relative p-5 sm:p-7">
          <Link
            href={ordersListHref}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/90 px-3 py-1.5 text-sm font-semibold text-wt-bordeaux shadow-sm backdrop-blur-sm transition hover:border-wt-bordeaux/30 hover:bg-white dark:border-zinc-600 dark:bg-zinc-900/90 dark:text-wt-accent dark:hover:bg-zinc-800"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{ordersListLabel}</span>
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-wt-bordeaux dark:text-wt-accent">Fiche commande</p>
              <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                {formatCustomerDisplayName(o.users)}
              </h1>
              <p className="mt-2 font-mono text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
                Réf. {refShort}
                <span className="mx-2 text-zinc-300 dark:text-zinc-600" aria-hidden>
                  ·
                </span>
                <span className="font-sans font-normal normal-case tracking-normal text-zinc-600 dark:text-zinc-400">
                  {when.relative} · {when.absolute}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_BADGE[o.status]}`}>
                  {LABELS[o.status]}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {o.type === "delivery" ? "Livraison" : "Retrait magasin"}
                </span>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {srcLabel}
                </span>
                {o.has_upsell ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Upsell
                  </span>
                ) : null}
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {payLabel}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-1 border-t border-zinc-200/80 pt-4 dark:border-zinc-700/80 lg:border-0 lg:pt-0 lg:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">Total</p>
              <p className="text-3xl font-bold tabular-nums text-wt-bordeaux dark:text-wt-accent sm:text-4xl">
                {fmtMoney(o.total_price)}&nbsp;TND
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Parcours + statut */}
        <div className="wt-panel p-5 sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-wt-bordeaux dark:text-wt-accent">Parcours</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Où en est la commande ?</h2>
          <div className="mt-5">
            <OrderStatusJourney status={o.status} />
          </div>
          <div className="mt-8 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            <label htmlFor="order-status-select" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Mettre à jour le statut
            </label>
            <select
              id="order-status-select"
              value={o.status}
              disabled={updateStatus.isPending}
              onChange={(e) => {
                const status = e.target.value as OrderRow["status"];
                void updateStatus.mutateAsync({ orderId: o.id, status });
              }}
              className="mt-2 w-full max-w-md rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LABELS[s]}
                </option>
              ))}
            </select>
            {updateStatus.isPending ? (
              <p className="mt-2 text-xs text-zinc-500">Enregistrement…</p>
            ) : null}
          </div>
        </div>

        {/* Articles à préparer */}
        {items.length > 0 ? (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Articles à préparer</h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                  Cochez chaque ligne au fil de la préparation. Les cases sont mémorisées sur <strong className="font-medium text-zinc-800 dark:text-zinc-200">cet appareil</strong> (local) — utile en cuisine, sans changement en base.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold tabular-nums text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                  {prepDone}/{prepTotal}
                </span>
                <button
                  type="button"
                  onClick={() => setAll(!allChecked)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {allChecked ? "Tout décocher" : "Tout cocher"}
                </button>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 dark:bg-emerald-600"
                style={{ width: prepTotal > 0 ? `${(prepDone / prepTotal) * 100}%` : "0%" }}
              />
            </div>
            <ul className="mt-4 space-y-3">
              {items.map((line) => (
                <ArticleLineCard key={line.id} line={line} checked={checked.has(line.id)} onToggle={() => toggle(line.id)} />
              ))}
            </ul>
          </div>
        ) : (
          <p className="wt-dashed-empty block text-sm text-zinc-600 dark:text-zinc-400">Aucune ligne d’article sur cette commande.</p>
        )}

        {/* Frise chronologique */}
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Historique des statuts</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Ordre chronologique, avec temps écoulé entre deux étapes.</p>
          <div className="mt-3 wt-panel p-5 sm:p-6">
            <OrderTimelineChrono events={statusEvents} />
          </div>
        </div>

        <div className="space-y-4 wt-panel p-6">
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Contact</p>
            <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatCustomerDisplayName(o.users)}</p>
            <dl className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
              <div>
                <dt className="font-medium text-stone-600 dark:text-zinc-500">Téléphone</dt>
                <dd className="mt-0.5">
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
                          className="font-semibold text-wt-bordeaux underline-offset-2 hover:underline dark:text-wt-accent"
                        >
                          {label}
                        </a>
                      );
                    }
                    return <span className="font-semibold">{label}</span>;
                  })()}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-stone-600 dark:text-zinc-500">E-mail</dt>
                <dd className="mt-0.5 break-all">
                  {o.users?.email?.trim() ? (
                    <a
                      href={`mailto:${o.users.email.trim()}`}
                      className="font-semibold text-wt-bordeaux underline-offset-2 hover:underline dark:text-wt-accent"
                    >
                      {o.users.email.trim()}
                    </a>
                  ) : (
                    <span className="text-stone-600 dark:text-zinc-400">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300">
            <p>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Créée le</span>{" "}
              {new Date(o.created_at).toLocaleString("fr-TN", { dateStyle: "full", timeStyle: "short" })}
            </p>
            <p className="mt-2">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Identifiant complet</span>{" "}
              <span className="break-all font-mono text-xs text-zinc-600 dark:text-zinc-400">{o.id}</span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Lieu</h2>
          <div className="mt-2 wt-panel p-5 text-sm text-zinc-700 dark:text-zinc-300">
            {o.type === "pickup" ? (
              o.stores ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">
                    Retrait au magasin
                  </p>
                  <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{o.stores.name}</p>
                  <p className="mt-1 whitespace-pre-line text-stone-600 dark:text-zinc-400">
                    {o.stores.address}
                    {"\n"}
                    {o.stores.city}
                  </p>
                </>
              ) : (
                <p className="text-stone-600 dark:text-zinc-500">Restaurant non renseigné.</p>
              )
            ) : o.addresses ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">
                  Livraison
                </p>
                <p className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{o.addresses.label}</p>
                <p className="mt-1 whitespace-pre-line text-stone-600 dark:text-zinc-400">
                  {o.addresses.address}
                  {"\n"}
                  {o.addresses.city}
                </p>
                {o.addresses.instructions ? (
                  <p className="mt-3 italic text-stone-600 dark:text-zinc-400">Note : {o.addresses.instructions}</p>
                ) : null}
              </>
            ) : (
              <p className="text-stone-600 dark:text-zinc-500">Adresse non disponible.</p>
            )}
          </div>
        </div>

        {o.delivery_notes ? (
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Instructions client</h2>
            <p className="mt-2 wt-panel block p-5 text-sm text-zinc-700 dark:text-zinc-300">{o.delivery_notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
