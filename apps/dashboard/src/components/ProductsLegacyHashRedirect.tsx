"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStaffProfile } from "@wokthai/shared";

/** Ancres #menu-tabs, #upsell-suggestions, #presets-catalog → routes (siège uniquement pour le catalogue avancé). */
export function ProductsLegacyHashRedirect() {
  const router = useRouter();
  const staff = useStaffProfile();
  const isPlatformAdmin = staff.data?.role === "platform_admin";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (staff.isLoading) return;

    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;

    const map: Record<string, string> = {
      menu: "/products",
      "menu-tabs": "/products/onglets",
      upsell: "/products/relances",
      "upsell-suggestions": "/products/relances",
      presets: "/products/prereglages",
      "presets-catalog": "/products/prereglages",
    };
    let target = map[hash];
    if (!target) return;

    if (
      !isPlatformAdmin &&
      target !== "/products" &&
      (target.startsWith("/products/onglets") ||
        target.startsWith("/products/relances") ||
        target.startsWith("/products/prereglages"))
    ) {
      target = "/products";
    }

    router.replace(target + window.location.search);
  }, [router, staff.isLoading, isPlatformAdmin]);

  return null;
}
