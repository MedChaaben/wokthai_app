"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  useSupabase,
  useCategories,
  useProducts,
  useUpsellConfig,
  replaceUpsellCampaignCategories,
  createUpsellCampaign,
  updateUpsellCampaign,
  deleteUpsellCampaign,
  createUpsellSuggestion,
  deleteUpsellSuggestion,
  updateUpsellSuggestion,
  type UpsellSuggestionWithProduct,
} from "@wokthai/shared";
import { ConfirmModal } from "./ConfirmModal";

const inputClass =
  "w-full rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-wt-bordeaux/45 focus:outline-none focus:ring-2 focus:ring-wt-bordeaux/15 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-500 dark:focus:border-wt-accent/45 dark:focus:ring-wt-accent/20";

const selectClass =
  "w-full cursor-pointer rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-zinc-300 focus:border-wt-bordeaux/45 focus:outline-none focus:ring-2 focus:ring-wt-bordeaux/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-500 dark:focus:border-wt-accent/45 dark:focus:ring-wt-accent/20";

const gripBtnClass =
  "flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-zinc-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-600 active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300";

function IconGrip() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM9 17a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
    </svg>
  );
}

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-zinc-500 dark:text-zinc-400">
        {children}
      </span>
      {hint ? (
        <p className="mt-1 text-xs font-normal normal-case tracking-normal leading-snug text-zinc-400 dark:text-zinc-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-wt-bordeaux-muted text-xs font-bold tabular-nums text-wt-bordeaux dark:bg-wt-bordeaux-muted/40 dark:text-wt-accent">
        {n}
      </span>
      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
    </div>
  );
}

type SuggestionPatchVars = { id: string; patch: { position?: number; is_active?: boolean } };

type SuggestionMutations = {
  patchSuggestion: { mutate: (v: SuggestionPatchVars) => void; isPending: boolean };
  removeSuggestion: { mutate: (id: string) => void; isPending: boolean };
  reorderSuggestions: { mutate: (orderedIds: string[]) => void; isPending: boolean };
};

function groupAvailableByCategory<T extends { category_id: string; position: number; name: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const p of items) {
    const arr = map.get(p.category_id) ?? [];
    arr.push(p);
    map.set(p.category_id, arr);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "fr"));
  }
  return map;
}

export function UpsellSuggestionsSection() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const categories = useCategories();
  const products = useProducts({ onlyAvailable: false });
  const config = useUpsellConfig();
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newProductId, setNewProductId] = useState("");

  const campaignsSorted = useMemo(() => {
    return [...(config.data?.campaigns ?? [])].sort((a, b) => a.position - b.position);
  }, [config.data?.campaigns]);

  useEffect(() => {
    const list = campaignsSorted;
    queueMicrotask(() => {
      if (list.length === 0) {
        setSelectedCampaignId("");
        return;
      }
      if (!selectedCampaignId || !list.some((c) => c.id === selectedCampaignId)) {
        setSelectedCampaignId(list[0].id);
      }
    });
  }, [campaignsSorted, selectedCampaignId]);

  const createCampaign = useMutation({
    mutationFn: () => createUpsellCampaign(supabase, newCampaignName),
    onSuccess: (r) => {
      setNewCampaignName("");
      setSelectedCampaignId(r.campaignId);
      void qc.invalidateQueries({ queryKey: ["upsell-config"] });
    },
  });

  const renameCampaign = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateUpsellCampaign(supabase, id, { name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => deleteUpsellCampaign(supabase, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const reorderCampaignsMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(orderedIds.map((id, index) => updateUpsellCampaign(supabase, id, { position: index })));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const saveCampaignCategories = useMutation({
    mutationFn: async ({ campaignId, categoryIds }: { campaignId: string; categoryIds: string[] }) =>
      replaceUpsellCampaignCategories(supabase, campaignId, categoryIds),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const addSuggestion = useMutation({
    mutationFn: async ({ campaignId, productId }: { campaignId: string; productId: string }) => {
      const same = (config.data?.suggestions ?? []).filter((s) => s.campaign_id === campaignId);
      const nextPos = (same.reduce((m, s) => Math.max(m, s.position), -1) ?? -1) + 1;
      await createUpsellSuggestion(supabase, { campaign_id: campaignId, product_id: productId, position: nextPos, is_active: true });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const patchSuggestion = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { position?: number; is_active?: boolean } }) =>
      updateUpsellSuggestion(supabase, id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const removeSuggestion = useMutation({
    mutationFn: (id: string) => deleteUpsellSuggestion(supabase, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const reorderSuggestions = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(orderedIds.map((id, index) => updateUpsellSuggestion(supabase, id, { position: index })));
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["upsell-config"] }),
  });

  const categoriesByCampaignId = config.data?.categoriesByCampaignId ?? {};
  const suggestions = config.data?.suggestions ?? [];
  const allProducts = products.data ?? [];
  const catsList = categories.data ?? [];

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories.data ?? []) m.set(c.id, c.name);
    return m;
  }, [categories.data]);

  const selectedCampaign = campaignsSorted.find((c) => c.id === selectedCampaignId);
  const selectedName = selectedCampaign?.name ?? "";

  const savingCategories =
    saveCampaignCategories.isPending && saveCampaignCategories.variables?.campaignId === selectedCampaignId;

  const [activeDragCampaignId, setActiveDragCampaignId] = useState<string | null>(null);
  const [deleteCampaignModalOpen, setDeleteCampaignModalOpen] = useState(false);
  const campaignSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (config.isLoading || categories.isLoading || products.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-6 py-16 dark:border-zinc-700 dark:bg-zinc-900/50">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-500 dark:border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Chargement des relances…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="wt-panel overflow-hidden p-5 sm:p-6">
        <StepBadge n={1} label="Relances (nom libre)" />
        <p className="mb-5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Chaque relance a un <span className="font-medium text-zinc-800 dark:text-zinc-200">nom</span> (ex. Boisson, Dessert, Menu midi). L’app les évalue dans l’ordre ci‑dessous : dès qu’une relance s’applique, ses plats sont proposés (avec les autres relances encore éligibles, sans doublon de plat).
        </p>

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-end">
          <div>
            <FieldLabel hint="Liste de vos relances.">Relance à éditer</FieldLabel>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className={selectClass}
              disabled={campaignsSorted.length === 0}
              aria-label="Relance à éditer"
            >
              {campaignsSorted.length === 0 ? <option value="">Aucune relance</option> : null}
              {campaignsSorted.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-zinc-700/80 dark:bg-zinc-950/40">
            <FieldLabel hint="Ex. « Dessert », « Accompagnement ».">Nouvelle relance</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCampaignName.trim() && !createCampaign.isPending) {
                    e.preventDefault();
                    createCampaign.mutate();
                  }
                }}
                placeholder="Nom de la relance"
                className={`${inputClass} sm:min-w-0 sm:flex-1`}
                aria-label="Nom de la nouvelle relance"
              />
              <button
                type="button"
                disabled={createCampaign.isPending || !newCampaignName.trim()}
                onClick={() => createCampaign.mutate()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wt-bordeaux-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wt-bordeaux/50 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:outline-wt-accent/60"
              >
                <IconPlus />
                {createCampaign.isPending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>

        {createCampaign.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {createCampaign.error instanceof Error ? createCampaign.error.message : "Erreur"}
          </p>
        ) : null}

        {campaignsSorted.length > 1 ? (
          <div className="mt-8 border-t border-zinc-200/80 pt-6 dark:border-zinc-800">
            <FieldLabel hint="Ordre d’évaluation dans l’app (la première peut déclencher avant la suivante).">
              Ordre des relances
            </FieldLabel>
            {reorderCampaignsMut.isError ? (
              <p className="mb-2 text-sm text-red-600 dark:text-red-400" role="alert">
                Impossible d’enregistrer l’ordre des relances.
              </p>
            ) : null}
            {reorderCampaignsMut.isPending ? (
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-wt-bordeaux dark:text-zinc-400">
                <span
                  className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-400 dark:border-t-transparent"
                  aria-hidden
                />
                Enregistrement…
              </p>
            ) : null}
            <DndContext
              sensors={campaignSensors}
              collisionDetection={closestCenter}
              onDragStart={(e: DragStartEvent) => setActiveDragCampaignId(String(e.active.id))}
              onDragCancel={() => setActiveDragCampaignId(null)}
              onDragEnd={(event: DragEndEvent) => {
                setActiveDragCampaignId(null);
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const oldIndex = campaignsSorted.findIndex((x) => x.id === active.id);
                const newIndex = campaignsSorted.findIndex((x) => x.id === over.id);
                if (oldIndex === -1 || newIndex === -1) return;
                const reordered = arrayMove(campaignsSorted, oldIndex, newIndex);
                reorderCampaignsMut.mutate(reordered.map((x) => x.id));
              }}
            >
              <SortableContext items={campaignsSorted.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <ul className="mt-3 space-y-2">
                  {campaignsSorted.map((c, idx) => (
                    <SortableCampaignOrderRow
                      key={c.id}
                      campaign={c}
                      index={idx}
                      reorderDisabled={reorderCampaignsMut.isPending}
                    />
                  ))}
                </ul>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeDragCampaignId ? (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-lg ring-2 ring-wt-bordeaux/20 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-wt-accent/25">
                    <span className={`${gripBtnClass} cursor-grabbing`}>
                      <IconGrip />
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {campaignsSorted.find((x) => x.id === activeDragCampaignId)?.name ?? ""}
                    </span>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : null}
      </section>

      {selectedCampaignId && selectedCampaign ? (
        <section className="wt-panel overflow-hidden p-5 sm:p-6">
          <StepBadge n={2} label={`Configurer — ${selectedName}`} />
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Si le panier ne contient <span className="font-medium text-zinc-800 dark:text-zinc-200">aucun plat</span> des
            catégories cochées, l’app peut proposer une fois les plats de votre liste (avec les autres relances encore
            applicables).
          </p>

          <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/40 p-4 shadow-sm dark:border-zinc-700/80 dark:from-zinc-950 dark:to-zinc-950/80 sm:p-5">
            <div className="flex flex-col gap-4 border-b border-zinc-200/70 pb-5 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 sm:max-w-lg">
                <FieldLabel hint="Libellé interne (onglets, liste).">Nom de la relance</FieldLabel>
                <input
                  key={`rename-${selectedCampaignId}-${selectedName}`}
                  defaultValue={selectedName}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== selectedName) renameCampaign.mutate({ id: selectedCampaignId, name: v });
                  }}
                  className={`${inputClass} text-base font-semibold sm:text-sm`}
                />
              </div>
              <button
                type="button"
                disabled={deleteCampaign.isPending}
                onClick={() => setDeleteCampaignModalOpen(true)}
                className="shrink-0 rounded-xl border border-red-200/90 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/35 disabled:opacity-50"
              >
                Supprimer cette relance
              </button>
            </div>

            <div className="mt-6 space-y-8">
              <div className="rounded-2xl bg-zinc-50/90 p-4 dark:bg-zinc-950/50">
                <FieldLabel hint="Un plat du panier dans une de ces catégories fait que cette relance ne s’applique pas (pour ce type d’article).">
                  Détection dans le panier
                </FieldLabel>
                <p className="mb-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Quelles catégories du menu comptent pour cette relance ?
                </p>
                {savingCategories ? (
                  <p className="mb-3 flex items-center gap-2 text-xs font-medium text-wt-bordeaux dark:text-zinc-400">
                    <span
                      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-400 dark:border-t-transparent"
                      aria-hidden
                    />
                    Enregistrement…
                  </p>
                ) : null}
                {catsList.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-zinc-200/90 bg-white/60 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
                    Créez d’abord des catégories dans le menu Produits.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {catsList.map((c) => {
                      const selectedCats = categoriesByCampaignId[selectedCampaignId] ?? [];
                      const checked = selectedCats.includes(c.id);
                      return (
                        <label
                          key={`${selectedCampaignId}-${c.id}`}
                          className={`flex cursor-pointer select-none items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 ${
                            savingCategories ? "pointer-events-none opacity-60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...selectedCats, c.id]
                                : selectedCats.filter((id) => id !== c.id);
                              saveCampaignCategories.mutate({ campaignId: selectedCampaignId, categoryIds: next });
                            }}
                            className="h-4 w-4 shrink-0 rounded border-zinc-300 text-wt-bordeaux focus:ring-wt-bordeaux/30 dark:border-zinc-600 dark:focus:ring-wt-accent/30"
                          />
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <FieldLabel hint="L’ordre d’affichage dans la modale ; glissez ⋮⋮ pour le modifier.">
                  Plats proposés au client
                </FieldLabel>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Décochez « Proposer » pour masquer un plat sans le retirer.
                </p>

                <SuggestionsList
                  label={selectedName}
                  kindSuggestions={suggestions.filter((s) => s.campaign_id === selectedCampaignId)}
                  mutations={{
                    patchSuggestion,
                    removeSuggestion,
                    reorderSuggestions,
                  }}
                />

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <AddProductSelect
                    campaignId={selectedCampaignId}
                    label={selectedName}
                    suggestions={suggestions}
                    allProducts={allProducts}
                    catsList={catsList}
                    categoryNameById={categoryNameById}
                    selectionValue={newProductId}
                    onSelectionChange={setNewProductId}
                  />
                  <button
                    type="button"
                    disabled={!newProductId || addSuggestion.isPending}
                    onClick={() => {
                      if (!newProductId) return;
                      addSuggestion.mutate({ campaignId: selectedCampaignId, productId: newProductId });
                      setNewProductId("");
                    }}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-wt-bordeaux px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wt-bordeaux-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wt-bordeaux/50 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:outline-wt-accent/60"
                  >
                    <IconPlus />
                    {addSuggestion.isPending ? "Ajout…" : "Ajouter à la liste"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="wt-dashed-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/80">
            <IconLayers />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">Aucune relance pour l’instant</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Donnez un nom ci‑dessus et cliquez sur <span className="font-medium text-zinc-700 dark:text-zinc-300">Créer</span>.
          </p>
        </div>
      )}

      {config.isError ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
          {config.error instanceof Error ? config.error.message : "Erreur de chargement"}
        </p>
      ) : null}
      {saveCampaignCategories.isError ||
      addSuggestion.isError ||
      patchSuggestion.isError ||
      removeSuggestion.isError ||
      renameCampaign.isError ||
      deleteCampaign.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Une sauvegarde a échoué. Vérifiez votre connexion et réessayez.
        </p>
      ) : null}

      <ConfirmModal
        open={deleteCampaignModalOpen}
        onClose={() => setDeleteCampaignModalOpen(false)}
        title="Supprimer cette relance ?"
        description={
          <>
            La relance <span className="font-semibold text-zinc-800 dark:text-zinc-200">« {selectedName} »</span> sera
            supprimée. Les plats associés seront retirés de cette relance.
          </>
        }
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (selectedCampaignId) deleteCampaign.mutate(selectedCampaignId);
          setDeleteCampaignModalOpen(false);
        }}
        isPending={deleteCampaign.isPending}
      />
    </div>
  );
}

function SortableCampaignOrderRow({
  campaign,
  index,
  reorderDisabled,
}: {
  campaign: { id: string; name: string };
  index: number;
  reorderDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: campaign.id,
    disabled: reorderDisabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/80"
    >
      <button
        type="button"
        title="Déplacer"
        className={gripBtnClass}
        {...attributes}
        {...listeners}
        aria-label={`Déplacer la relance : ${campaign.name}`}
      >
        <IconGrip />
      </button>
      <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{campaign.name}</span>
    </li>
  );
}

function AddProductSelect({
  campaignId,
  label,
  suggestions,
  allProducts,
  catsList,
  categoryNameById,
  selectionValue,
  onSelectionChange,
}: {
  campaignId: string;
  label: string;
  suggestions: UpsellSuggestionWithProduct[];
  allProducts: { id: string; name: string; category_id: string; position: number }[];
  catsList: { id: string; name: string }[];
  categoryNameById: Map<string, string>;
  selectionValue: string;
  onSelectionChange: (v: string) => void;
}) {
  const kindSuggestions = suggestions.filter((s) => s.campaign_id === campaignId);
  const availableToAdd = allProducts.filter((p) => !kindSuggestions.some((s) => s.product.id === p.id));
  const availableByCategory = groupAvailableByCategory(availableToAdd);

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={`upsell-add-${campaignId}`} className="sr-only">
        Plat à ajouter pour {label}
      </label>
      <select
        id={`upsell-add-${campaignId}`}
        value={selectionValue}
        onChange={(e) => onSelectionChange(e.target.value)}
        className={selectClass}
        aria-label={`Choisir un plat pour la relance ${label}`}
      >
        <option value="">Choisir un plat dans le menu…</option>
        {catsList.map((c) => {
          const list = availableByCategory.get(c.id);
          if (!list?.length) return null;
          return (
            <optgroup key={`${campaignId}-og-${c.id}`} label={c.name}>
              {list.map((p) => (
                <option key={`${campaignId}-new-${p.id}`} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          );
        })}
        {availableToAdd.some((p) => !categoryNameById.has(p.category_id)) ? (
          <optgroup label="Autre">
            {availableToAdd
              .filter((p) => !categoryNameById.has(p.category_id))
              .map((p) => (
                <option key={`${campaignId}-new-${p.id}`} value={p.id}>
                  {p.name}
                </option>
              ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}

function SuggestionsList({
  label,
  kindSuggestions,
  mutations,
}: {
  label: string;
  kindSuggestions: UpsellSuggestionWithProduct[];
  mutations: SuggestionMutations;
}) {
  const { patchSuggestion, removeSuggestion, reorderSuggestions } = mutations;
  const sorted = useMemo(
    () =>
      [...kindSuggestions].sort((a, b) => a.position - b.position || a.product.name.localeCompare(b.product.name, "fr")),
    [kindSuggestions]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/50 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/25">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Liste vide</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Ajoutez un plat depuis le menu ci‑dessous.
        </p>
      </div>
    );
  }

  return (
    <>
      {reorderSuggestions.isPending ? (
        <p className="mb-3 flex items-center gap-2 text-xs font-medium text-wt-bordeaux dark:text-zinc-400">
          <span
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-400 dark:border-t-transparent"
            aria-hidden
          />
          Enregistrement de l’ordre…
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={(event: DragEndEvent) => {
          setActiveId(null);
          const { active, over } = event;
          if (!over || active.id === over.id) return;
          const oldIndex = sorted.findIndex((x) => x.id === active.id);
          const newIndex = sorted.findIndex((x) => x.id === over.id);
          if (oldIndex === -1 || newIndex === -1) return;
          const reordered = arrayMove(sorted, oldIndex, newIndex);
          reorderSuggestions.mutate(reordered.map((x) => x.id));
        }}
      >
        <SortableContext items={sorted.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-3">
            {sorted.map((s) => (
              <SortableSuggestionRow
                key={s.id}
                suggestion={s}
                relanceLabel={label}
                mutations={{ patchSuggestion, removeSuggestion }}
                reorderDisabled={reorderSuggestions.isPending}
              />
            ))}
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div className="flex cursor-grabbing items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-xl ring-2 ring-wt-bordeaux/20 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-wt-accent/25">
              <span className={`${gripBtnClass} cursor-grabbing`}>
                <IconGrip />
              </span>
              <span className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {sorted.find((x) => x.id === activeId)?.product.name ?? ""}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function SortableSuggestionRow({
  suggestion: s,
  relanceLabel,
  mutations,
  reorderDisabled,
}: {
  suggestion: UpsellSuggestionWithProduct;
  relanceLabel: string;
  mutations: Pick<SuggestionMutations, "patchSuggestion" | "removeSuggestion">;
  reorderDisabled: boolean;
}) {
  const { patchSuggestion, removeSuggestion } = mutations;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: s.id,
    disabled: reorderDisabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const [removeSuggestionModalOpen, setRemoveSuggestionModalOpen] = useState(false);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:shadow-none"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <button
          type="button"
          title="Déplacer cette ligne"
          className={gripBtnClass}
          {...attributes}
          {...listeners}
          aria-label={`Déplacer ${s.product.name} dans la relance ${relanceLabel}`}
        >
          <IconGrip />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{s.product.name}</p>
          {!s.product.is_available ? (
            <p className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Indisponible à la vente</p>
          ) : null}
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50">
          <input
            type="checkbox"
            checked={s.is_active}
            onChange={(e) => patchSuggestion.mutate({ id: s.id, patch: { is_active: e.target.checked } })}
            className="h-4 w-4 rounded border-zinc-300 text-wt-bordeaux focus:ring-wt-bordeaux/30 dark:border-zinc-600"
          />
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Proposer</span>
        </label>
        <button
          type="button"
          disabled={removeSuggestion.isPending}
          onClick={() => setRemoveSuggestionModalOpen(true)}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Retirer
        </button>
      </div>
      <ConfirmModal
        open={removeSuggestionModalOpen}
        onClose={() => setRemoveSuggestionModalOpen(false)}
        title="Retirer ce plat de la relance ?"
        description={
          <>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">« {s.product.name} »</span> ne sera plus
            proposé dans la relance <span className="font-medium">{relanceLabel}</span>.
          </>
        }
        confirmLabel="Retirer"
        onConfirm={() => {
          removeSuggestion.mutate(s.id);
          setRemoveSuggestionModalOpen(false);
        }}
        isPending={removeSuggestion.isPending}
      />
    </li>
  );
}
