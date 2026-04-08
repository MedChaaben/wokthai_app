"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ancres #menu-tabs, #upsell-suggestions, #presets-catalog → nouvelles routes. */
export function ProductsLegacyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    const map: Record<string, string> = {
      menu: "/products",
      "menu-tabs": "/products/onglets",
      upsell: "/products/relances",
      "upsell-suggestions": "/products/relances",
      presets: "/products/prereglages",
      "presets-catalog": "/products/prereglages",
    };
    const target = map[hash];
    if (target) {
      router.replace(target + window.location.search);
    }
  }, [router]);

  return null;
}
