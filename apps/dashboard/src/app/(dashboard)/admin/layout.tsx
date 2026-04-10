"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaffProfile } from "@wokthai/shared";

const adminNav = [
  { href: "/admin", label: "Vue d’ensemble" },
  { href: "/admin/restaurant", label: "Vue resto (business)" },
  { href: "/admin/orders", label: "Toutes les commandes" },
  { href: "/admin/announcements", label: "Annonces" },
  { href: "/admin/stores", label: "Points de vente" },
  { href: "/admin/staff", label: "Équipe & accès" },
] as const;

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  const staff = useStaffProfile();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (staff.isLoading) return;
    if (!staff.data || staff.data.role !== "platform_admin") {
      router.replace("/orders");
    }
  }, [staff.isLoading, staff.data, router]);

  if (staff.isLoading || !staff.data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-stone-600 dark:text-zinc-400">
        Vérification des droits…
      </div>
    );
  }

  if (staff.data.role !== "platform_admin") {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="border-b border-stone-200 pb-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-wt-bordeaux dark:text-wt-accent">Administration</p>
        <h1 className="mt-1 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">Siège · multi-restaurants</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-zinc-400">
          Gestion des points de vente, accès équipe et vision globale des commandes. Le menu latéral propose « Produits » (catalogue global) et
          cette section Administration ; un restaurant sur le profil siège est optionnel (libellé d’affichage).
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Sous-navigation admin">
          {adminNav.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(`${item.href}`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-wt-bordeaux text-white shadow-sm"
                    : "bg-stone-100 text-zinc-700 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="py-8">{children}</div>
    </div>
  );
}
