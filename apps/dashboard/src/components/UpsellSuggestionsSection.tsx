"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "@wokthai/shared";

const KINDS: { kind: UpsellKind; label: string }[] = [
  { kind: "drink", label: "Boisson" },
  { kind: "starter", label: "Entrée" },
];

export function UpsellSuggestionsSection() {
  const supabase = useSupabase();
  const qc = useQueryClient();
  const categories = useCategories();
  const products = useProducts({ onlyAvailable: false });
  const config = useUpsellConfig();
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

  const categoriesByKind = config.data?.categoriesByKind ?? { drink: [], starter: [] };
  const suggestions = config.data?.suggestions ?? [];
  const allProducts = products.data ?? [];

  const productById = useMemo(() => {
    const map = new Map<string, (typeof allProducts)[number]>();
    for (const p of allProducts) map.set(p.id, p);
    return map;
  }, [allProducts]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600 dark:text-zinc-400">
        Propose automatiquement une boisson / entrée juste avant la validation de commande si le panier n’en contient
        pas. L’app affiche une seule relance par état du panier pour éviter le spam.
      </p>

      {KINDS.map(({ kind, label }) => {
        const selectedCats = categoriesByKind[kind] ?? [];
        const kindSuggestions = suggestions.filter((s) => s.kind === kind);
        const availableToAdd = allProducts.filter((p) => !kindSuggestions.some((s) => s.product.id === p.id));
        const selectionValue = newProductByKind[kind];

        return (
          <section key={kind} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/50">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{label}</h3>

            <div className="mt-3">
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-zinc-500">
                Catégories considérées comme {label.toLowerCase()}
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {(categories.data ?? []).map((c) => {
                  const checked = selectedCats.includes(c.id);
                  return (
                    <label key={`${kind}-${c.id}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...selectedCats, c.id]
                            : selectedCats.filter((id) => id !== c.id);
                          saveKindCategories.mutate({ kind, categoryIds: next });
                        }}
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase text-stone-500 dark:text-zinc-500">
                Produits proposés en relance
              </p>
              {kindSuggestions.length === 0 ? (
                <p className="mt-2 text-sm italic text-stone-500 dark:text-zinc-500">Aucune suggestion configurée.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {kindSuggestions.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-zinc-900/60">
                      <span className="min-w-0 flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                        {s.product.name} {!s.product.is_available ? "(indisponible)" : ""}
                      </span>
                      <label className="flex items-center gap-1 text-xs">
                        Actif
                        <input
                          type="checkbox"
                          checked={s.is_active}
                          onChange={(e) => patchSuggestion.mutate({ id: s.id, patch: { is_active: e.target.checked } })}
                        />
                      </label>
                      <input
                        type="number"
                        defaultValue={s.position}
                        onBlur={(e) => {
                          const n = parseInt(e.target.value, 10);
                          if (!Number.isFinite(n) || n === s.position) return;
                          patchSuggestion.mutate({ id: s.id, patch: { position: n } });
                        }}
                        className="w-16 rounded border border-stone-300 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => removeSuggestion.mutate(s.id)}
                        className="text-xs font-semibold text-red-600 dark:text-red-400"
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={selectionValue}
                onChange={(e) => setNewProductByKind((prev) => ({ ...prev, [kind]: e.target.value }))}
                className="min-w-[14rem] rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Ajouter un produit…</option>
                {availableToAdd.map((p) => (
                  <option key={`${kind}-new-${p.id}`} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectionValue || addSuggestion.isPending}
                onClick={() => {
                  if (!selectionValue) return;
                  addSuggestion.mutate({ kind, productId: selectionValue });
                  setNewProductByKind((prev) => ({ ...prev, [kind]: "" }));
                }}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold dark:border-zinc-700 disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </section>
        );
      })}

      {config.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {config.error instanceof Error ? config.error.message : "Erreur de chargement"}
        </p>
      ) : null}
      {saveKindCategories.isError || addSuggestion.isError || patchSuggestion.isError || removeSuggestion.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">Erreur de sauvegarde des règles upsell.</p>
      ) : null}
    </div>
  );
}
