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
import { useEffect, useState, type ReactNode } from "react";
import type { CSSProperties } from "react";
import {
  useCustomizationPresets,
  useCustomizationPresetTree,
  useSupabase,
  createEmptyCustomizationPreset,
  deleteCustomizationPreset,
  updateCustomizationPreset,
  insertCustomizationPresetGroup,
  updateCustomizationPresetGroup,
  deleteCustomizationPresetGroup,
  insertCustomizationPresetOption,
  updateCustomizationPresetOption,
  deleteCustomizationPresetOption,
  type CustomizationPresetGroupWithOptions,
} from "@wokthai/shared";
import { ConfirmModal } from "./ConfirmModal";

/** Champs — lisibilité, focus bordeaux discret */
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

function IconLayers() {
  return (
    <svg className="h-8 w-8 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinejoin="round" />
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

export function CustomizationPresetCatalogSection() {
  const presets = useCustomizationPresets();
  const supabase = useSupabase();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const list = presets.data ?? [];
    queueMicrotask(() => {
      if (list.length === 0) {
        setSelectedId("");
        return;
      }
      if (!selectedId || !list.some((p) => p.id === selectedId)) {
        setSelectedId(list[0].id);
      }
    });
  }, [presets.data, selectedId]);

  const createEmpty = useMutation({
    mutationFn: () => createEmptyCustomizationPreset(supabase, newName),
    onSuccess: (r) => {
      setNewName("");
      setSelectedId(r.presetId);
      void qc.invalidateQueries({ queryKey: ["customization-presets"] });
    },
  });

  const selectedName = (presets.data ?? []).find((p) => p.id === selectedId)?.name ?? "";

  const presetList = presets.data ?? [];

  return (
    <div className="space-y-8">
      <section className="wt-panel overflow-hidden p-5 sm:p-6">
        <StepBadge n={1} label="Choisir ou créer un modèle" />
        <p className="mb-5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Un modèle = une liste de blocs (ex. « Niveau de piquant »). Vous le réutilisez sur les fiches produit via{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Modifier → Préréglages</span>.
        </p>

        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-end">
          <div>
            <FieldLabel hint="Liste de vos modèles enregistrés.">Modèle à éditer</FieldLabel>
            <select
              id="preset-catalog-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={selectClass}
              disabled={presets.isLoading || presetList.length === 0}
              aria-label="Modèle à éditer"
            >
              {presetList.length === 0 ? <option value="">Aucun modèle pour le moment</option> : null}
              {presetList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/50 p-4 dark:border-zinc-700/80 dark:bg-zinc-950/40">
            <FieldLabel hint="Ex. « Menu wok », « Burgers ».">Nouveau modèle vide</FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <label htmlFor="preset-new-name" className="sr-only">
                Nom du nouveau modèle
              </label>
              <input
                id="preset-new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim() && !createEmpty.isPending) {
                    e.preventDefault();
                    createEmpty.mutate();
                  }
                }}
                placeholder="Nom du modèle"
                className={`${inputClass} sm:min-w-0 sm:flex-1`}
              />
              <button
                type="button"
                disabled={createEmpty.isPending || !newName.trim()}
                onClick={() => createEmpty.mutate()}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-wt-bordeaux px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-wt-bordeaux-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wt-bordeaux/50 disabled:cursor-not-allowed disabled:opacity-45 dark:focus-visible:outline-wt-accent/60"
              >
                <IconPlus />
                {createEmpty.isPending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>

        {createEmpty.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {createEmpty.error instanceof Error ? createEmpty.error.message : "Erreur"}
          </p>
        ) : null}
      </section>

      {selectedId ? (
        <CustomizationPresetEditor
          presetId={selectedId}
          presetName={selectedName}
          onPresetDeleted={() => setSelectedId("")}
        />
      ) : (
        <div className="wt-dashed-empty">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/80">
            <IconLayers />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">Aucun modèle pour l’instant</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            Donnez un nom au-dessus et cliquez sur <span className="font-medium text-zinc-700 dark:text-zinc-300">Créer</span> pour commencer.
          </p>
        </div>
      )}
    </div>
  );
}

function CustomizationPresetEditor({
  presetId,
  presetName,
  onPresetDeleted,
}: {
  presetId: string;
  presetName: string;
  onPresetDeleted: () => void;
}) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const tree = useCustomizationPresetTree(presetId);

  const invalidateTree = () => {
    void qc.invalidateQueries({ queryKey: ["customization-preset-tree", presetId] });
  };

  const invalidateList = () => {
    void qc.invalidateQueries({ queryKey: ["customization-presets"] });
  };

  const deleteWholePreset = useMutation({
    mutationFn: () => deleteCustomizationPreset(supabase, presetId),
    onSuccess: () => {
      invalidateList();
      void qc.invalidateQueries({ queryKey: ["customization-preset-tree"] });
      onPresetDeleted();
    },
  });

  const renamePreset = useMutation({
    mutationFn: (name: string) => updateCustomizationPreset(supabase, presetId, { name }),
    onSuccess: invalidateList,
  });

  const addGroup = useMutation({
    mutationFn: async () => {
      const pos =
        (tree.data?.reduce((m, g) => Math.max(m, g.position), -1) ?? -1) + 1;
      await insertCustomizationPresetGroup(supabase, {
        preset_id: presetId,
        name: "Nouveau groupe",
        required: false,
        max_select: 1,
        position: pos,
      });
    },
    onSuccess: invalidateTree,
  });

  const reorderGroupsMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) => updateCustomizationPresetGroup(supabase, id, { position: index }))
      );
    },
    onSuccess: invalidateTree,
  });

  const [activeDragGroupId, setActiveDragGroupId] = useState<string | null>(null);
  const [deletePresetModalOpen, setDeletePresetModalOpen] = useState(false);
  const groupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (tree.isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-5 py-8 dark:border-zinc-700 dark:bg-zinc-900/50">
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-500 dark:border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Chargement du modèle…</p>
      </div>
    );
  }
  if (tree.error) {
    return (
      <p className="rounded-xl border border-red-200/80 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
        {tree.error instanceof Error ? tree.error.message : "Erreur"}
      </p>
    );
  }

  const groups = [...(tree.data ?? [])].sort((a, b) => a.position - b.position);

  return (
    <section className="wt-panel overflow-hidden p-5 sm:p-6">
      <StepBadge n={2} label="Construire le modèle" />
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Chaque <span className="font-medium text-zinc-800 dark:text-zinc-200">bloc</span> pose une question au client ; à l’intérieur, ajoutez les{" "}
        <span className="font-medium text-zinc-800 dark:text-zinc-200">réponses possibles</span>. Déplacez blocs et réponses avec la poignée ⋮⋮.
      </p>

      <div className="rounded-2xl border border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/40 p-4 shadow-sm dark:border-zinc-700/80 dark:from-zinc-950 dark:to-zinc-950/80 sm:p-5">
        <div className="flex flex-col gap-4 border-b border-zinc-200/70 pb-5 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-lg">
            <FieldLabel hint="Nom interne du modèle (visible dans la liste et à l’import).">Nom du modèle</FieldLabel>
            <input
              id={`preset-rename-${presetId}`}
              key={`preset-title-${presetId}-${presetName}`}
              defaultValue={presetName}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== presetName) renamePreset.mutate(v);
              }}
              className={`${inputClass} text-base font-semibold sm:text-sm`}
            />
          </div>
          <button
            type="button"
            disabled={deleteWholePreset.isPending}
            onClick={() => setDeletePresetModalOpen(true)}
            className="shrink-0 rounded-xl border border-red-200/90 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/35 disabled:opacity-50"
          >
            {deleteWholePreset.isPending ? "…" : "Supprimer le modèle"}
          </button>
        </div>

        {deleteWholePreset.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {deleteWholePreset.error instanceof Error ? deleteWholePreset.error.message : "Erreur"}
          </p>
        ) : null}

        {reorderGroupsMut.isError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {reorderGroupsMut.error instanceof Error
              ? reorderGroupsMut.error.message
              : "Impossible d’enregistrer l’ordre des blocs."}
          </p>
        ) : null}
        {reorderGroupsMut.isPending ? (
          <p className="mt-4 flex items-center gap-2 text-xs font-medium text-wt-bordeaux dark:text-zinc-400">
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-400 dark:border-t-transparent"
              aria-hidden
            />
            Enregistrement de l’ordre des blocs…
          </p>
        ) : null}

        {groups.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-200/90 bg-white/60 px-4 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Premier bloc</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
              Ex. « Sauce », « Cuisson », « Suppléments » — puis ajoutez les choix du client.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={groupSensors}
            collisionDetection={closestCenter}
            onDragStart={(e: DragStartEvent) => setActiveDragGroupId(String(e.active.id))}
            onDragCancel={() => setActiveDragGroupId(null)}
            onDragEnd={(event: DragEndEvent) => {
              setActiveDragGroupId(null);
              const { active, over } = event;
              if (!over || active.id === over.id) return;
              const oldIndex = groups.findIndex((x) => x.id === active.id);
              const newIndex = groups.findIndex((x) => x.id === over.id);
              if (oldIndex === -1 || newIndex === -1) return;
              const reordered = arrayMove(groups, oldIndex, newIndex);
              reorderGroupsMut.mutate(reordered.map((x) => x.id));
            }}
          >
            <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <ul className="mt-5 space-y-5">
                {groups.map((g, idx) => (
                  <SortablePresetGroupRow
                    key={g.id}
                    group={g}
                    blockIndex={idx}
                    onChanged={invalidateTree}
                    supabase={supabase}
                    reorderDisabled={reorderGroupsMut.isPending}
                  />
                ))}
              </ul>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragGroupId ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl ring-2 ring-wt-bordeaux/20 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-wt-accent/25">
                  <p className="flex items-center gap-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    <span className={`${gripBtnClass} cursor-grabbing`}>
                      <IconGrip />
                    </span>
                    {groups.find((x) => x.id === activeDragGroupId)?.name ?? "Bloc"}
                  </p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        <button
          type="button"
          disabled={addGroup.isPending}
          onClick={() => addGroup.mutate()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-white/80 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-wt-bordeaux/35 hover:bg-wt-bordeaux-muted/30 hover:text-wt-bordeaux dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:border-wt-accent/40 dark:hover:bg-wt-bordeaux-muted/15 dark:hover:text-wt-accent sm:w-auto sm:px-6"
        >
          <IconPlus />
          {addGroup.isPending ? "Ajout…" : "Ajouter un bloc"}
        </button>
      </div>

      <ConfirmModal
        open={deletePresetModalOpen}
        onClose={() => setDeletePresetModalOpen(false)}
        title="Supprimer ce modèle du catalogue ?"
        description="Les plats qui l’ont déjà importé ne sont pas modifiés. Le modèle sera retiré de la bibliothèque."
        confirmLabel="Supprimer"
        onConfirm={() => {
          deleteWholePreset.mutate();
          setDeletePresetModalOpen(false);
        }}
        isPending={deleteWholePreset.isPending}
      />
    </section>
  );
}

function SortablePresetGroupRow({
  group,
  blockIndex,
  onChanged,
  supabase,
  reorderDisabled,
}: {
  group: CustomizationPresetGroupWithOptions;
  blockIndex: number;
  onChanged: () => void;
  supabase: ReturnType<typeof useSupabase>;
  reorderDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
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
      className="rounded-2xl border border-zinc-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] dark:border-zinc-700/85 dark:bg-zinc-900 dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.5)]"
    >
      <div className="border-l-4 border-l-wt-bordeaux/70 pl-4 pr-4 pb-4 pt-4 dark:border-l-wt-accent/60 sm:pl-5 sm:pr-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            title="Déplacer le bloc"
            className={gripBtnClass}
            {...attributes}
            {...listeners}
            aria-label={`Déplacer le bloc : ${group.name}`}
          >
            <IconGrip />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-zinc-100 px-2 text-xs font-bold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {blockIndex + 1}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">
                Bloc
              </span>
            </div>
            <p className="mt-1 truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">{group.name}</p>
          </div>
        </div>
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800/90">
          <PresetGroupBlock group={group} onChanged={onChanged} supabase={supabase} />
        </div>
      </div>
    </li>
  );
}

function PresetGroupBlock({
  group: g,
  onChanged,
  supabase,
}: {
  group: CustomizationPresetGroupWithOptions;
  onChanged: () => void;
  supabase: ReturnType<typeof useSupabase>;
}) {
  const patchGroup = useMutation({
    mutationFn: async (patch: Parameters<typeof updateCustomizationPresetGroup>[2]) => {
      await updateCustomizationPresetGroup(supabase, g.id, patch);
    },
    onSuccess: onChanged,
  });

  const removeGroup = useMutation({
    mutationFn: async () => {
      await deleteCustomizationPresetGroup(supabase, g.id);
    },
    onSuccess: onChanged,
  });

  const addOption = useMutation({
    mutationFn: async () => {
      const pos =
        g.customization_preset_options.reduce((m, o) => Math.max(m, o.position), -1) + 1;
      await insertCustomizationPresetOption(supabase, {
        preset_group_id: g.id,
        name: "Nouvelle valeur",
        is_chargeable: true,
        price_modifier: 0,
        position: pos,
      });
    },
    onSuccess: onChanged,
  });

  const reorderOptionsMut = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) => updateCustomizationPresetOption(supabase, id, { position: index }))
      );
    },
    onSuccess: onChanged,
  });

  const [activeDragOptionId, setActiveDragOptionId] = useState<string | null>(null);
  const [removeGroupModalOpen, setRemoveGroupModalOpen] = useState(false);
  const optionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const opts = g.customization_preset_options;
  const sortedOpts = [...opts].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-zinc-50/90 p-4 dark:bg-zinc-950/50">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">Question affichée au client</p>
        <div className="mt-3 space-y-4">
          <div>
            <FieldLabel hint="Ex. « Niveau de piquant », « Type de riz ».">Intitulé du bloc</FieldLabel>
            <input
              defaultValue={g.name}
              key={`${g.id}-name-${g.name}`}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== g.name) patchGroup.mutate({ name: v });
              }}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <label className="flex cursor-pointer select-none items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm transition hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600">
              <input
                key={`${g.id}-req-${g.required}`}
                type="checkbox"
                defaultChecked={g.required}
                onChange={(e) => patchGroup.mutate({ required: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300 text-wt-bordeaux focus:ring-wt-bordeaux/30 dark:border-zinc-600 dark:focus:ring-wt-accent/30"
              />
              <span>
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Réponse obligatoire</span>
                <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">Le client doit choisir avant de valider.</span>
              </span>
            </label>
            <div className="sm:w-36">
              <FieldLabel hint="1 = un seul choix, 2+ = plusieurs.">Choix maximum</FieldLabel>
              <input
                type="number"
                min={1}
                defaultValue={g.max_select}
                key={`${g.id}-max-${g.max_select}`}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isFinite(n) || n < 1) return;
                  if (n !== g.max_select) patchGroup.mutate({ max_select: n });
                }}
                className={`${inputClass} tabular-nums`}
              />
            </div>
            <button
              type="button"
              disabled={removeGroup.isPending}
              onClick={() => setRemoveGroupModalOpen(true)}
              className="rounded-xl border border-red-200/90 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/35"
            >
              Supprimer le bloc
            </button>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-zinc-500 dark:text-zinc-400">Réponses proposées</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Glissez ⋮⋮ pour l’ordre d’affichage dans l’app.</p>
          </div>
        </div>

        {reorderOptionsMut.isError ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {reorderOptionsMut.error instanceof Error
              ? reorderOptionsMut.error.message
              : "Impossible d’enregistrer l’ordre des valeurs."}
          </p>
        ) : null}
        {reorderOptionsMut.isPending ? (
          <p className="mb-3 flex items-center gap-2 text-xs font-medium text-wt-bordeaux dark:text-zinc-400">
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-wt-bordeaux border-t-transparent dark:border-zinc-400 dark:border-t-transparent"
              aria-hidden
            />
            Enregistrement de l’ordre…
          </p>
        ) : null}

        <DndContext
          sensors={optionSensors}
          collisionDetection={closestCenter}
          onDragStart={(e: DragStartEvent) => setActiveDragOptionId(String(e.active.id))}
          onDragCancel={() => setActiveDragOptionId(null)}
          onDragEnd={(event: DragEndEvent) => {
            setActiveDragOptionId(null);
            const { active, over } = event;
            if (!over || active.id === over.id) return;
            const oldIndex = sortedOpts.findIndex((x) => x.id === active.id);
            const newIndex = sortedOpts.findIndex((x) => x.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reordered = arrayMove(sortedOpts, oldIndex, newIndex);
            reorderOptionsMut.mutate(reordered.map((x) => x.id));
          }}
        >
          <SortableContext items={sortedOpts.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {sortedOpts.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-zinc-200/90 bg-zinc-50/50 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-400">
                  Aucune réponse — ajoutez-en une ci-dessous.
                </li>
              ) : null}
              {sortedOpts.map((o) => (
                <SortablePresetOptionRow
                  key={o.id}
                  option={o}
                  onChanged={onChanged}
                  reorderDisabled={reorderOptionsMut.isPending}
                />
              ))}
            </ul>
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeDragOptionId ? (
              <div className="flex cursor-grabbing items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-xl ring-2 ring-wt-bordeaux/20 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-wt-accent/25">
                <span className={`${gripBtnClass} cursor-grabbing`}>
                  <IconGrip />
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {sortedOpts.find((x) => x.id === activeDragOptionId)?.name ?? ""}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <button
          type="button"
          disabled={addOption.isPending}
          onClick={() => addOption.mutate()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white py-3 text-sm font-semibold text-wt-bordeaux transition hover:border-wt-bordeaux/40 hover:bg-wt-bordeaux-muted/40 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-wt-accent dark:hover:border-wt-accent/45 dark:hover:bg-wt-bordeaux-muted/10 sm:w-auto sm:px-5"
        >
          <IconPlus />
          {addOption.isPending ? "Ajout…" : "Ajouter une réponse"}
        </button>
      </div>

      <ConfirmModal
        open={removeGroupModalOpen}
        onClose={() => setRemoveGroupModalOpen(false)}
        title="Supprimer ce bloc ?"
        description="Toutes les réponses associées à ce bloc seront supprimées."
        confirmLabel="Supprimer"
        onConfirm={() => {
          removeGroup.mutate();
          setRemoveGroupModalOpen(false);
        }}
        isPending={removeGroup.isPending}
      />
    </div>
  );
}

function SortablePresetOptionRow({
  option: o,
  onChanged,
  reorderDisabled,
}: {
  option: { id: string; name: string; is_chargeable: boolean; price_modifier: string | number; position: number };
  onChanged: () => void;
  reorderDisabled: boolean;
}) {
  const supabase = useSupabase();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: o.id,
    disabled: reorderDisabled,
  });
  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const patch = useMutation({
    mutationFn: async (p: Parameters<typeof updateCustomizationPresetOption>[2]) => {
      await updateCustomizationPresetOption(supabase, o.id, p);
    },
    onSuccess: onChanged,
  });

  const del = useMutation({
    mutationFn: async () => {
      await deleteCustomizationPresetOption(supabase, o.id);
    },
    onSuccess: onChanged,
  });

  const [removeOptionModalOpen, setRemoveOptionModalOpen] = useState(false);

  const isChargeable = o.is_chargeable;
  const priceStr = Number(o.price_modifier).toFixed(2);

  return (
    <li
      ref={setNodeRef}
      style={sortableStyle}
      className="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:shadow-none"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:justify-center">
          <button
            type="button"
            title="Déplacer cette ligne"
            className={`${gripBtnClass} sm:mx-auto`}
            {...attributes}
            {...listeners}
            aria-label={`Déplacer la réponse : ${o.name}`}
          >
            <IconGrip />
          </button>
        </div>
        <div className="min-w-0 flex-1 space-y-3 sm:space-y-0">
          <div className="sm:grid sm:grid-cols-[minmax(0,1fr)_7.5rem_6.5rem_auto] sm:items-end sm:gap-3">
            <div>
              <FieldLabel>Texte affiché</FieldLabel>
              <input
                defaultValue={o.name}
                key={`${o.id}-n-${o.name}`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== o.name) patch.mutate({ name: v });
                }}
                className={inputClass}
              />
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950/50 sm:flex-col sm:items-start sm:py-3">
              <input
                type="checkbox"
                key={`${o.id}-c-${isChargeable}`}
                defaultChecked={isChargeable}
                onChange={(e) => patch.mutate({ is_chargeable: e.target.checked })}
                className="h-4 w-4 shrink-0 rounded border-zinc-300 text-wt-bordeaux focus:ring-wt-bordeaux/30 dark:border-zinc-600"
              />
              <span className="text-xs font-semibold leading-tight text-zinc-700 dark:text-zinc-200">Supplément payant</span>
            </label>
            <div>
              <FieldLabel hint={!isChargeable ? "Cochez « payant » pour saisir un montant." : undefined}>Montant TND</FieldLabel>
              <input
                type="number"
                step="0.01"
                defaultValue={priceStr}
                key={`${o.id}-p-${priceStr}`}
                disabled={!isChargeable}
                onBlur={(e) => {
                  const n = parseFloat(e.target.value);
                  if (!Number.isFinite(n)) return;
                  const cur = isChargeable ? Number(o.price_modifier) : 0;
                  if (n !== cur) patch.mutate({ price_modifier: n });
                }}
                className={`${inputClass} tabular-nums disabled:cursor-not-allowed disabled:opacity-45`}
              />
            </div>
            <div className="flex items-end justify-end sm:justify-start">
              <button
                type="button"
                disabled={del.isPending}
                onClick={() => setRemoveOptionModalOpen(true)}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={removeOptionModalOpen}
        onClose={() => setRemoveOptionModalOpen(false)}
        title="Retirer cette réponse ?"
        description={
          <>
            La réponse <span className="font-semibold text-zinc-800 dark:text-zinc-200">{o.name}</span> sera supprimée de ce bloc.
          </>
        }
        confirmLabel="Retirer"
        onConfirm={() => {
          del.mutate();
          setRemoveOptionModalOpen(false);
        }}
        isPending={del.isPending}
      />
    </li>
  );
}
