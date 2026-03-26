"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useCategories,
  useSupabase,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@wokthai/shared";
import type { CategoryRow } from "@wokthai/shared";
import { Modal } from "../../../components/Modal";

export default function CategoriesPage() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const categories = useCategories();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const list = categories.data ?? [];
    const oldIndex = list.findIndex((c) => c.id === active.id);
    const newIndex = list.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(list, oldIndex, newIndex);
    reorderMut.mutate(reordered.map((c) => c.id));
  }

  if (categories.isLoading) return <p className="text-stone-600 dark:text-zinc-400">Chargement…</p>;
  if (categories.error) return <p className="text-red-600">{categories.error.message}</p>;

  const list = categories.data ?? [];
  const ids = list.map((c) => c.id);

  function cancelCreateForm() {
    setShowCreateForm(false);
    setName("");
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Catégories</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600 dark:text-zinc-400">
            Glissez-déposez les lignes pour définir l’ordre des onglets dans l’app mobile (haut → premier onglet).
            Les positions sont enregistrées automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="shrink-0 rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wt-bordeaux-hover"
        >
          Nouvelle catégorie
        </button>
      </div>

      <h2 className="mt-8 text-lg font-bold text-zinc-900 dark:text-zinc-100">Menu</h2>

      {reorderMut.isError ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {reorderMut.error instanceof Error ? reorderMut.error.message : "Erreur de réordonnancement"}
        </p>
      ) : null}

      {list.length === 0 ? (
        <p className="mt-6 wt-dashed-empty text-stone-600 dark:text-zinc-500">
          Aucune catégorie pour le moment. Cliquez sur <span className="font-semibold">Nouvelle catégorie</span> pour en
          ajouter une.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="mt-6 space-y-2">
              {list.map((c) => (
                <SortableCategoryRow
                  key={c.id}
                  category={c}
                  disabled={reorderMut.isPending}
                  onDelete={() => {
                    if (confirm("Supprimer cette catégorie ? Les produits liés seront supprimés (CASCADE).")) {
                      deleteMut.mutate(c.id);
                    }
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Modal open={showCreateForm} onClose={cancelCreateForm} title="Nouvelle catégorie">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMut.mutate();
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="min-w-0 flex-1">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={createMut.isPending}
                className="rounded-xl bg-wt-bordeaux px-4 py-2 font-semibold text-white hover:bg-wt-bordeaux-hover disabled:opacity-50"
              >
                Ajouter
              </button>
              <button
                type="button"
                disabled={createMut.isPending}
                onClick={cancelCreateForm}
                className="rounded-xl border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-950 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
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
  disabled,
  onDelete,
}: {
  category: CategoryRow;
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
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="wt-card flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-3"
    >
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-600 touch-none hover:bg-stone-100 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:hover:bg-zinc-900"
        {...attributes}
        {...listeners}
        aria-label="Réordonner la catégorie"
      >
        <span className="text-lg leading-none" aria-hidden>
          ⋮⋮
        </span>
      </button>
      <CategoryRowEditor category={category} />
      <button
        type="button"
        onClick={onDelete}
        className="shrink-0 self-start text-sm font-semibold text-red-600 md:self-center"
      >
        Supprimer
      </button>
    </li>
  );
}

function CategoryRowEditor({ category }: { category: CategoryRow }) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const [name, setName] = useState(category.name);

  useEffect(() => {
    setName(category.name);
  }, [category.id, category.name]);

  const save = useMutation({
    mutationFn: () => updateCategory(supabase, category.id, { name: name.trim() }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-0 flex-1 rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2"
      />
      <button
        type="button"
        disabled={save.isPending || name.trim() === category.name}
        onClick={() => save.mutate()}
        className="rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-950 disabled:opacity-40"
      >
        Enregistrer le nom
      </button>
    </div>
  );
}
