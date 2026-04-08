"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/products", label: "Plats", active: (p: string) => p === "/products" },
  { href: "/products/onglets", label: "Catégories", active: (p: string) => p.startsWith("/products/onglets") },
  { href: "/products/relances", label: "Relances", active: (p: string) => p.startsWith("/products/relances") },
  { href: "/products/prereglages", label: "Préréglages", active: (p: string) => p.startsWith("/products/prereglages") },
] as const;

export function ProductsSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-stone-200/90 pb-4 dark:border-zinc-800"
      aria-label="Sections catalogue"
    >
      {LINKS.map(({ href, label, active }) => {
        const isActive = active(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-wt-bordeaux-muted text-wt-bordeaux ring-1 ring-wt-bordeaux/30 dark:bg-wt-bordeaux/25 dark:text-white dark:ring-wt-bordeaux/50"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
