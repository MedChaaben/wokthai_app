"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useOrder,
  useOrderRealtime,
  useUpdateOrderStatus,
  formatCustomerDisplayName,
} from "@wokthai/shared";
import type { OrderRow } from "@wokthai/shared";

const STATUSES: OrderRow["status"][] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "delivering",
  "delivered",
  "cancelled",
];

const LABELS: Record<OrderRow["status"], string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivering: "En cours de livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

function fmtMoney(n: string | number): string {
  return Number(n).toFixed(2);
}

function fmtTimelineTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const order = useOrder(id);
  useOrderRealtime(id);
  const updateStatus = useUpdateOrderStatus();

  if (order.isLoading) return <p className="text-stone-600 dark:text-zinc-400">Chargement…</p>;
  if (order.error || !order.data) {
    return (
      <div>
        <p className="text-red-600">Commande introuvable ou accès refusé.</p>
        <Link href="/orders" className="mt-4 inline-block text-wt-bordeaux dark:text-wt-accent">
          Retour
        </Link>
      </div>
    );
  }

  const o = order.data;
  const items = o.order_items ?? [];
  const statusEvents = o.order_status_events ?? [{ status: o.status, created_at: o.created_at }];

  return (
    <div className="max-w-3xl">
      <Link href="/orders" className="text-sm font-semibold text-wt-bordeaux dark:text-wt-accent">
        ← Commandes
      </Link>
      <h1 className="mt-4 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Détail commande</h1>
      <p className="mt-2 font-mono text-xs text-stone-600 dark:text-zinc-500">{o.id}</p>

      <div className="mt-6 space-y-6">
        <div className="space-y-4 wt-panel p-6">
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Contact</p>
            <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatCustomerDisplayName(o.users)}</p>
            <dl className="mt-3 space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
              <div>
                <dt className="font-medium text-stone-600 dark:text-zinc-500">Téléphone</dt>
                <dd className="mt-0.5">
                  {o.users?.phone?.trim() ? (
                    <a
                      href={`tel:${o.users.phone.replace(/\s/g, "")}`}
                      className="font-semibold text-wt-bordeaux underline-offset-2 hover:underline dark:text-wt-accent"
                    >
                      {o.users.phone.trim()}
                    </a>
                  ) : (
                    <span className="text-stone-600 dark:text-zinc-400">—</span>
                  )}
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
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Statut</p>
            <select
              value={o.status}
              disabled={updateStatus.isPending}
              onChange={(e) => {
                const status = e.target.value as OrderRow["status"];
                void updateStatus.mutateAsync({ orderId: o.id, status });
              }}
              className="mt-1 w-full max-w-md rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2 text-zinc-900 dark:text-zinc-100"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            <p>
              <span className="font-semibold">Type :</span>{" "}
              {o.type === "delivery" ? "Livraison" : "À emporter"}
            </p>
            <p>
              <span className="font-semibold">Paiement :</span>{" "}
              {o.payment_status === "paid_on_delivery" ? "À la livraison" : "Non payé"}
            </p>
            <p>
              <span className="font-semibold">Total :</span>{" "}
              <span className="text-wt-bordeaux dark:text-wt-accent">{fmtMoney(o.total_price)} TND</span>
            </p>
            <p>
              <span className="font-semibold">Créée :</span>{" "}
              {new Date(o.created_at).toLocaleString("fr-TN")}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Suivi du statut</h2>
          <div className="mt-2 wt-panel p-5">
            <ul className="flex flex-col">
              {statusEvents.map((ev, i) => {
                const isLast = i === statusEvents.length - 1;
                return (
                  <li key={`${ev.created_at}-${ev.status}-${i}`} className="flex gap-3">
                    <div className="flex w-[22px] shrink-0 flex-col items-center self-stretch">
                      <div
                        className={`h-3 w-3 shrink-0 rounded-full border-2 ${
                          isLast
                            ? "border-orange-500 bg-orange-100 dark:bg-orange-950/50"
                            : "border-stone-400 dark:border-zinc-600 bg-stone-200 dark:bg-zinc-700"
                        }`}
                      />
                      {!isLast ? (
                        <div className="mt-1 min-h-[10px] w-0.5 flex-1 rounded-full bg-stone-200 dark:bg-zinc-700" />
                      ) : null}
                    </div>
                    <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-5"}`}>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{LABELS[ev.status] ?? ev.status}</p>
                      <p className="mt-1 text-sm text-stone-600 dark:text-zinc-500">{fmtTimelineTime(ev.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
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
                <p className="text-stone-600 dark:text-zinc-500">Magasin non renseigné.</p>
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
                  <p className="mt-3 text-stone-600 dark:text-zinc-400 italic">Note : {o.addresses.instructions}</p>
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
            <p className="mt-2 wt-panel block p-5 text-sm text-zinc-700 dark:text-zinc-300">
              {o.delivery_notes}
            </p>
          </div>
        ) : null}

        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Articles</h2>
          {items.length === 0 ? (
            <p className="mt-2 wt-dashed-empty block text-stone-600 dark:text-zinc-500">
              Aucune ligne enregistrée.
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {items.map((line) => {
                const p = line.products;
                const name = p?.name ?? "Produit";
                const lineTotal = Number(line.unit_price) * line.quantity;
                const opts = line.order_item_options ?? [];
                const desc = p?.description?.trim();

                return (
                  <li
                    key={line.id}
                    className="overflow-hidden wt-panel"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
                      {p?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-28 w-full shrink-0 rounded-xl object-cover sm:h-28 sm:w-28"
                        />
                      ) : (
                        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl wt-inset text-xs sm:w-28">
                          Pas d’image
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{name}</p>
                          <p className="text-lg font-bold text-wt-bordeaux dark:text-wt-accent">{fmtMoney(lineTotal)} TND</p>
                        </div>
                        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-500">
                          {line.quantity} × {fmtMoney(line.unit_price)} TND
                        </p>
                        {opts.length > 0 ? (
                          <ul className="mt-3 space-y-1 border-t border-stone-200 dark:border-zinc-800 pt-3">
                            <li className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-zinc-500">
                              Options
                            </li>
                            {opts.map((opt, i) => {
                              const mod = Number(opt.price_modifier);
                              const extra =
                                mod !== 0
                                  ? mod > 0
                                    ? ` (+${fmtMoney(mod)} TND)`
                                    : ` (${fmtMoney(mod)} TND)`
                                  : "";
                              return (
                                <li key={`${line.id}-opt-${i}`} className="text-sm text-zinc-700 dark:text-zinc-300">
                                  · {opt.option_name}
                                  {extra}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                        {desc ? (
                          <div className="mt-3 border-t border-stone-200 dark:border-zinc-800 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-zinc-500">
                              Description / ingrédients (fiche produit)
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600 dark:text-zinc-400">{desc}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
