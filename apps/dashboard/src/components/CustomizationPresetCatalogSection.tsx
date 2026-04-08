"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
    <div className="space-y-4">
      <p className="text-sm text-stone-600 dark:text-zinc-400">
        Un modèle regroupe des blocs d’options ; vous l’importez sur un plat via <span className="font-medium text-zinc-800 dark:text-zinc-200">Modifier → Préréglages</span>.
      </p>

      <div className="rounded-lg border border-stone-100 bg-stone-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quel modèle éditer ?</p>

        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor="preset-catalog-select" className="text-xs font-semibold text-stone-600 dark:text-zinc-400">
              Modèle existant
            </label>
            <select
              id="preset-catalog-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              disabled={presets.isLoading || presetList.length === 0}
            >
              {presetList.length === 0 ? <option value="">Aucun préréglage pour le moment</option> : null}
              {presetList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-stone-200/80 pt-4 dark:border-zinc-800">
            <p className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Créer un modèle vide</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="preset-new-name" className="sr-only">
                  Nom du nouveau préréglage
                </label>
                <input
                  id="preset-new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nom du modèle"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
              <button
                type="button"
                disabled={createEmpty.isPending || !newName.trim()}
                onClick={() => createEmpty.mutate()}
                className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-stone-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                {createEmpty.isPending ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {createEmpty.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {createEmpty.error instanceof Error ? createEmpty.error.message : "Erreur"}
        </p>
      ) : null}

      {selectedId ? (
        <CustomizationPresetEditor
          presetId={selectedId}
          presetName={selectedName}
          onPresetDeleted={() => setSelectedId("")}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-stone-300 bg-white/60 px-4 py-6 text-center text-sm text-stone-600 dark:border-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-400">
          Aucun modèle — créez-en un avec le champ ci-dessus.
        </p>
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

  if (tree.isLoading) {
    return <p className="text-sm text-stone-600 dark:text-zinc-500">Chargement…</p>;
  }
  if (tree.error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {tree.error instanceof Error ? tree.error.message : "Erreur"}
      </p>
    );
  }

  const groups = [...(tree.data ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Contenu du modèle « {presetName} »</p>
      <p className="text-sm text-stone-600 dark:text-zinc-400">
        Ajoutez des blocs (ex. piquant), puis les choix dans chaque bloc.
      </p>

      <div className="rounded-xl border border-stone-200/90 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
        <div className="flex flex-col gap-3 border-b border-stone-100 pb-4 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <label htmlFor={`preset-rename-${presetId}`} className="text-xs font-semibold text-stone-600 dark:text-zinc-400">
              Renommer
            </label>
            <input
              id={`preset-rename-${presetId}`}
              key={`preset-title-${presetId}-${presetName}`}
              defaultValue={presetName}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== presetName) renamePreset.mutate(v);
              }}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
            />
          </div>
          <button
            type="button"
            disabled={deleteWholePreset.isPending}
            onClick={() => {
              if (
                confirm(
                  "Supprimer ce préréglage du catalogue ? Les plats qui l’ont déjà importé ne sont pas modifiés."
                )
              ) {
                deleteWholePreset.mutate();
              }
            }}
            className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
          >
            {deleteWholePreset.isPending ? "…" : "Supprimer"}
          </button>
        </div>
        {deleteWholePreset.isError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {deleteWholePreset.error instanceof Error ? deleteWholePreset.error.message : "Erreur"}
          </p>
        ) : null}

        {groups.length === 0 ? (
          <p className="mt-4 text-sm text-stone-600 dark:text-zinc-500">Ajoutez un premier bloc d’options ci-dessous.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {groups.map((g, idx) => (
              <li
                key={g.id}
                className="rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40"
              >
                <p className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Bloc {idx + 1}
                  <span className="ml-2 text-xs font-normal text-stone-500 dark:text-zinc-500">(ordre {g.position})</span>
                </p>
                <PresetGroupBlock group={g} onChanged={invalidateTree} supabase={supabase} />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={addGroup.isPending}
          onClick={() => addGroup.mutate()}
          className="mt-4 w-full rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-stone-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50 sm:w-auto"
        >
          {addGroup.isPending ? "Ajout…" : "+ Nouveau bloc"}
        </button>
      </div>
    </div>
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

  const opts = g.customization_preset_options;
  const sortedOpts = [...opts].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Réglages du bloc</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Libellé du groupe</label>
              <input
                defaultValue={g.name}
                key={`${g.id}-name-${g.name}`}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== g.name) patchGroup.mutate({ name: v });
                }}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-zinc-700"
              />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex cursor-pointer items-center gap-2 pb-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                <input
                  key={`${g.id}-req-${g.required}`}
                  type="checkbox"
                  defaultChecked={g.required}
                  onChange={(e) => patchGroup.mutate({ required: e.target.checked })}
                  className="rounded border-stone-300 text-wt-bordeaux dark:border-zinc-600"
                />
                Obligatoire
              </label>
              <div>
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Choix max</label>
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
                  className="mt-1 w-20 rounded-lg border border-stone-300 px-2 py-2 text-sm tabular-nums dark:border-zinc-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Ordre (groupes)</label>
                <input
                  type="number"
                  defaultValue={g.position}
                  key={`${g.id}-pos-${g.position}`}
                  onBlur={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isFinite(n)) return;
                    if (n !== g.position) patchGroup.mutate({ position: n });
                  }}
                  className="mt-1 w-20 rounded-lg border border-stone-300 px-2 py-2 text-sm tabular-nums dark:border-zinc-700"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={removeGroup.isPending}
            onClick={() => {
              if (confirm("Supprimer ce groupe et toutes ses valeurs du préréglage ?")) removeGroup.mutate();
            }}
            className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:text-red-400"
          >
            Supprimer ce bloc
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-stone-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Choix pour le client</p>

        {sortedOpts.length > 0 ? (
          <div
            className="mt-3 hidden gap-2 border-b border-stone-200 pb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:border-zinc-800 dark:text-zinc-500 sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_5.5rem_4rem_auto]"
            aria-hidden
          >
            <span>Libellé</span>
            <span className="text-center">Payant</span>
            <span>Suppl. TND</span>
            <span>Ordre</span>
            <span />
          </div>
        ) : null}

        <ul className="mt-2 space-y-2">
          {sortedOpts.map((o) => (
            <PresetOptionRow key={o.id} option={o} onChanged={onChanged} />
          ))}
        </ul>
        <button
          type="button"
          disabled={addOption.isPending}
          onClick={() => addOption.mutate()}
          className="mt-3 rounded-lg border border-dashed border-stone-300 px-3 py-2 text-sm font-semibold text-wt-bordeaux hover:bg-stone-50 dark:border-zinc-600 dark:text-wt-accent dark:hover:bg-zinc-900 disabled:opacity-50"
        >
          {addOption.isPending ? "Ajout…" : "+ Ajouter une valeur"}
        </button>
      </div>
    </div>
  );
}

function PresetOptionRow({
  option: o,
  onChanged,
}: {
  option: { id: string; name: string; is_chargeable: boolean; price_modifier: string | number; position: number };
  onChanged: () => void;
}) {
  const supabase = useSupabase();
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

  const isChargeable = o.is_chargeable;
  const priceStr = Number(o.price_modifier).toFixed(2);

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-stone-50/90 px-3 py-2 dark:bg-zinc-900/60 sm:grid sm:grid-cols-[minmax(0,1fr)_5rem_5.5rem_4rem_auto] sm:items-end sm:gap-x-2">
      <div className="min-w-0 sm:col-span-1">
        <label className="text-[10px] font-semibold uppercase text-stone-500 dark:text-zinc-500 sm:sr-only">
          Libellé
        </label>
        <input
          defaultValue={o.name}
          key={`${o.id}-n-${o.name}`}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== o.name) patch.mutate({ name: v });
          }}
          className="mt-0.5 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm dark:border-zinc-700"
        />
      </div>
      <div className="flex items-center gap-2 sm:justify-center sm:pt-1">
        <label className="text-[10px] font-semibold uppercase text-stone-500 dark:text-zinc-500 sm:sr-only">
          Payant
        </label>
        <input
          type="checkbox"
          key={`${o.id}-c-${isChargeable}`}
          defaultChecked={isChargeable}
          onChange={(e) => patch.mutate({ is_chargeable: e.target.checked })}
          className="rounded border-stone-300 text-wt-bordeaux dark:border-zinc-600"
          aria-label="Option payante"
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase text-stone-500 dark:text-zinc-500 sm:sr-only">
          Supplément TND
        </label>
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
          className="mt-0.5 w-full max-w-[6.5rem] rounded-lg border border-stone-300 px-2 py-1.5 text-sm tabular-nums disabled:opacity-50 dark:border-zinc-700"
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase text-stone-500 dark:text-zinc-500 sm:sr-only">Ordre</label>
        <input
          type="number"
          defaultValue={o.position}
          key={`${o.id}-pos-${o.position}`}
          onBlur={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isFinite(n)) return;
            if (n !== o.position) patch.mutate({ position: n });
          }}
          className="mt-0.5 w-full max-w-[4.5rem] rounded-lg border border-stone-300 px-2 py-1.5 text-sm tabular-nums dark:border-zinc-700"
        />
      </div>
      <div className="flex justify-end sm:justify-start">
        <button
          type="button"
          disabled={del.isPending}
          onClick={() => {
            if (confirm("Supprimer cette valeur ?")) del.mutate();
          }}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400"
        >
          Retirer
        </button>
      </div>
    </li>
  );
}
