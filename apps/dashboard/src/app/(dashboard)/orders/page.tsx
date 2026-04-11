"use client";

import { useOrders, useStaffProfile } from "@wokthai/shared";
import { OrdersCommandCenter } from "@/components/OrdersCommandCenter";

export default function OrdersPage() {
  const staff = useStaffProfile();
  const storeId = staff.data?.store_id;

  const orders = useOrders({
    mode: "staff",
    storeId,
    enabled: Boolean(storeId),
  });

  if (staff.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-stone-600 dark:text-zinc-400">
        Chargement du profil…
      </div>
    );
  }

  if (!storeId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Aucun point de vente</h1>
        <p className="mt-2 text-stone-600 dark:text-zinc-400">
          Votre profil n’est pas rattaché à un magasin. Contactez l’administrateur.
        </p>
      </div>
    );
  }

  const storeLabel = staff.data?.stores?.name
    ? `${staff.data.stores.name}${staff.data.stores.city ? ` · ${staff.data.stores.city}` : ""}`
    : "Magasin";

  return <OrdersCommandCenter variant="staff" ordersQuery={orders} storeLabel={storeLabel} />;
}
