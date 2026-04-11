"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useOrders,
  useStaffProfile,
  useStoreOrdersRealtime,
  useSupabase,
  useAdminDashboardSummary,
  useAdminOrdersRealtime,
} from "@wokthai/shared";
import { ThemeToggle } from "@/components/ThemeToggle";

const storeStaffNav = [
  { href: "/orders", label: "Commandes" },
  { href: "/products", label: "Produits" },
  { href: "/settings", label: "Restaurant" },
] as const;

/** Sous-menu Produits (siège uniquement) : Plats + réglages catalogue. */
const platformAdminProductsSubLinks = [
  { href: "/products", label: "Plats", match: (p: string) => p === "/products" },
  { href: "/products/onglets", label: "Catégories", match: (p: string) => p === "/products/onglets" || p.startsWith("/products/onglets/") },
  { href: "/products/relances", label: "Relances", match: (p: string) => p === "/products/relances" || p.startsWith("/products/relances/") },
  {
    href: "/products/prereglages",
    label: "Préréglages",
    match: (p: string) => p === "/products/prereglages" || p.startsWith("/products/prereglages/"),
  },
] as const;

/** Sous-menu Administration (siège uniquement). « Toutes les commandes » est un lien racine dans la sidebar. */
const platformAdminSubLinks = [
  { href: "/admin", label: "Vue d’ensemble", match: (p: string) => p === "/admin" },
  {
    href: "/admin/restaurant",
    label: "Vue resto (business)",
    match: (p: string) => p === "/admin/restaurant" || p.startsWith("/admin/restaurant/"),
  },
  {
    href: "/admin/announcements",
    label: "Annonces",
    match: (p: string) => p === "/admin/announcements" || p.startsWith("/admin/announcements/"),
  },
  {
    href: "/admin/stores",
    label: "Points de vente",
    match: (p: string) => p === "/admin/stores" || p.startsWith("/admin/stores/"),
  },
  {
    href: "/admin/staff",
    label: "Équipe & accès",
    match: (p: string) => p === "/admin/staff" || p.startsWith("/admin/staff/"),
  },
] as const;

function formatQueryError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err != null && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const msg = o.message;
    if (typeof msg === "string" && msg.length > 0) {
      const details = o.details;
      const hint = o.hint;
      const code = o.code;
      const parts = [msg];
      if (typeof details === "string" && details.length > 0) parts.push(details);
      if (typeof hint === "string" && hint.length > 0) parts.push(`Astuce : ${hint}`);
      if (typeof code === "string" && code.length > 0) parts.push(`(code ${code})`);
      return parts.join(" — ");
    }
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function useIsMdUp() {
  const [isMd, setIsMd] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsMd(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isMd;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const staff = useStaffProfile();
  const storeId = staff.data?.store_id;
  const isPlatformAdmin = staff.data?.role === "platform_admin";
  const orders = useOrders({ mode: "staff", storeId, enabled: Boolean(storeId) && !isPlatformAdmin });
  const adminSummary = useAdminDashboardSummary(Boolean(isPlatformAdmin));
  useAdminOrdersRealtime(Boolean(isPlatformAdmin));

  const pendingOrdersCount = useMemo(() => {
    if (isPlatformAdmin && adminSummary.data) return adminSummary.data.pending_count;
    return (orders.data ?? []).filter((o) => o.status === "pending").length;
  }, [isPlatformAdmin, adminSummary.data, orders.data]);
  const [newOrderAlert, setNewOrderAlert] = useState<{ id: string } | null>(null);
  const alertOrderIdRef = useRef<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function clearOrderAlert() {
    alertOrderIdRef.current = null;
    setNewOrderAlert(null);
  }

  useStoreOrdersRealtime(storeId, {
    enabled: Boolean(storeId) && !isPlatformAdmin,
    onInsert: ({ id }) => {
      alertOrderIdRef.current = id;
      setNewOrderAlert({ id });
    },
    onUpdate: ({ id, status }) => {
      if (id === alertOrderIdRef.current && status === "confirmed") {
        clearOrderAlert();
      }
    },
  });
  const isMd = useIsMdUp();
  const mobileDrawerClosed = isMd === false && !mobileNavOpen;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (staff.isLoading || !isPlatformAdmin) return;
    const blockedStoreRoutes =
      pathname === "/orders" ||
      pathname === "/settings" ||
      pathname.startsWith("/settings/");
    if (blockedStoreRoutes) {
      router.replace("/admin");
    }
  }, [staff.isLoading, isPlatformAdmin, pathname, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!staff.authResolved || staff.hasSession) return;
    router.replace("/login");
  }, [staff.authResolved, staff.hasSession, router]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/login");
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (staff.isLoading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-stone-600 dark:text-zinc-400">
        Chargement du profil…
      </div>
    );
  }

  if (staff.isError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Erreur profil équipe</h1>
        <p className="mt-2 break-words text-stone-600 dark:text-zinc-400">{formatQueryError(staff.error)}</p>
        <button type="button" onClick={() => void staff.refetch()} className="mt-6 wt-btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  if (!staff.data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Accès refusé</h1>
        <p className="mt-2 text-stone-600 dark:text-zinc-400">
          Ce compte n’est pas lié à un profil <code className="rounded bg-stone-200 dark:bg-zinc-700 px-1">staff</code> en base.
          Ajoutez une ligne dans la table <code className="rounded bg-stone-200 dark:bg-zinc-700 px-1">staff</code> avec votre{" "}
          <code className="rounded bg-stone-200 dark:bg-zinc-700 px-1">user_id</code> Supabase.
        </p>
        <button type="button" onClick={() => void logout()} className="mt-6 wt-btn-primary">
          Déconnexion
        </button>
      </div>
    );
  }

  const navLinks = isPlatformAdmin ? (
    <nav className="mt-4 flex flex-col gap-3" aria-label="Navigation principale">
      <Link
        href="/admin/orders"
        onClick={() => setMobileNavOpen(false)}
        aria-label={
          pendingOrdersCount > 0
            ? `Toutes les commandes, ${pendingOrdersCount} commande${pendingOrdersCount > 1 ? "s" : ""} en attente`
            : undefined
        }
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
          pathname === "/admin/orders" || pathname.startsWith("/admin/orders/")
            ? "bg-wt-bordeaux-muted text-wt-bordeaux dark:bg-wt-bordeaux/25 dark:text-wt-white"
            : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <span className="min-w-0 flex-1">Toutes les commandes</span>
        {pendingOrdersCount > 0 ? (
          <span className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wt-bordeaux px-1.5 text-[10px] font-bold leading-none text-white tabular-nums">
            {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
          </span>
        ) : null}
      </Link>
      <div>
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-500">
          Produits
        </p>
        <ul
          className="mt-1.5 flex flex-col gap-0.5 border-l border-stone-200/90 pl-2 ml-3 dark:border-zinc-700"
          role="list"
        >
          {platformAdminProductsSubLinks.map(({ href, label, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`block rounded-lg px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-wt-bordeaux-muted text-wt-bordeaux dark:bg-wt-bordeaux/25 dark:text-wt-white"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-zinc-500">
          Administration
        </p>
        <ul
          className="mt-1.5 flex flex-col gap-0.5 border-l border-stone-200/90 pl-2 ml-3 dark:border-zinc-700"
          role="list"
        >
          {platformAdminSubLinks.map(({ href, label, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`block rounded-lg px-3 py-1.5 text-sm font-medium ${
                    active
                      ? "bg-wt-bordeaux-muted text-wt-bordeaux dark:bg-wt-bordeaux/25 dark:text-wt-white"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  ) : (
    <nav className="mt-4 flex flex-col gap-1" aria-label="Navigation principale">
      {storeStaffNav.map((item) => {
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === "/products" && pathname === "/categories");
        const showPendingBadge = false;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            aria-label={
              showPendingBadge
                ? `${item.label}, ${pendingOrdersCount} commande${pendingOrdersCount > 1 ? "s" : ""} en attente`
                : undefined
            }
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              active
                ? "bg-wt-bordeaux-muted text-wt-bordeaux dark:bg-wt-bordeaux/25 dark:text-wt-white"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            <span className="min-w-0 flex-1">{item.label}</span>
            {showPendingBadge ? (
              <span className="inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-wt-bordeaux px-1.5 text-[10px] font-bold leading-none text-white tabular-nums">
                {pendingOrdersCount > 99 ? "99+" : pendingOrdersCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-start justify-between gap-2 md:block">
        <Link
          href={isPlatformAdmin ? "/admin" : "/orders"}
          className="inline-block shrink-0"
          onClick={() => setMobileNavOpen(false)}
        >
          <span className="wt-logo-surface">
            <Image
              src="/wokthai-logo.png"
              alt="Wok Thaï"
              width={200}
              height={48}
              className="h-9 w-auto max-w-[200px]"
              priority
            />
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="rounded-lg p-2 text-stone-600 dark:text-zinc-400 hover:bg-stone-100 dark:hover:bg-zinc-800"
            aria-label="Fermer le menu"
            onClick={() => setMobileNavOpen(false)}
          >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        </div>
      </div>
      <p className="mt-4 px-3 text-sm text-stone-600 dark:text-zinc-400">
        {isPlatformAdmin
          ? storeId
            ? "Restaurant affiché (catalogue)"
            : ""
          : "Restaurant assigné (commandes filtrées)"}
      </p>
      <p className="px-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {staff.data.stores?.name ?? ""}
        {staff.data.stores?.city ? (
          <span className="block text-xs font-normal text-stone-600 dark:text-zinc-500">{staff.data.stores.city}</span>
        ) : null}
      </p>
      {navLinks}
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-600 dark:text-zinc-500 hover:bg-stone-100 dark:hover:bg-zinc-800"
      >
        Déconnexion
      </button>
      <div className="mt-auto hidden flex-col items-center gap-1 border-t border-zinc-200/80 pt-3 dark:border-zinc-800 md:flex">
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
          Thème
        </span>
        <ThemeToggle className="!h-8 !w-8 opacity-90" />
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden md:flex-row">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        id="dashboard-sidebar"
        inert={mobileDrawerClosed ? true : undefined}
        aria-hidden={mobileDrawerClosed ? true : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2rem,18rem)] max-w-[calc(100vw-2rem)] flex-col wt-sidebar p-4 shadow-lg transition-transform duration-200 ease-out md:static md:z-0 md:h-full md:w-56 md:max-w-none md:shrink-0 md:translate-x-0 md:shadow-none ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto md:min-h-0">{sidebarInner}</div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative sticky top-0 z-30 flex min-h-12 items-center justify-center wt-header-mobile px-3 py-2.5 md:hidden">
          <button
            type="button"
            className="absolute start-3 top-1/2 z-10 -translate-y-1/2 rounded-lg p-2 text-zinc-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800"
            aria-expanded={mobileNavOpen}
            aria-controls="dashboard-sidebar"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <Link
            href={isPlatformAdmin ? "/admin" : "/orders"}
            className="flex max-w-[min(100%,220px)] items-center justify-center"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="wt-logo-surface max-w-full">
              <Image
                src="/wokthai-logo.png"
                alt="Wok Thaï"
                width={180}
                height={44}
                className="h-8 w-auto max-w-full"
                priority
              />
            </span>
          </Link>
          <div className="absolute end-3 top-1/2 z-10 -translate-y-1/2">
            <ThemeToggle className="shrink-0" />
          </div>
        </header>
        {!isPlatformAdmin && newOrderAlert ? (
          <div
            role="alert"
            aria-live="assertive"
            className="flex flex-wrap items-center justify-between gap-3 border-b border-wt-bordeaux/25 bg-wt-bordeaux-muted px-4 py-3 text-sm text-wt-bordeaux dark:border-wt-bordeaux/35 dark:bg-wt-bordeaux/20 dark:text-wt-white"
          >
            <p className="font-semibold">
              Nouvelle commande — en attente de confirmation
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/orders/${newOrderAlert.id}`}
                className="rounded-lg bg-wt-bordeaux px-3 py-1.5 text-xs font-semibold text-white hover:bg-wt-bordeaux-hover"
              >
                Ouvrir la commande
              </Link>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-wt-bordeaux underline-offset-2 hover:underline dark:text-wt-white/90"
                onClick={() => clearOrderAlert()}
              >
                Fermer
              </button>
            </div>
          </div>
        ) : null}
        {/* pt sur un enfant : sinon le padding-top du main ne scroll pas et tout sticky top-0 reste décalé sous un « trou » */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-clip overscroll-y-contain bg-background px-4 pb-8 pt-0 md:px-8 md:pb-8 md:pt-0">
          <div className="min-h-min pt-4 md:pt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
