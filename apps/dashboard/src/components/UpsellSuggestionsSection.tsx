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

const KINDS: { kind: UpsellKind; label: string; hint: string; typePlural: string }[] = [
  {
    kind: "drink",
    label: "Boisson",
    hint: "Relance si le panier ne contient pas encore de boisson.",
    typePlural: "boissons",
  },
  {
    kind: "starter",
    label: "Entrée",
    hint: "Relance si le panier ne contient pas encore d’entrée.",
    typePlural: "entrées",
  },
];

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

  const categoriesByKind = config.data?.categoriesByKind ?? { drink: [], starter: [] };
  const suggestions = config.data?.suggestions ?? [];
  const allProducts = products.data ?? [];

  const catsList = categories.data ?? [];
  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories.data ?? []) m.set(c.id, c.name);
    return m;
  }, [categories.data]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600 dark:text-zinc-400">
        Avant paiement, l’app propose une fois la liste des produits ci‑dessous si le panier n’a pas encore de boisson ou
        d’entrée — selon la catégorie choisie (boisson ou entrée).
      </p>

      <div
        className="flex max-w-md gap-0.5 rounded-xl border border-stone-200/90 bg-stone-100/80 p-1 dark:border-zinc-700 dark:bg-zinc-900/50"
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
              className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
                selected
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-stone-200/90 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600"
                  : "text-stone-600 hover:bg-white/60 dark:text-zinc-400 dark:hover:bg-zinc-800/80"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {(() => {
        const meta = KINDS.find((k) => k.kind === activeKind);
        if (!meta) return null;
        const { kind, label, typePlural } = meta;
        const selectedCats = categoriesByKind[kind] ?? [];
        const kindSuggestions = suggestions.filter((s) => s.kind === kind);
        const availableToAdd = allProducts.filter((p) => !kindSuggestions.some((s) => s.product.id === p.id));
        const selectionValue = newProductByKind[kind];
        const availableByCategory = groupAvailableByCategory(availableToAdd);

        return (
          <section
            key={kind}
            id={`upsell-panel-${kind}`}
            role="tabpanel"
            aria-labelledby={`upsell-tab-${kind}`}
            className="rounded-xl border border-stone-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950/50"
          >
            <h3 className="sr-only">Relance {label}</h3>

            <div className="space-y-4">
              <div className="rounded-lg border border-stone-100 bg-stone-50/90 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quelles catégories comptent comme des {typePlural} ?</p>
                <p className="mt-1 text-sm text-stone-600 dark:text-zinc-400">Cochez les catégories du menu concernées.</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {catsList.map((c) => {
                    const checked = selectedCats.includes(c.id);
                    return (
                      <label key={`${kind}-${c.id}`} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...selectedCats, c.id]
                              : selectedCats.filter((id) => id !== c.id);
                            saveKindCategories.mutate({ kind, categoryIds: next });
                          }}
                          className="rounded border-stone-300 text-wt-bordeaux focus:ring-wt-bordeaux dark:border-zinc-600"
                        />
                        <span className="text-zinc-800 dark:text-zinc-200">{c.name}</span>
                      </label>
                    );
                  })}
                </div>
                {catsList.length === 0 ? (
                  <p className="mt-2 text-sm italic text-stone-500">Créez d’abord des catégories dans le menu.</p>
                ) : null}
              </div>

              <div className="rounded-lg border border-stone-100 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/30">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quels plats proposer ?</p>
                <p className="mt-1 text-xs text-stone-500 dark:text-zinc-500">
                  Ordre = priorité (plus petit en premier). Décochez « Actif » pour masquer sans supprimer.
                </p>

                {kindSuggestions.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500 dark:text-zinc-500">
                    Liste vide — choisissez un plat dans le menu ci-dessous.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {kindSuggestions.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 dark:bg-zinc-900/60"
                      >
                        <span className="min-w-0 flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                          {s.product.name}
                          {!s.product.is_available ? (
                            <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(indisponible)</span>
                          ) : null}
                        </span>
                        <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <span>Actif</span>
                          <input
                            type="checkbox"
                            checked={s.is_active}
                            onChange={(e) =>
                              patchSuggestion.mutate({ id: s.id, patch: { is_active: e.target.checked } })
                            }
                            className="rounded border-stone-300 text-wt-bordeaux dark:border-zinc-600"
                          />
                        </label>
                        <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-zinc-500">
                          <span className="whitespace-nowrap">Ordre</span>
                          <input
                            type="number"
                            defaultValue={s.position}
                            onBlur={(e) => {
                              const n = parseInt(e.target.value, 10);
                              if (!Number.isFinite(n) || n === s.position) return;
                              patchSuggestion.mutate({ id: s.id, patch: { position: n } });
                            }}
                            className="w-16 rounded border border-stone-300 px-2 py-1 text-sm tabular-nums dark:border-zinc-700"
                            aria-label={`Ordre pour ${s.product.name}`}
                          />
                        </span>
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

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <select
                    value={selectionValue}
                    onChange={(e) => setNewProductByKind((prev) => ({ ...prev, [kind]: e.target.value }))}
                    className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:min-w-[16rem]"
                    aria-label={`Ajouter un produit pour la relance ${label}`}
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
                  <button
                    type="button"
                    disabled={!selectionValue || addSuggestion.isPending}
                    onClick={() => {
                      if (!selectionValue) return;
                      addSuggestion.mutate({ kind, productId: selectionValue });
                      setNewProductByKind((prev) => ({ ...prev, [kind]: "" }));
                    }}
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Ajouter à la liste
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

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
