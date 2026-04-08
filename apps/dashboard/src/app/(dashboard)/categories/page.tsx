"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ancienne route : tout le paramétrage des catégories vit désormais sous Produits. */
export default function CategoriesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/products/onglets");
  }, [router]);
  return <p className="text-stone-600 dark:text-zinc-400">Redirection vers Produits…</p>;
}
