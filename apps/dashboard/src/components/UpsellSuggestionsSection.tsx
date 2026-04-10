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
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  useSupabase,
  useCategories,
  useProducts,
  useUpsellConfig,
  replaceUpsellKindCategories,
  createUpsellSuggestion,
  deleteUpsellSuggestion,
  updateUpsellSuggestion,
  type UpsellKind,
  type UpsellSuggestionWithProduct,
} from "@wokthai/shared";

const selectClass =
  "w-full cursor-pointer rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-zinc-300 focus:border-wt-bordeaux/45 focus:outline-none focus:ring-2 focus:ring-wt-bordeaux/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-500 dark:focus:border-wt-accent/45 dark:focus:ring-wt-accent/20";

const gripBtnClass =
  "flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl border border-zinc-200/90 bg-white text-zinc-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-600 active:cursor-grabbing dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300";

const KINDS: { kind: UpsellKind; label: string; hint: string; typePlural: string }[] = [
  {
    kind: "drink",
    label: "Boisson",
    hint: "Si le panier ne contient aucune boisson (selon vos catégories), l’app propose une fois la liste de plats ci‑dessous.",
    typePlural: "boissons",
  },
  {
    kind: "starter",
    label: "Entrée",
    hint: "Si le panier ne contient aucune entrée (selon vos catégories), l’app propose une fois la liste de plats ci‑dessous.",
    typePlural: "entrées",
  },
];

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
  const [activeKind, setActiveKind] = useState<UpsellKind>("drink");
  const [newProductByKind, setNewProductByKind] = useState<Record<UpsellKind, string>>({
    drink: "",
    starter: "",
  });

  const saveKindCategories = useMutation({
    mutationFn: async ({ kind, categoryIds }: { kind: UpsellKind; categoryIds: string[] }) =>
      replaceUpsellKindCategories(supabase, kind, categoryIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upsell-config"] });
    },
  });

  const addSuggestion = useMutation({
    mutationFn: async ({ kind, productId }: { kind: UpsellKind; productId: string }) => {
      const sameKind = (config.data?.suggestions ?? []).filter((s) => s.kind === kind);
      const nextPos = (sameKind.reduce((m, s) => Math.max(m, s.position), -1) ?? -1) + 1;
      await createUpsellSuggestion(supabase, { kind, product_id: productId, position: nextPos, is_active: true });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upsell-config"] });
    },
  });

  const patchSuggestion = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: { position?: number; is_active?: boolean };
    }) => updateUpsellSuggestion(supabase, id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upsell-config"] });
    },
  });

  const removeSuggestion = useMutation({
    mutationFn: (id: string) => deleteUpsellSuggestion(supabase, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upsell-config"] });
    },
  });

  const reorderSuggestions = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(orderedIds.map((id, index) => updateUpsellSuggestion(supabase, id, { position: index })));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["upsell-config"] });
    },
  });

  const categoriesByKind = config.data?.categoriesByKind ?? { drink: [], starter: [] };
  const suggestions = config.data?.suggestions ?? [];
  const allProducts = products.data ?? [];

  const catsList = categories.data ?? [];
  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories.data ?? []) m.set(c.id, c.name);
    return m;
  }, [categories.data]);

  const activeMeta = KINDS.find((k) => k.kind === activeKind);
  const savingCategories =
    saveKindCategories.isPending && saveKindCategories.variables?.kind === activeKind;

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
        <StepBadge n={1} label="Type de relance" />
        <p className="mb-4 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Avant paiement, l’app affiche <span className="font-medium text-zinc-800 dark:text-zinc-200">une seule fois</span> une
          liste de plats si le panier ne contient pas encore ce type d’article. Choisissez ci‑dessous boisson ou entrée.
        </p>

        <div
          className="flex max-w-lg gap-1 rounded-2xl border border-zinc-200/90 bg-zinc-100/80 p-1.5 dark:border-zinc-700 dark:bg-zinc-950/60"
          role="tablist"
          aria-label="Type de relance"
        >
          {KINDS.map(({ kind, label, hint }) => {
            const selected = activeKind === kind;
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                title={hint}
                aria-selected={selected}
                id={`upsell-tab-${kind}`}
                aria-controls={`upsell-panel-${kind}`}
                onClick={() => setActiveKind(kind)}
                className={`min-w-0 flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wt-bordeaux/40 dark:focus-visible:outline-wt-accent/50 ${
                  selected
                    ? "bg-white text-zinc-900 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] ring-2 ring-wt-bordeaux/25 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-wt-accent/35"
                    : "text-zinc-600 hover:bg-white/70 dark:text-zinc-400 dark:hover:bg-zinc-800/90"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {activeMeta ? (
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{activeMeta.hint}</p>
        ) : null}

        <div className="my-8 border-t border-zinc-200/80 dark:border-zinc-800" />

        {activeMeta ? (
          <div id={`upsell-panel-${activeKind}`} role="tabpanel" aria-labelledby={`upsell-tab-${activeKind}`}>
            <h2 className="sr-only">Relance {activeMeta.label}</h2>
            <StepBadge n={2} label={`Configurer — ${activeMeta.label}`} />

            <div className="mt-2 space-y-8">
              <div className="rounded-2xl bg-zinc-50/90 p-4 sm:p-5 dark:bg-zinc-950/50">
                <FieldLabel hint="Un plat appartenant à une case cochée compte comme boisson ou entrée dans le panier.">
                  Détection dans le panier
                </FieldLabel>
                <p className="mb-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Quelles catégories du menu comptent comme des {activeMeta.typePlural} ?
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
                      const checked = (categoriesByKind[activeKind] ?? []).includes(c.id);
                      return (
                        <label
                          key={`${activeKind}-${c.id}`}
                          className={`flex cursor-pointer select-none items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 ${
                            savingCategories ? "pointer-events-none opacity-60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const selectedCats = categoriesByKind[activeKind] ?? [];
                              const next = e.target.checked
                                ? [...selectedCats, c.id]
                                : selectedCats.filter((id) => id !== c.id);
                              saveKindCategories.mutate({ kind: activeKind, categoryIds: next });
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
                <FieldLabel hint="L’ordre d’affichage suit les lignes ci‑dessous ; glissez ⋮⋮ pour le modifier.">
                  Plats proposés au client
                </FieldLabel>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Décochez « Proposer » pour masquer un plat sans le retirer de la liste.
                </p>

                <SuggestionsList
                  label={activeMeta.label}
                  kindSuggestions={suggestions.filter((s) => s.kind === activeKind)}
                  mutations={{
                    patchSuggestion,
                    removeSuggestion,
                    reorderSuggestions,
                  }}
                />

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                  <AddProductSelect
                    kind={activeKind}
                    label={activeMeta.label}
                    suggestions={suggestions}
                    allProducts={allProducts}
                    catsList={catsList}
                    categoryNameById={categoryNameById}
                    selectionValue={newProductByKind[activeKind]}
                    onSelectionChange={(v) => setNewProductByKind((prev) => ({ ...prev, [activeKind]: v }))}
                  />
                  <button
                    type="button"
                    disabled={!newProductByKind[activeKind] || addSuggestion.isPending}
                    onClick={() => {
                      const v = newProductByKind[activeKind];
                      if (!v) return;
                      addSuggestion.mutate({ kind: activeKind, productId: v });
                      setNewProductByKind((prev) => ({ ...prev, [activeKind]: "" }));
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
        ) : null}
      </section>

      {config.isError ? (
        <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
          {config.error instanceof Error ? config.error.message : "Erreur de chargement"}
        </p>
      ) : null}
      {saveKindCategories.isError || addSuggestion.isError || patchSuggestion.isError || removeSuggestion.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Une sauvegarde a échoué. Vérifiez votre connexion et réessayez.
        </p>
      ) : null}
      {reorderSuggestions.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Impossible d’enregistrer l’ordre des plats.
        </p>
      ) : null}
    </div>
  );
}

function AddProductSelect({
  kind,
  label,
  suggestions,
  allProducts,
  catsList,
  categoryNameById,
  selectionValue,
  onSelectionChange,
}: {
  kind: UpsellKind;
  label: string;
  suggestions: UpsellSuggestionWithProduct[];
  allProducts: { id: string; name: string; category_id: string; position: number }[];
  catsList: { id: string; name: string }[];
  categoryNameById: Map<string, string>;
  selectionValue: string;
  onSelectionChange: (v: string) => void;
}) {
  const kindSuggestions = suggestions.filter((s) => s.kind === kind);
  const availableToAdd = allProducts.filter((p) => !kindSuggestions.some((s) => s.product.id === p.id));
  const availableByCategory = groupAvailableByCategory(availableToAdd);

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={`upsell-add-${kind}`} className="sr-only">
        Plat à ajouter pour la relance {label}
      </label>
      <select
        id={`upsell-add-${kind}`}
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
            <optgroup key={`${kind}-og-${c.id}`} label={c.name}>
              {list.map((p) => (
                <option key={`${kind}-new-${p.id}`} value={p.id}>
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
                <option key={`${kind}-new-${p.id}`} value={p.id}>
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
    () => [...kindSuggestions].sort((a, b) => a.position - b.position || a.product.name.localeCompare(b.product.name, "fr")),
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
          Choisissez un plat dans le menu ci‑dessous pour l’ajouter à cette relance.
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
          onClick={() => {
            if (confirm(`Retirer « ${s.product.name} » de cette relance ?`)) removeSuggestion.mutate(s.id);
          }}
          className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Retirer
        </button>
      </div>
    </li>
  );
}
