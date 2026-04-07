"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useSupabase,
  useStaffProfile,
  updateStoreDeliveryEnabled,
  updateStore,
  fetchStoreOpeningHoursForStore,
  replaceStoreOpeningHoursForMyStore,
  STORE_OPENING_DAY_LABELS,
  type StoreOpeningHourRow,
  type StoreOpeningHourSlotInput,
} from "@wokthai/shared";

const DAY_LONG: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

type SlotDraft = { clientKey: string; open: string; close: string };

function newClientKey(): string {
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowsToDraftByDay(rows: StoreOpeningHourRow[]): Record<number, SlotDraft[]> {
  const out: Record<number, SlotDraft[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
  for (const r of rows) {
    const list = out[r.day_of_week];
    if (!list) continue;
    list.push({
      clientKey: r.id,
      open: r.open_time.slice(0, 5),
      close: r.close_time.slice(0, 5),
    });
  }
  return out;
}

function emptyDraftByDay(): Record<number, SlotDraft[]> {
  return { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
}

function toTimeWithSeconds(hhmm: string): string {
  const t = hhmm.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

function validateSlots(byDay: Record<number, SlotDraft[]>): string | null {
  for (const d of DAYS) {
    for (const s of byDay[d]) {
      if (!/^\d{2}:\d{2}$/.test(s.open) || !/^\d{2}:\d{2}$/.test(s.close)) {
        return `Jour ${STORE_OPENING_DAY_LABELS[d]} : heures au format HH:MM (ex. 09:30).`;
      }
      if (s.open >= s.close) {
        return `Jour ${STORE_OPENING_DAY_LABELS[d]} : l’heure d’ouverture doit être avant la fermeture (${s.open} – ${s.close}).`;
      }
    }
  }
  return null;
}

function buildPayload(byDay: Record<number, SlotDraft[]>): StoreOpeningHourSlotInput[] {
  const slots: StoreOpeningHourSlotInput[] = [];
  for (const d of DAYS) {
    byDay[d].forEach((s, i) => {
      slots.push({
        day_of_week: d,
        open_time: toTimeWithSeconds(s.open),
        close_time: toTimeWithSeconds(s.close),
        sort_order: i,
      });
    });
  }
  return slots;
}

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
        .select("id, name, delivery_enabled, prep_time_minutes, kitchen_load_extra_minutes")
        .eq("id", storeId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(storeId),
  });

  const hoursQuery = useQuery({
    queryKey: ["store", storeId, "opening_hours"],
    queryFn: () => fetchStoreOpeningHoursForStore(supabase, storeId!),
    enabled: Boolean(storeId),
  });

  const [draftByDay, setDraftByDay] = useState<Record<number, SlotDraft[]>>(emptyDraftByDay);

  useEffect(() => {
    if (!hoursQuery.data) return;
    setDraftByDay(rowsToDraftByDay(hoursQuery.data));
  }, [hoursQuery.data]);

  const toggleMut = useMutation({
    mutationFn: (deliveryEnabled: boolean) =>
      updateStoreDeliveryEnabled(supabase, storeId!, deliveryEnabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["store", storeId, "delivery_enabled"] });
    },
  });

  const saveKitchenMut = useMutation({
    mutationFn: (patch: { prep_time_minutes: number; kitchen_load_extra_minutes: number }) =>
      updateStore(supabase, storeId!, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["store", storeId, "delivery_enabled"] });
    },
  });

  const [prepDraft, setPrepDraft] = useState("");
  const [loadDraft, setLoadDraft] = useState("");

  useEffect(() => {
    if (!storeQuery.data) return;
    setPrepDraft(String(storeQuery.data.prep_time_minutes ?? 30));
    setLoadDraft(String(storeQuery.data.kitchen_load_extra_minutes ?? 0));
  }, [storeQuery.data]);

  const saveHoursMut = useMutation({
    mutationFn: (slots: StoreOpeningHourSlotInput[]) =>
      replaceStoreOpeningHoursForMyStore(supabase, slots),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["store", storeId, "opening_hours"] });
      void qc.invalidateQueries({ queryKey: ["stores", "active"] });
    },
  });

  const addSlot = useCallback((day: number) => {
    setDraftByDay((prev) => ({
      ...prev,
      [day]: [...prev[day], { clientKey: newClientKey(), open: "11:00", close: "14:30" }],
    }));
  }, []);

  const removeSlot = useCallback((day: number, clientKey: string) => {
    setDraftByDay((prev) => ({
      ...prev,
      [day]: prev[day].filter((s) => s.clientKey !== clientKey),
    }));
  }, []);

  const updateSlot = useCallback((day: number, clientKey: string, field: "open" | "close", value: string) => {
    setDraftByDay((prev) => ({
      ...prev,
      [day]: prev[day].map((s) => (s.clientKey === clientKey ? { ...s, [field]: value } : s)),
    }));
  }, []);

  const onSaveHours = useCallback(() => {
    const err = validateSlots(draftByDay);
    if (err) {
      window.alert(err);
      return;
    }
    saveHoursMut.mutate(buildPayload(draftByDay));
  }, [draftByDay, saveHoursMut]);

  const hoursDirty = useMemo(() => {
    if (!hoursQuery.data) return false;
    const fromDb = buildPayload(rowsToDraftByDay(hoursQuery.data));
    const current = buildPayload(draftByDay);
    if (fromDb.length !== current.length) return true;
    for (let i = 0; i < fromDb.length; i++) {
      const a = fromDb[i];
      const b = current[i];
      if (
        a.day_of_week !== b.day_of_week ||
        a.open_time !== b.open_time ||
        a.close_time !== b.close_time ||
        a.sort_order !== b.sort_order
      ) {
        return true;
      }
    }
    return false;
  }, [hoursQuery.data, draftByDay]);

  if (staff.isLoading || !staff.data) {
    return <div className="text-stone-600 dark:text-zinc-400">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Restaurant</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Options pour{" "}
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {staff.data.stores?.name ?? "votre restaurant"}
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
                Désactivé : seul le retrait au magasin est proposé dans l’app (les clients ne peuvent plus choisir la
                livraison pour ce point de vente).
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

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Temps de préparation (app client)</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Ces réglages alimentent l’estimation affichée aux clients après validation de la commande (suivi en direct).
        </p>
        {storeQuery.isLoading ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-zinc-400">Chargement…</p>
        ) : storeQuery.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">Impossible de charger les durées.</p>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="prep-minutes" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Préparation cuisine (minutes)
              </label>
              <input
                id="prep-minutes"
                type="number"
                min={5}
                max={120}
                value={prepDraft}
                onChange={(e) => setPrepDraft(e.target.value)}
                className="mt-1 w-full max-w-[12rem] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">Base utilisée pour l’étape « en cuisine ».</p>
            </div>
            <div>
              <label htmlFor="kitchen-load" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Charge cuisine (+ minutes)
              </label>
              <input
                id="kitchen-load"
                type="number"
                min={0}
                max={60}
                value={loadDraft}
                onChange={(e) => setLoadDraft(e.target.value)}
                className="mt-1 w-full max-w-[12rem] rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">
                Ajoutées au temps de préparation quand le service est chargé (rush, gros volume).
              </p>
            </div>
            <button
              type="button"
              disabled={saveKitchenMut.isPending}
              onClick={() => {
                const prep = parseInt(prepDraft, 10);
                const load = parseInt(loadDraft, 10);
                if (Number.isNaN(prep) || prep < 5 || prep > 120) {
                  window.alert("Préparation : nombre entre 5 et 120 minutes.");
                  return;
                }
                if (Number.isNaN(load) || load < 0 || load > 60) {
                  window.alert("Charge : nombre entre 0 et 60 minutes.");
                  return;
                }
                saveKitchenMut.mutate({
                  prep_time_minutes: prep,
                  kitchen_load_extra_minutes: load,
                });
              }}
              className="rounded-lg bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveKitchenMut.isPending ? "Enregistrement…" : "Enregistrer les durées"}
            </button>
            {saveKitchenMut.isError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {saveKitchenMut.error instanceof Error
                  ? saveKitchenMut.error.message
                  : "Erreur lors de l’enregistrement."}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Horaires d’ouverture</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Affichés dans l’app au moment de la commande (checkout), jour par jour. Vous pouvez ajouter plusieurs créneaux
          le même jour (ex. midi et soir).
        </p>

        {hoursQuery.isLoading ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-zinc-400">Chargement des horaires…</p>
        ) : hoursQuery.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            Impossible de charger les horaires. Vérifiez que la migration <code className="rounded bg-stone-100 px-1 dark:bg-zinc-800">store_opening_hours</code> est appliquée.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {DAYS.map((d) => (
              <div key={d} className="border-b border-stone-100 pb-5 last:border-0 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{DAY_LONG[d]}</span>
                  <button
                    type="button"
                    onClick={() => addSlot(d)}
                    className="text-sm font-medium text-wt-bordeaux hover:underline dark:text-red-400"
                  >
                    + Créneau
                  </button>
                </div>
                {draftByDay[d].length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500 dark:text-zinc-500">Fermé ce jour</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {draftByDay[d].map((slot) => (
                      <li key={slot.clientKey} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={slot.open}
                          onChange={(e) => updateSlot(d, slot.clientKey, "open", e.target.value)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                        />
                        <span className="text-stone-400">→</span>
                        <input
                          type="time"
                          value={slot.close}
                          onChange={(e) => updateSlot(d, slot.clientKey, "close", e.target.value)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={() => removeSlot(d, slot.clientKey)}
                          className="ml-auto text-sm text-red-600 hover:underline dark:text-red-400"
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center">
              <button
                type="button"
                disabled={saveHoursMut.isPending || !hoursDirty}
                onClick={() => void onSaveHours()}
                className="rounded-lg bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveHoursMut.isPending ? "Enregistrement…" : "Enregistrer les horaires"}
              </button>
              {!hoursDirty ? (
                <span className="text-xs text-stone-500 dark:text-zinc-500">Aucune modification à enregistrer</span>
              ) : null}
            </div>
            {saveHoursMut.isError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {saveHoursMut.error instanceof Error
                  ? saveHoursMut.error.message
                  : "Erreur lors de l’enregistrement des horaires."}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
