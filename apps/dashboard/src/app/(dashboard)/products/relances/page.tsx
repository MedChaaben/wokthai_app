"use client";

import { UpsellSuggestionsSection } from "@/components/UpsellSuggestionsSection";

export default function ProductsRelancesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wt-bordeaux dark:text-wt-accent">
        Catalogue
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Relances panier</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Encouragez une boisson ou une entrée au bon moment : une proposition claire, une seule fois, avant le paiement.
      </p>
      <div className="mt-8">
        <UpsellSuggestionsSection />
      </div>
    </div>
  );
}
