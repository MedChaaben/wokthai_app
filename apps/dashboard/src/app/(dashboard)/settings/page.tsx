"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabase, useStaffProfile, updateStoreDeliveryEnabled } from "@wokthai/shared";

export default function StoreSettingsPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const staff = useStaffProfile();
  const storeId = staff.data?.store_id;

  const storeQuery = useQuery({
    queryKey: ["store", storeId, "delivery_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, delivery_enabled")
        .eq("id", storeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(storeId),
  });

  const toggleMut = useMutation({
    mutationFn: (deliveryEnabled: boolean) =>
      updateStoreDeliveryEnabled(supabase, storeId!, deliveryEnabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["store", storeId, "delivery_enabled"] });
    },
  });

  if (staff.isLoading || !staff.data) {
    return (
      <div className="text-stone-600 dark:text-zinc-400">Chargement…</div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Magasin</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Options pour{" "}
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {staff.data.stores?.name ?? "votre magasin"}
          </span>
          {staff.data.stores?.city ? ` · ${staff.data.stores.city}` : null}.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
        {storeQuery.isLoading ? (
          <p className="text-sm text-stone-600 dark:text-zinc-400">Chargement des réglages…</p>
        ) : storeQuery.isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Impossible de charger les réglages. Vérifiez que la migration base de données est appliquée.
          </p>
        ) : (
          <label className="flex cursor-pointer items-start gap-4">
            <button
              type="button"
              role="switch"
              aria-checked={storeQuery.data?.delivery_enabled !== false}
              disabled={toggleMut.isPending}
              onClick={() => {
                const currentOn = storeQuery.data?.delivery_enabled !== false;
                toggleMut.mutate(!currentOn);
              }}
              className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
                storeQuery.data?.delivery_enabled !== false
                  ? "bg-wt-bordeaux"
                  : "bg-stone-300 dark:bg-zinc-600"
              } ${toggleMut.isPending ? "opacity-60" : ""}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  storeQuery.data?.delivery_enabled !== false ? "left-6" : "left-1"
                }`}
              />
            </button>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Livraison à domicile
              </span>
              <span className="mt-1 block text-sm text-stone-600 dark:text-zinc-400">
                Désactivé : seul le retrait au magasin est proposé dans l’app (les clients ne peuvent plus
                choisir la livraison pour ce point de vente).
              </span>
            </span>
          </label>
        )}
        {toggleMut.isError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {toggleMut.error instanceof Error ? toggleMut.error.message : "Erreur lors de l’enregistrement."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
