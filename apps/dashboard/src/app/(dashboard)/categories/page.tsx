"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStaffProfile } from "@wokthai/shared";

/** Ancienne route : les catégories se gèrent sous Produits (siège uniquement). */
export default function CategoriesRedirectPage() {
  const router = useRouter();
  const staff = useStaffProfile();

  useEffect(() => {
    if (staff.isLoading) return;
    const target = staff.data?.role === "platform_admin" ? "/products/onglets" : "/products";
    router.replace(target);
  }, [router, staff.isLoading, staff.data]);

  return <p className="text-stone-600 dark:text-zinc-400">Redirection…</p>;
}
