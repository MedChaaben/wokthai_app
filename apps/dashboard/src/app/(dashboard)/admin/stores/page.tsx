"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  useStaffProfile,
  useSupabase,
  fetchAllStores,
  insertStore,
  updateStore,
  fetchStoreOpeningHoursForStore,
  replaceStoreOpeningHoursForStoreAsAdmin,
  STORE_OPENING_DAY_LABELS,
  type StoreOpeningHourRow,
  type StoreOpeningHourSlotInput,
  type StoreRow,
} from "@wokthai/shared";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DAY_LONG: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  7: "Dimanche",
};

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

function toTimeWithSeconds(hhmm: string): string {
  const t = hhmm.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

function validateSlots(byDay: Record<number, SlotDraft[]>): string | null {
  for (const d of DAYS) {
    for (const s of byDay[d]) {
      if (!/^\d{2}:\d{2}$/.test(s.open) || !/^\d{2}:\d{2}$/.test(s.close)) {
        return `Jour ${STORE_OPENING_DAY_LABELS[d]} : heures au format HH:MM.`;
      }
      if (s.open >= s.close) {
        return `Jour ${STORE_OPENING_DAY_LABELS[d]} : ouverture avant fermeture.`;
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

function AdminStoreHoursForm({
  storeId,
  initialRows,
  onSaved,
}: {
  storeId: string;
  initialRows: StoreOpeningHourRow[];
  onSaved: () => void;
}) {
  const supabase = useSupabase();
  const [draftByDay, setDraftByDay] = useState(() => rowsToDraftByDay(initialRows));

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

  const hoursDirty = useMemo(() => {
    const fromDb = buildPayload(rowsToDraftByDay(initialRows));
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
  }, [initialRows, draftByDay]);

  const saveHoursMut = useMutation({
    mutationFn: async () => {
      const err = validateSlots(draftByDay);
      if (err) throw new Error(err);
      await replaceStoreOpeningHoursForStoreAsAdmin(supabase, storeId, buildPayload(draftByDay));
    },
    onSuccess: () => {
      onSaved();
    },
  });

  return (
    <div className="mt-4 space-y-5">
      {DAYS.map((d) => (
        <div key={d} className="border-b border-stone-100 pb-5 last:border-0 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{DAY_LONG[d]}</span>
            <button
              type="button"
              onClick={() => addSlot(d)}
              className="text-sm font-medium text-wt-bordeaux hover:underline dark:text-wt-accent"
            >
              + Créneau
            </button>
          </div>
          {draftByDay[d].length === 0 ? (
            <p className="mt-2 text-sm text-stone-500 dark:text-zinc-500">Fermé</p>
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
      <button
        type="button"
        disabled={saveHoursMut.isPending || !hoursDirty}
        onClick={() => saveHoursMut.mutate()}
        className="rounded-lg bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saveHoursMut.isPending ? "Enregistrement…" : "Enregistrer les horaires"}
      </button>
      {saveHoursMut.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {saveHoursMut.error instanceof Error ? saveHoursMut.error.message : "Erreur"}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminStoresPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const staff = useStaffProfile();
  const isAdmin = staff.data?.role === "platform_admin";

  const storesQuery = useQuery({
    queryKey: ["admin", "stores", "all"],
    queryFn: () => fetchAllStores(supabase),
    enabled: Boolean(isAdmin),
  });

  const [hoursForStoreId, setHoursForStoreId] = useState<string | null>(null);

  const hoursQuery = useQuery({
    queryKey: ["admin", "store", hoursForStoreId, "opening_hours"],
    queryFn: () => fetchStoreOpeningHoursForStore(supabase, hoursForStoreId!),
    enabled: Boolean(hoursForStoreId && isAdmin),
  });

  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState<"Tunis" | "Ariana">("Tunis");
  const [newLat, setNewLat] = useState("36.8065");
  const [newLng, setNewLng] = useState("10.1815");
  const [newPrep, setNewPrep] = useState("30");

  const createMut = useMutation({
    mutationFn: async () => {
      const lat = Number(newLat);
      const lng = Number(newLng);
      const prep = Number(newPrep);
      if (!newName.trim() || !newAddress.trim()) throw new Error("Nom et adresse requis.");
      if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error("Latitude / longitude invalides.");
      const store = await insertStore(supabase, {
        name: newName.trim(),
        address: newAddress.trim(),
        city: newCity,
        lat,
        lng,
        is_active: true,
        prep_time_minutes: Number.isNaN(prep) ? 30 : prep,
        delivery_enabled: true,
      });
      const { error: zErr } = await supabase.from("delivery_zones").insert([
        { store_id: store.id, name: "Livraison Tunis", city: "Tunis", delivery_fee: 5 },
        { store_id: store.id, name: "Livraison Ariana", city: "Ariana", delivery_fee: 5 },
      ]);
      if (zErr) throw zErr;
      return store;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "stores"] });
      void qc.invalidateQueries({ queryKey: ["stores"] });
      setNewName("");
      setNewAddress("");
      setNewCity("Tunis");
      setNewLat("36.8065");
      setNewLng("10.1815");
      setNewPrep("30");
    },
  });

  const [editRow, setEditRow] = useState<StoreRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState<"Tunis" | "Ariana">("Tunis");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editPrep, setEditPrep] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editDelivery, setEditDelivery] = useState(true);

  const openEdit = useCallback((s: StoreRow) => {
    setEditRow(s);
    setEditName(s.name);
    setEditAddress(s.address);
    setEditCity(s.city as "Tunis" | "Ariana");
    setEditLat(String(s.lat));
    setEditLng(String(s.lng));
    setEditPrep(String(s.prep_time_minutes));
    setEditActive(s.is_active);
    setEditDelivery(s.delivery_enabled !== false);
  }, []);

  const saveEditMut = useMutation({
    mutationFn: async () => {
      if (!editRow) throw new Error("Aucune ligne");
      const lat = Number(editLat);
      const lng = Number(editLng);
      const prep = Number(editPrep);
      if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error("Coordonnées invalides.");
      return updateStore(supabase, editRow.id, {
        name: editName.trim(),
        address: editAddress.trim(),
        city: editCity,
        lat,
        lng,
        prep_time_minutes: Number.isNaN(prep) ? editRow.prep_time_minutes : prep,
        is_active: editActive,
        delivery_enabled: editDelivery,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "stores"] });
      void qc.invalidateQueries({ queryKey: ["stores"] });
      setEditRow(null);
    },
  });

  if (!isAdmin) return null;

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Nouveau point de vente</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">
          Crée le restaurant et deux zones de livraison par défaut (Tunis / Ariana, 5 TND). Ajustez les frais ensuite si besoin
          (écran Restaurant côté équipe ou SQL).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold">Nom</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-semibold">Adresse</label>
            <input
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Ville</label>
            <select
              value={newCity}
              onChange={(e) => setNewCity(e.target.value as "Tunis" | "Ariana")}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="Tunis">Tunis</option>
              <option value="Ariana">Ariana</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Préparation (min)</label>
            <input
              value={newPrep}
              onChange={(e) => setNewPrep(e.target.value)}
              type="number"
              min={5}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Latitude</label>
            <input
              value={newLat}
              onChange={(e) => setNewLat(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Longitude</label>
            <input
              value={newLng}
              onChange={(e) => setNewLng(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>
        {createMut.isError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {createMut.error instanceof Error ? createMut.error.message : "Erreur"}
          </p>
        ) : null}
        <button
          type="button"
          disabled={createMut.isPending}
          onClick={() => createMut.mutate()}
          className="mt-4 rounded-lg bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {createMut.isPending ? "Création…" : "Créer le restaurant"}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Restaurants</h2>
        {storesQuery.isLoading ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-zinc-400">Chargement…</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 dark:border-zinc-800">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 dark:border-zinc-800 dark:bg-zinc-900/80">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nom</th>
                  <th className="px-4 py-3 font-semibold">Ville</th>
                  <th className="px-4 py-3 font-semibold">Actif</th>
                  <th className="px-4 py-3 font-semibold">Livraison</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(storesQuery.data ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 dark:border-zinc-800/80">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{s.name}</td>
                    <td className="px-4 py-3 text-stone-700 dark:text-zinc-300">{s.city}</td>
                    <td className="px-4 py-3">{s.is_active ? "Oui" : "Non"}</td>
                    <td className="px-4 py-3">{s.delivery_enabled !== false ? "Oui" : "Non"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setHoursForStoreId(hoursForStoreId === s.id ? null : s.id)}
                          className="text-sm font-medium text-wt-bordeaux hover:underline dark:text-wt-accent"
                        >
                          Horaires
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          className="text-sm font-medium text-wt-bordeaux hover:underline dark:text-wt-accent"
                        >
                          Modifier
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {hoursForStoreId ? (
        <section className="rounded-xl border border-stone-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Horaires du magasin sélectionné</h3>
          {hoursQuery.isLoading ? (
            <p className="mt-4 text-sm text-stone-600 dark:text-zinc-400">Chargement…</p>
          ) : hoursQuery.isError ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">Impossible de charger les horaires.</p>
          ) : hoursQuery.data && hoursForStoreId ? (
            <AdminStoreHoursForm
              key={`${hoursForStoreId}-${hoursQuery.dataUpdatedAt}`}
              storeId={hoursForStoreId}
              initialRows={hoursQuery.data}
              onSaved={() => {
                void qc.invalidateQueries({ queryKey: ["admin", "store", hoursForStoreId, "opening_hours"] });
                void qc.invalidateQueries({ queryKey: ["stores"] });
              }}
            />
          ) : null}
        </section>
      ) : null}

      {editRow ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-900">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Modifier {editRow.name}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm font-semibold">Nom</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Adresse</label>
                <input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Ville</label>
                <select
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value as "Tunis" | "Ariana")}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  <option value="Tunis">Tunis</option>
                  <option value="Ariana">Ariana</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-semibold">Lat</label>
                  <input
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Lng</label>
                  <input
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold">Prépa. (min)</label>
                <input
                  value={editPrep}
                  onChange={(e) => setEditPrep(e.target.value)}
                  type="number"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                <span className="text-sm">Restaurant actif (visible catalogue)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editDelivery} onChange={(e) => setEditDelivery(e.target.checked)} />
                <span className="text-sm">Livraison activée</span>
              </label>
            </div>
            {saveEditMut.isError ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {saveEditMut.error instanceof Error ? saveEditMut.error.message : "Erreur"}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saveEditMut.isPending}
                onClick={() => saveEditMut.mutate()}
                className="rounded-lg bg-wt-bordeaux px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold dark:border-zinc-600"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
