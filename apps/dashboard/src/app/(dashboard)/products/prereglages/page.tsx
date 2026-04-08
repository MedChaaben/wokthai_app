"use client";

import { CustomizationPresetCatalogSection } from "@/components/CustomizationPresetCatalogSection";

export default function ProductsPrereglagesPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Préréglages</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-zinc-400">
        Modèles d’options réutilisables (groupes + choix), importables sur chaque fiche produit via{" "}
        <span className="font-medium">Modifier → Préréglages</span>.
      </p>
      <div className="mt-6 rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-5">
        <CustomizationPresetCatalogSection />
      </div>
    </div>
  );
}
