"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchAllStores, useSupabase } from "@wokthai/shared";

type PlatformAdminCommandesNavProps = {
  pendingOrdersCount: number;
  onNavigate: () => void;
};

export function PlatformAdminCommandesNav({ pendingOrdersCount, onNavigate }: PlatformAdminCommandesNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useSupabase();

  const storesQuery = useQuery({
    queryKey: ["admin", "stores", "all"],
    queryFn: () => fetchAllStores(supabase),
    staleTime: 60_000,
  });

  const storeParam = searchParams.get("store")?.trim() ?? "";
  const onOrdersPage = pathname === "/admin/orders";
  const mainActive = onOrdersPage && storeParam === "";
  const stores = storesQuery.data ?? [];

  const linkActive =
    "bg-wt-bordeaux-muted text-wt-bordeaux dark:bg-wt-bordeaux/25 dark:text-wt-white";
  const linkIdle =
    "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <div>
      <p className="px-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-500">
        Commandes
      </p>
      <ul
        className="mt-1.5 flex flex-col gap-0.5 border-l border-stone-200/90 pl-2 ml-3 dark:border-zinc-700"
        role="list"
      >
        <li>
          <Link
            href="/admin/orders"
            onClick={() => onNavigate()}
            aria-label={
              pendingOrdersCount > 0
                ? `Toutes les commandes (tous les points de vente), ${pendingOrdersCount} commande${pendingOrdersCount > 1 ? "s" : ""} en attente`
                : "Toutes les commandes (tous les points de vente)"
            }
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${mainActive ? linkActive : linkIdle}`}
            aria-current={mainActive ? "page" : undefined}
          >
            <span className="min-w-0 flex-1">Toutes les commandes</span>
            {pendingOrdersCount > 0 ? (
              <span className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wt-bordeaux px-1.5 text-[10px] font-bold leading-none text-white tabular-nums">
                {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
              </span>
            ) : null}
          </Link>
        </li>
        {stores.map((st) => {
          const active = onOrdersPage && storeParam === st.id;
          const label = st.city ? `${st.name} · ${st.city}` : st.name;
          return (
            <li key={st.id}>
              <Link
                href={`/admin/orders?store=${encodeURIComponent(st.id)}`}
                onClick={() => onNavigate()}
                title={label}
                className={`block truncate rounded-lg px-3 py-1.5 text-sm font-medium ${active ? linkActive : linkIdle}`}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Fallback sans lecture des search params (évite la suspension du layout). */
export function PlatformAdminCommandesNavFallback({
  pendingOrdersCount,
  onNavigate,
}: PlatformAdminCommandesNavProps) {
  const linkIdle =
    "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <div>
      <p className="px-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-500">
        Commandes
      </p>
      <ul
        className="mt-1.5 flex flex-col gap-0.5 border-l border-stone-200/90 pl-2 ml-3 dark:border-zinc-700"
        role="list"
      >
        <li>
          <Link
            href="/admin/orders"
            onClick={() => onNavigate()}
            aria-label={
              pendingOrdersCount > 0
                ? `Toutes les commandes (tous les points de vente), ${pendingOrdersCount} commande${pendingOrdersCount > 1 ? "s" : ""} en attente`
                : "Toutes les commandes (tous les points de vente)"
            }
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${linkIdle}`}
          >
            <span className="min-w-0 flex-1">Toutes les commandes</span>
            {pendingOrdersCount > 0 ? (
              <span className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wt-bordeaux px-1.5 text-[10px] font-bold leading-none text-white tabular-nums">
                {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
              </span>
            ) : null}
          </Link>
        </li>
      </ul>
    </div>
  );
}
