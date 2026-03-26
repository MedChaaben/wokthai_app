"use client";

import Link from "next/link";
import {
  useOrders,
  useStaffProfile,
  useStoreOrdersRealtime,
  type OrderListRow,
} from "@wokthai/shared";

const STATUS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
};

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
    return `Livraison — ${a.label} · ${a.address}, ${a.city}`;
  }
  const s = o.stores;
  if (!s) return "À emporter — lieu de retrait inconnu";
  return `À emporter — ${s.name} · ${s.address}, ${s.city}`;
}

export default function OrdersPage() {
  const staff = useStaffProfile();
  const storeId = staff.data?.store_id;
  const orders = useOrders({ mode: "staff", storeId });
  useStoreOrdersRealtime(storeId);

  if (staff.isLoading || orders.isLoading) {
    return <p className="text-stone-600">Chargement des commandes…</p>;
  }

  if (orders.error) {
    return <p className="text-red-600">{orders.error.message}</p>;
  }

  const list = orders.data ?? [];
  const storeLabel = staff.data?.stores?.name
    ? `${staff.data.stores.name} (${staff.data.stores.city})`
    : "votre magasin";

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-stone-900">Commandes</h1>
      <p className="mt-1 text-stone-600">
        Liste limitée à <span className="font-medium text-stone-800">{storeLabel}</span> — le client choisit le
        magasin à la commande.
      </p>
      <p className="mt-1 text-sm text-stone-500">Mise à jour en temps réel.</p>
      <ul className="mt-8 space-y-3">
        {list.length === 0 ? (
          <li className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
            Aucune commande pour le moment.
          </li>
        ) : (
          list.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-orange-300 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-base font-bold text-stone-900">{clientLabel(o.users)}</p>
                  <p className="text-sm font-semibold text-stone-800">
                    <span className="text-orange-700">
                      {o.type === "delivery" ? "Livraison" : "À emporter"}
                    </span>
                    <span className="text-stone-400"> · </span>
                    {STATUS[o.status] ?? o.status}
                  </p>
                  <p className="text-sm leading-snug text-stone-600">{placeSummary(o)}</p>
                  <p className="font-mono text-xs text-stone-500">{o.id}</p>
                  <p className="text-xs text-stone-500">
                    {new Date(o.created_at).toLocaleString("fr-TN")}
                  </p>
                </div>
                <p className="shrink-0 text-lg font-bold text-orange-600 md:pt-0.5 md:text-right">
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
