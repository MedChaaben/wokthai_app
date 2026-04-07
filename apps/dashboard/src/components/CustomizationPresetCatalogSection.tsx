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
    if (list.length === 0) {
      setSelectedId("");
      return;
    }
    if (!selectedId || !list.some((p) => p.id === selectedId)) {
      setSelectedId(list[0].id);
    }
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600 dark:text-zinc-400">
        Définissez ici les blocs réutilisables (ex. groupe <span className="font-medium">Spicy</span> avec les valeurs{' '}
        <span className="font-medium">medium</span>, <span className="font-medium">very spicy</span>), puis importez-les
        sur chaque produit depuis <span className="font-medium">Modifier → Préréglages</span>.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[14rem] flex-1">
          <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Préréglage à éditer</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 dark:border-zinc-700 bg-white px-3 py-2 text-sm dark:bg-zinc-950"
            disabled={presets.isLoading || (presets.data?.length ?? 0) === 0}
          >
            {(presets.data ?? []).length === 0 ? (
              <option value="">Aucun préréglage</option>
            ) : null}
            {(presets.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[12rem] flex-1 flex-col sm:max-w-xs">
          <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Nouveau préréglage vide</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ex. Spicy"
            className="mt-1 rounded-lg border border-stone-300 dark:border-zinc-700 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={createEmpty.isPending || !newName.trim()}
          onClick={() => createEmpty.mutate()}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-stone-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          {createEmpty.isPending ? "Création…" : "Créer"}
        </button>
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
        <p className="text-sm italic text-stone-500 dark:text-zinc-500">
          Créez un préréglage vide ci-dessus, puis ajoutez les groupes et valeurs.
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

  const groups = tree.data ?? [];

  return (
    <div className="rounded-xl border border-stone-200/90 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Nom du préréglage</label>
          <input
            key={`preset-title-${presetId}-${presetName}`}
            defaultValue={presetName}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== presetName) renamePreset.mutate(v);
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 dark:border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
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
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
        >
          {deleteWholePreset.isPending ? "…" : "Supprimer du catalogue"}
        </button>
      </div>
      {deleteWholePreset.isError ? (
        <p className="mb-2 text-sm text-red-600 dark:text-red-400">
          {deleteWholePreset.error instanceof Error ? deleteWholePreset.error.message : "Erreur"}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-sm italic text-stone-600 dark:text-zinc-500">
          Aucun groupe. Ajoutez un bloc (ex. « Spicy »), puis des valeurs (ex. « medium », « very spicy »).
        </p>
      ) : (
        <ul className="space-y-4">
          {groups.map((g) => (
            <li
              key={g.id}
              className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/50"
            >
              <PresetGroupBlock group={g} onChanged={invalidateTree} supabase={supabase} />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={addGroup.isPending}
        onClick={() => addGroup.mutate()}
        className="mt-4 rounded-xl border border-dashed border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-stone-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        {addGroup.isPending ? "Ajout…" : "+ Ajouter un groupe (ex. Spicy)"}
      </button>
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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Libellé du groupe</label>
            <input
              defaultValue={g.name}
              key={`${g.id}-name-${g.name}`}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== g.name) patchGroup.mutate({ name: v });
              }}
              className="mt-1 w-full rounded-lg border border-stone-300 dark:border-zinc-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              <input
                key={`${g.id}-req-${g.required}`}
                type="checkbox"
                defaultChecked={g.required}
                onChange={(e) => patchGroup.mutate({ required: e.target.checked })}
              />
              Obligatoire à la commande
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
                className="mt-1 w-20 rounded-lg border border-stone-300 dark:border-zinc-700 px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-600 dark:text-zinc-400">Ordre</label>
              <input
                type="number"
                defaultValue={g.position}
                key={`${g.id}-pos-${g.position}`}
                onBlur={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isFinite(n)) return;
                  if (n !== g.position) patchGroup.mutate({ position: n });
                }}
                className="mt-1 w-20 rounded-lg border border-stone-300 dark:border-zinc-700 px-2 py-2 text-sm"
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
          Supprimer le groupe
        </button>
      </div>

      <p className="text-xs text-stone-500 dark:text-zinc-500">Valeurs (ex. medium, very spicy)</p>
      <ul className="space-y-2">
        {opts.map((o) => (
          <PresetOptionRow key={o.id} option={o} onChanged={onChanged} />
        ))}
      </ul>
      <button
        type="button"
        disabled={addOption.isPending}
        onClick={() => addOption.mutate()}
        className="text-sm font-semibold text-wt-bordeaux hover:underline dark:text-wt-accent"
      >
        + Ajouter une valeur
      </button>
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
    <li className="flex flex-wrap items-end gap-2 rounded-lg bg-stone-50/90 px-3 py-2 dark:bg-zinc-900/60">
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <label className="sr-only">Libellé</label>
        <input
          defaultValue={o.name}
          key={`${o.id}-n-${o.name}`}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== o.name) patch.mutate({ name: v });
          }}
          className="w-full rounded-lg border border-stone-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold uppercase text-stone-500 dark:text-zinc-500">
          <input
            type="checkbox"
            key={`${o.id}-c-${isChargeable}`}
            defaultChecked={isChargeable}
            onChange={(e) => patch.mutate({ is_chargeable: e.target.checked })}
          />
          Payant
        </label>
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase text-stone-500 dark:text-zinc-500">Supplément TND</label>
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
          className="mt-0.5 w-24 rounded-lg border border-stone-300 dark:border-zinc-700 px-2 py-1.5 text-sm disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold uppercase text-stone-500 dark:text-zinc-500">Ordre</label>
        <input
          type="number"
          defaultValue={o.position}
          key={`${o.id}-pos-${o.position}`}
          onBlur={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isFinite(n)) return;
            if (n !== o.position) patch.mutate({ position: n });
          }}
          className="mt-0.5 w-16 rounded-lg border border-stone-300 dark:border-zinc-700 px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="button"
        disabled={del.isPending}
        onClick={() => {
          if (confirm("Supprimer cette valeur ?")) del.mutate();
        }}
        className="mb-0.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400"
      >
        Retirer
      </button>
    </li>
  );
}
