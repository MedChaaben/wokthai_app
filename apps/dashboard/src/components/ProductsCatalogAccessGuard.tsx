"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStaffProfile } from "@wokthai/shared";

/** Réservé au siège (platform_admin) : catégories, relances, préréglages. */
const PLATFORM_ONLY_PREFIXES = ["/products/onglets", "/products/relances", "/products/prereglages"] as const;

export function ProductsCatalogAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const staff = useStaffProfile();
  const isPlatformAdmin = staff.data?.role === "platform_admin";

  const blockedForStore =
    Boolean(staff.data) &&
    !isPlatformAdmin &&
    PLATFORM_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (staff.isLoading || !staff.data) return;
    if (isPlatformAdmin) return;
    const blocked = PLATFORM_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (blocked) router.replace("/products");
  }, [staff.isLoading, staff.data, isPlatformAdmin, pathname, router]);

  if (staff.isLoading && PLATFORM_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return (
      <p className="text-stone-600 dark:text-zinc-400" role="status">
        Chargement…
      </p>
    );
  }

  if (blockedForStore) {
    return (
      <p className="text-stone-600 dark:text-zinc-400" role="status">
        Redirection…
      </p>
    );
  }

  return <>{children}</>;
}
