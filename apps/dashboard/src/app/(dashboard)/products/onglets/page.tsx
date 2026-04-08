"use client";

import { CategoryMenuManager } from "@/components/CategoryMenuManager";

export default function ProductsOngletsPage() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Catégories du menu</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-zinc-400">
        Ordre et libellés des catégories dans l’application mobile (la grille des plats reste sous{" "}
        <span className="font-medium">Produits</span>).
      </p>
      <div className="mt-6 rounded-2xl border border-stone-200/90 bg-stone-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-5">
        <CategoryMenuManager />
      </div>
    </div>
  );
}
