"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import {
  createCategory,
  deleteCategory,
  updateCategory,
  useCategories,
  useProducts,
  useSupabase,
} from "@wokthai/shared";
import type { CategoryRow } from "@wokthai/shared";
import { Modal } from "./Modal";

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

function IconTrash() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
    </svg>
  );
}

type CategoryMenuManagerProps = {
  /** Réduit les marges quand le bloc est imbriqué dans une autre page */
  className?: string;
};

export function CategoryMenuManager({ className = "" }: CategoryMenuManagerProps) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const categories = useCategories();
  const products = useProducts({ onlyAvailable: false });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const productCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products.data ?? []) {
      map.set(p.category_id, (map.get(p.category_id) ?? 0) + 1);
    }
    return map;
  }, [products.data]);

  const createMut = useMutation({
    mutationFn: async () => {
      const list = (qc.getQueryData(["categories"]) as CategoryRow[] | undefined) ?? [];
      const nextPos = list.length === 0 ? 0 : Math.max(...list.map((c) => c.position)) + 1;
      return createCategory(supabase, {
        name: name.trim(),
        position: nextPos,
      });
    },
    onSuccess: () => {
      setName("");
      setShowCreateForm(false);
      void qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const reorderMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) => updateCategory(supabase, id, { position: index }))
      );
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(supabase, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = categories.data ?? [];
    const oldIndex = list.findIndex((c) => c.id === active.id);
    const newIndex = list.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    reorderMut.mutate(reordered.map((c) => c.id));
  }

  function cancelCreateForm() {
    setShowCreateForm(false);
    setName("");
  }

  if (categories.isLoading) {
    return (
      <div className={`mx-auto max-w-3xl space-y-4 ${className}`}>
        <div className="wt-panel p-6">
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-zinc-400">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent"
              aria-hidden
            />
            Chargement des catégories…
          </div>
        </div>
      </div>
    );
  }

  if (categories.error) {
    return (
      <div className={`mx-auto max-w-3xl ${className}`}>
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
        >
          <IconAlert />
          <div>
            <p className="font-semibold">Impossible de charger les catégories</p>
            <p className="mt-1 text-sm opacity-90">{categories.error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const list = categories.data ?? [];
  const ids = list.map((c) => c.id);
  const activeCategory = activeDragId ? list.find((c) => c.id === activeDragId) : undefined;

  return (
    <div className={`mx-auto max-w-3xl space-y-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-600 dark:text-zinc-500">
          Glisser-déposer pour l’ordre des onglets dans l’app mobile. Le nom est éditable sur chaque ligne.
        </p>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wt-bordeaux-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wt-bordeaux"
        >
          <IconPlus />
          Nouvelle catégorie
        </button>
      </div>

      <section className="wt-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Ordre du menu</h2>
            <span className="wt-inset rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
              {list.length} {list.length === 1 ? "catégorie" : "catégories"}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-500">
            {list.length > 0 ? (
              <>
                <span className="hidden sm:inline">Faites glisser les lignes pour réordonner.</span>
                <span className="sm:hidden">Glisser pour réordonner.</span>
              </>
            ) : null}
          </p>
        </div>

        {reorderMut.isError ? (
          <div
            role="alert"
            className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200"
          >
            <IconAlert />
            <span>
              {reorderMut.error instanceof Error ? reorderMut.error.message : "Erreur lors de l’enregistrement de l’ordre."}
            </span>
          </div>
        ) : null}

        {reorderMut.isPending ? (
          <div className="flex items-center gap-2 border-b border-zinc-100 bg-wt-bordeaux-muted/40 px-5 py-2 text-xs font-medium text-wt-bordeaux dark:border-zinc-800 dark:bg-wt-bordeaux-muted/20 dark:text-zinc-300">
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-400 dark:border-t-transparent"
              aria-hidden
            />
            Enregistrement de l’ordre…
          </div>
        ) : null}

        {list.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
              <IconLayers />
            </div>
            <h3 className="mt-5 text-lg font-bold text-zinc-900 dark:text-zinc-100">Aucune catégorie pour le moment</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-stone-600 dark:text-zinc-400">
              Créez une catégorie pour structurer votre menu dans l’app (ex. Entrées, Plats, Boissons).
            </p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-wt-bordeaux px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wt-bordeaux-hover"
            >
              <IconPlus />
              Créer une catégorie
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/90">
                {list.map((c, index) => (
                  <SortableCategoryRow
                    key={c.id}
                    category={c}
                    index={index}
                    productCount={productCountByCategory.get(c.id) ?? 0}
                    disabled={reorderMut.isPending}
                    onDelete={() => {
                      if (
                        confirm(
                          "Supprimer cette catégorie ? Les produits associés seront définitivement supprimés (effet en cascade)."
                        )
                      ) {
                        deleteMut.mutate(c.id);
                      }
                    }}
                  />
                ))}
              </ul>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeCategory ? (
                <div className="wt-card flex cursor-grabbing items-center gap-3 p-4 shadow-lg ring-2 ring-wt-bordeaux/25 dark:ring-wt-bordeaux/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wt-bordeaux-muted text-sm font-bold text-wt-bordeaux dark:bg-wt-bordeaux-muted/50">
                    {list.findIndex((x) => x.id === activeCategory.id) + 1}
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeCategory.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      <Modal open={showCreateForm} onClose={cancelCreateForm} title="Nouvelle catégorie">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMut.mutate();
          }}
        >
          <div>
            <label htmlFor="new-category-name" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Nom affiché
            </label>
            <input
              id="new-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Entrées, Plats, Desserts…"
              autoFocus
              className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base shadow-sm transition focus:border-wt-bordeaux focus:outline-none focus:ring-2 focus:ring-wt-bordeaux/25 dark:border-zinc-700"
            />
            <p className="mt-2 text-xs text-stone-500 dark:text-zinc-500">
              Ce nom apparaît comme libellé d’onglet dans l’application mobile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={createMut.isPending || !name.trim()}
              className="rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wt-bordeaux-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMut.isPending ? "Création…" : "Créer la catégorie"}
            </button>
            <button
              type="button"
              disabled={createMut.isPending}
              onClick={cancelCreateForm}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-stone-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-950"
            >
              Annuler
            </button>
          </div>
          {createMut.isError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {createMut.error instanceof Error ? createMut.error.message : "Erreur"}
            </p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}

function SortableCategoryRow({
  category,
  index,
  productCount,
  disabled,
  onDelete,
}: {
  category: CategoryRow;
  index: number;
  productCount: number;
  disabled?: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const positionLabel = index + 1;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-stretch sm:gap-0 ${
        isDragging ? "bg-wt-bordeaux-muted/30 dark:bg-wt-bordeaux-muted/10" : "hover:bg-zinc-50/80 dark:hover:bg-zinc-950/50"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-sm font-bold tabular-nums text-stone-700 dark:bg-zinc-800 dark:text-zinc-200"
          title={`Position ${positionLabel} dans le menu`}
        >
          {positionLabel}
        </span>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          {...attributes}
          {...listeners}
          aria-label={`Réordonner : ${category.name}`}
        >
          <IconGrip />
        </button>
        <div className="min-w-0 flex-1">
          <CategoryRowEditor category={category} productCount={productCount} />
        </div>
      </div>
      <div className="flex shrink-0 justify-end sm:items-center sm:pl-3">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/55 dark:text-red-300 dark:hover:bg-red-950/40"
          title="Supprimer la catégorie"
        >
          <IconTrash />
          <span className="hidden sm:inline">Supprimer</span>
        </button>
      </div>
    </li>
  );
}

function CategoryRowEditor({ category, productCount }: { category: CategoryRow; productCount: number }) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const [name, setName] = useState(category.name);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    // Reprend le libellé serveur après invalidation (ex. autre onglet).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation avec les données distantes
    setName(category.name);
  }, [category.id, category.name]);

  const save = useMutation({
    mutationFn: () => updateCategory(supabase, category.id, { name: name.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["categories"] });
      setShowSaved(true);
      window.setTimeout(() => setShowSaved(false), 2200);
    },
  });

  const dirty = name.trim() !== category.name;

  const productLabel =
    productCount === 0
      ? "Aucun produit"
      : productCount === 1
        ? "1 produit"
        : `${productCount} produits`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-stone-500 dark:text-zinc-500">{productLabel}</span>
        {showSaved && !dirty ? (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Enregistré</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setShowSaved(false);
          }}
          aria-label={`Nom de la catégorie ${category.name}`}
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-base shadow-sm transition focus:border-wt-bordeaux focus:outline-none focus:ring-2 focus:ring-wt-bordeaux/20 dark:border-zinc-700"
        />
        <button
          type="button"
          disabled={save.isPending || !dirty || !name.trim()}
          onClick={() => save.mutate()}
          className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {save.isPending ? "…" : "Enregistrer"}
        </button>
      </div>
      {save.isError ? (
        <p className="text-xs text-red-600 dark:text-red-400">
          {save.error instanceof Error ? save.error.message : "Erreur d’enregistrement"}
        </p>
      ) : null}
    </div>
  );
}
