"use client";

import { CustomizationPresetCatalogSection } from "@/components/CustomizationPresetCatalogSection";

export default function ProductsPrereglagesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-wt-bordeaux dark:text-wt-accent">
        Catalogue
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Préréglages</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        Créez des modèles d’options une fois, puis importez-les sur vos plats. Flux en deux étapes, sans jargon inutile.
      </p>
      <div className="mt-8">
        <CustomizationPresetCatalogSection />
      </div>
    </div>
  );
}
