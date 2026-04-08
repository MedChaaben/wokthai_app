"use client";

import { UpsellSuggestionsSection } from "@/components/UpsellSuggestionsSection";

export default function ProductsRelancesPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Relances panier</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-zinc-400">
        Suggestion boisson ou entrée avant validation si le panier n’en contient pas encore.
      </p>
      <div className="mt-6 rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-5">
        <UpsellSuggestionsSection />
      </div>
    </div>
  );
}
