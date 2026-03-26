"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrder, useOrderRealtime, useUpdateOrderStatus } from "@wokthai/shared";
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

export default function OrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const order = useOrder(id);
  useOrderRealtime(id);
  const updateStatus = useUpdateOrderStatus();

  if (order.isLoading) return <p className="text-stone-600">Chargement…</p>;
  if (order.error || !order.data) {
    return (
      <div>
        <p className="text-red-600">Commande introuvable ou accès refusé.</p>
        <Link href="/orders" className="mt-4 inline-block text-orange-600">
          Retour
        </Link>
      </div>
    );
  }

  const o = order.data;
  const items = o.order_items ?? [];

  return (
    <div className="max-w-3xl">
      <Link href="/orders" className="text-sm font-semibold text-orange-600">
        ← Commandes
      </Link>
      <h1 className="mt-4 text-2xl font-extrabold text-stone-900">Détail commande</h1>
      <p className="mt-2 font-mono text-xs text-stone-500">{o.id}</p>

      <div className="mt-6 space-y-6">
        <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-stone-700">Statut</p>
            <select
              value={o.status}
              disabled={updateStatus.isPending}
              onChange={(e) => {
                const status = e.target.value as OrderRow["status"];
                void updateStatus.mutateAsync({ orderId: o.id, status });
              }}
              className="mt-1 w-full max-w-md rounded-xl border border-stone-300 px-3 py-2 text-stone-900"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-stone-700">
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
              <span className="text-orange-600">{fmtMoney(o.total_price)} TND</span>
            </p>
            <p>
              <span className="font-semibold">Créée :</span>{" "}
              {new Date(o.created_at).toLocaleString("fr-TN")}
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-stone-900">Lieu</h2>
          <div className="mt-2 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm text-sm text-stone-700">
            {o.type === "pickup" ? (
              o.stores ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Retrait au magasin</p>
                  <p className="mt-2 text-base font-semibold text-stone-900">{o.stores.name}</p>
                  <p className="mt-1 whitespace-pre-line text-stone-600">
                    {o.stores.address}
                    {"\n"}
                    {o.stores.city}
                  </p>
                </>
              ) : (
                <p className="text-stone-500">Magasin non renseigné.</p>
              )
            ) : o.addresses ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Livraison</p>
                <p className="mt-2 text-base font-semibold text-stone-900">{o.addresses.label}</p>
                <p className="mt-1 whitespace-pre-line text-stone-600">
                  {o.addresses.address}
                  {"\n"}
                  {o.addresses.city}
                </p>
                {o.addresses.instructions ? (
                  <p className="mt-3 text-stone-600 italic">Note : {o.addresses.instructions}</p>
                ) : null}
              </>
            ) : (
              <p className="text-stone-500">Adresse non disponible.</p>
            )}
          </div>
        </div>

        {o.delivery_notes ? (
          <div>
            <h2 className="text-lg font-bold text-stone-900">Instructions client</h2>
            <p className="mt-2 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-700 shadow-sm">
              {o.delivery_notes}
            </p>
          </div>
        ) : null}

        <div>
          <h2 className="text-lg font-bold text-stone-900">Articles</h2>
          {items.length === 0 ? (
            <p className="mt-2 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
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
                    className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
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
                        <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-500 sm:w-28">
                          Pas d’image
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="text-base font-bold text-stone-900">{name}</p>
                          <p className="text-lg font-bold text-orange-600">{fmtMoney(lineTotal)} TND</p>
                        </div>
                        <p className="mt-1 text-sm text-stone-500">
                          {line.quantity} × {fmtMoney(line.unit_price)} TND
                        </p>
                        {opts.length > 0 ? (
                          <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3">
                            <li className="text-xs font-semibold uppercase tracking-wide text-stone-500">
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
                                <li key={`${line.id}-opt-${i}`} className="text-sm text-stone-700">
                                  · {opt.option_name}
                                  {extra}
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                        {desc ? (
                          <div className="mt-3 border-t border-stone-100 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                              Description / ingrédients (fiche produit)
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{desc}</p>
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
