"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmModal } from "./ConfirmModal";
import {
  useProductOptionGroups,
  useCustomizationPresets,
  useSupabase,
  insertProductOptionGroup,
  insertProductOption,
  updateProductOptionGroup,
  updateProductOption,
  deleteProductOptionGroup,
  deleteProductOption,
  importCustomizationPresetToProduct,
  type ImportPresetMode,
} from "@wokthai/shared";

type ProductOptionsEditorProps = {
  productId: string;
};

export function ProductOptionsEditor({ productId }: ProductOptionsEditorProps) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const tree = useProductOptionGroups(productId);
  const presets = useCustomizationPresets();
  const [importPresetId, setImportPresetId] = useState("");
  const [importMode, setImportMode] = useState<ImportPresetMode>("append");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["product-option-groups", productId] });
    void qc.invalidateQueries({ queryKey: ["product-ids-required-options"] });
  };

  const importPreset = useMutation({
    mutationFn: async () => {
      if (!importPresetId) throw new Error("Choisissez un préréglage");
      await importCustomizationPresetToProduct(supabase, productId, importPresetId, importMode);
    },
    onSuccess: invalidate,
  });

  const addGroup = useMutation({
    mutationFn: async () => {
      const pos =
        (tree.data?.reduce((m, g) => Math.max(m, g.position), -1) ?? -1) + 1;
      await insertProductOptionGroup(supabase, {
        product_id: productId,
        name: "Nouvelle personnalisation",
        required: false,
        max_select: 1,
        position: pos,
      });
    },
    onSuccess: invalidate,
  });

  if (tree.isLoading) {
    return (
      <p className="text-sm text-stone-600 dark:text-zinc-500">Chargement des personnalisations…</p>
    );
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
    <div className="mt-6 border-t border-stone-200 pt-5 dark:border-zinc-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">
        Personnalisations
      </p>
      <p className="mt-1 text-xs text-stone-600 dark:text-zinc-500">
        Préréglage = copie depuis la <span className="font-medium">bibliothèque</span> (haut de page). Sinon, personnalisation
        uniquement pour ce plat. <span className="font-medium">1 choix max</span> = un seul niveau (ex. piquant) ; plusieurs =
        combinaisons possibles.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[10rem] flex-1 sm:max-w-xs">
          <label className="sr-only">Préréglage</label>
          <select
            value={importPresetId}
            onChange={(e) => setImportPresetId(e.target.value)}
            className="w-full rounded-lg border border-stone-300 dark:border-zinc-700 bg-white px-3 py-2 text-sm dark:bg-zinc-950"
            disabled={presets.isLoading || (presets.data?.length ?? 0) === 0}
            aria-label="Préréglage à importer"
          >
            <option value="">— Préréglage —</option>
            {(presets.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[11rem]">
          <label className="sr-only">Mode d’import</label>
          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value as ImportPresetMode)}
            className="w-full rounded-lg border border-stone-300 dark:border-zinc-700 bg-white px-3 py-2 text-sm dark:bg-zinc-950"
            aria-label="Mode d’import"
          >
            <option value="append">Ajouter aux existantes</option>
            <option value="replace">Remplacer tout</option>
          </select>
        </div>
        <button
          type="button"
          disabled={importPreset.isPending || !importPresetId}
          onClick={() => importPreset.mutate()}
          className="rounded-lg bg-wt-bordeaux px-4 py-2 text-sm font-semibold text-white hover:bg-wt-bordeaux-hover disabled:opacity-50"
        >
          {importPreset.isPending ? "…" : "Ajouter"}
        </button>
        <button
          type="button"
          disabled={addGroup.isPending}
          onClick={() => addGroup.mutate()}
          className="rounded-lg border border-dashed border-stone-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-stone-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          {addGroup.isPending ? "…" : "+ Personnalisation"}
        </button>
      </div>
      {importPreset.isError ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {importPreset.error instanceof Error ? importPreset.error.message : "Erreur"}
        </p>
      ) : null}
      {(presets.data?.length ?? 0) === 0 && !presets.isLoading ? (
        <p className="mt-2 text-xs text-stone-500 dark:text-zinc-500">
          Bibliothèque vide — créez des préréglages plus haut sur la page, ou utilisez « + Personnalisation ».
        </p>
      ) : null}

      {groups.length > 0 ? (
        <ul className="mt-4 space-y-4">
          {groups.map((g) => (
            <li
              key={g.id}
              className="rounded-xl border border-stone-200/90 bg-stone-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40"
            >
              <GroupBlock
                productId={productId}
                group={g}
                onChanged={invalidate}
                supabase={supabase}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {addGroup.isError ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {addGroup.error instanceof Error ? addGroup.error.message : "Erreur"}
        </p>
      ) : null}
    </div>
  );
}

function GroupBlock({
  productId,
  group: g,
  onChanged,
  supabase,
}: {
  productId: string;
  group: NonNullable<ReturnType<typeof useProductOptionGroups>["data"]>[number];
  onChanged: () => void;
  supabase: ReturnType<typeof useSupabase>;
}) {
  const patchGroup = useMutation({
    mutationFn: async (patch: Parameters<typeof updateProductOptionGroup>[2]) => {
      await updateProductOptionGroup(supabase, g.id, patch);
    },
    onSuccess: onChanged,
  });

  const removeGroup = useMutation({
    mutationFn: async () => {
      await deleteProductOptionGroup(supabase, g.id);
    },
    onSuccess: onChanged,
  });

  const addOption = useMutation({
    mutationFn: async () => {
      const pos = g.product_options.reduce((m, o) => Math.max(m, o.position), -1) + 1;
      await insertProductOption(supabase, {
        group_id: g.id,
        name: "Nouvelle valeur",
        is_chargeable: true,
        price_modifier: 0,
        position: pos,
      });
    },
    onSuccess: onChanged,
  });

  const [removeGroupModalOpen, setRemoveGroupModalOpen] = useState(false);

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
              className="mt-1 w-full rounded-lg border border-stone-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
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
          onClick={() => setRemoveGroupModalOpen(true)}
          className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-900/50 dark:text-red-400"
        >
          Supprimer le groupe
        </button>
      </div>

      <p className="text-xs text-stone-500 dark:text-zinc-500">Valeurs proposées au client</p>
      <ul className="space-y-2">
        {g.product_options.map((o) => (
          <OptionRow key={o.id} option={o} productId={productId} onChanged={onChanged} />
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
      {patchGroup.isError ? (
        <p className="text-xs text-red-600 dark:text-red-400">
          {patchGroup.error instanceof Error ? patchGroup.error.message : "Erreur"}
        </p>
      ) : null}
      <ConfirmModal
        open={removeGroupModalOpen}
        onClose={() => setRemoveGroupModalOpen(false)}
        title="Supprimer ce groupe ?"
        description="Toutes les valeurs proposées au client dans ce groupe seront supprimées."
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

function OptionRow({
  option: o,
  productId,
  onChanged,
}: {
  option: { id: string; name: string; is_chargeable: boolean; price_modifier: string | number; position: number };
  productId: string;
  onChanged: () => void;
}) {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const patch = useMutation({
    mutationFn: async (p: Parameters<typeof updateProductOption>[2]) => {
      await updateProductOption(supabase, o.id, p);
    },
    onSuccess: () => {
      onChanged();
      void qc.invalidateQueries({ queryKey: ["product-option-groups", productId] });
    },
  });

  const del = useMutation({
    mutationFn: async () => {
      await deleteProductOption(supabase, o.id);
    },
    onSuccess: onChanged,
  });

  const [removeOptionModalOpen, setRemoveOptionModalOpen] = useState(false);

  const isChargeable = o.is_chargeable;
  const priceStr = Number(o.price_modifier).toFixed(2);

  return (
    <li className="flex flex-wrap items-end gap-2 rounded-lg bg-white/80 px-3 py-2 dark:bg-zinc-950/50">
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
        onClick={() => setRemoveOptionModalOpen(true)}
        className="mb-0.5 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400"
      >
        Retirer
      </button>
      <ConfirmModal
        open={removeOptionModalOpen}
        onClose={() => setRemoveOptionModalOpen(false)}
        title="Supprimer cette valeur ?"
        description={
          <>
            Retirer <span className="font-semibold text-zinc-800 dark:text-zinc-200">{o.name}</span> des choix proposés pour ce plat.
          </>
        }
        confirmLabel="Supprimer"
        onConfirm={() => {
          del.mutate();
          setRemoveOptionModalOpen(false);
        }}
        isPending={del.isPending}
      />
    </li>
  );
}
