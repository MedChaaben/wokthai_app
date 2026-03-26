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

  if (categories.isLoading) return <p className="text-stone-600">Chargement…</p>;
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
          <h1 className="text-2xl font-extrabold text-stone-900">Catégories</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Glissez-déposez les lignes pour définir l’ordre des onglets dans l’app mobile (haut → premier onglet).
            Les positions sont enregistrées automatiquement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="shrink-0 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700"
        >
          Nouvelle catégorie
        </button>
      </div>

      <h2 className="mt-8 text-lg font-bold text-stone-900">Menu</h2>

      {reorderMut.isError ? (
        <p className="mt-4 text-sm text-red-600">
          {reorderMut.error instanceof Error ? reorderMut.error.message : "Erreur de réordonnancement"}
        </p>
      ) : null}

      {list.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
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
              <label className="text-sm font-semibold text-stone-700">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={createMut.isPending}
                className="rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              >
                Ajouter
              </button>
              <button
                type="button"
                disabled={createMut.isPending}
                onClick={cancelCreateForm}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
          {createMut.isError ? (
            <p className="text-sm text-red-600">
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
      className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:gap-3"
    >
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 cursor-grab items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-500 touch-none hover:bg-stone-100 active:cursor-grabbing"
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
        className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2"
      />
      <button
        type="button"
        disabled={save.isPending || name.trim() === category.name}
        onClick={() => save.mutate()}
        className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
      >
        Enregistrer le nom
      </button>
    </div>
  );
}
