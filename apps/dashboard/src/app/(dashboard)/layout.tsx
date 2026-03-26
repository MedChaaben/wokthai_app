"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStaffProfile, useSupabase } from "@wokthai/shared";

const nav = [
  { href: "/orders", label: "Commandes" },
  { href: "/products", label: "Produits" },
  { href: "/categories", label: "Catégories" },
];

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMd = useIsMdUp();
  const mobileDrawerClosed = isMd === false && !mobileNavOpen;

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) router.replace("/login");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (staff.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-600">
        Chargement du profil…
      </div>
    );
  }

  if (!staff.data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-stone-900">Accès refusé</h1>
        <p className="mt-2 text-stone-600">
          Ce compte n’est pas lié à un profil <code className="rounded bg-stone-200 px-1">staff</code> en base.
          Ajoutez une ligne dans la table <code className="rounded bg-stone-200 px-1">staff</code> avec votre{" "}
          <code className="rounded bg-stone-200 px-1">user_id</code> Supabase.
        </p>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-6 rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Déconnexion
        </button>
      </div>
    );
  }

  const navLinks = (
    <nav className="mt-4 flex flex-col gap-1" aria-label="Navigation principale">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileNavOpen(false)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-orange-50 text-orange-800" : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <>
      <div className="flex items-start justify-between gap-2 md:block">
        <Link href="/orders" className="inline-block shrink-0 px-1" onClick={() => setMobileNavOpen(false)}>
          <Image
            src="/logo.svg"
            alt="WokThai"
            width={160}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>
        <button
          type="button"
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="mt-4 px-3 text-sm text-stone-600">Magasin assigné (commandes filtrées)</p>
      <p className="px-3 text-sm font-semibold text-stone-900">
        {staff.data.stores?.name ?? "—"}
        {staff.data.stores?.city ? (
          <span className="block text-xs font-normal text-stone-500">{staff.data.stores.city}</span>
        ) : null}
      </p>
      {navLinks}
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-500 hover:bg-stone-100"
      >
        Déconnexion
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-stone-900/40 md:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <aside
        id="dashboard-sidebar"
        inert={mobileDrawerClosed ? true : undefined}
        aria-hidden={mobileDrawerClosed ? true : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2rem,18rem)] max-w-[calc(100vw-2rem)] flex-col border-r border-stone-200 bg-white p-4 shadow-lg transition-transform duration-200 ease-out md:static md:z-0 md:w-56 md:max-w-none md:translate-x-0 md:shadow-none ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col gap-1">{sidebarInner}</div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-3 py-2.5 md:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-stone-700 hover:bg-stone-100"
            aria-expanded={mobileNavOpen}
            aria-controls="dashboard-sidebar"
            aria-label="Ouvrir le menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/orders" className="flex min-w-0 flex-1 items-center" onClick={() => setMobileNavOpen(false)}>
            <Image
              src="/logo.svg"
              alt="WokThai"
              width={140}
              height={32}
              className="h-8 w-auto max-w-[min(100%,180px)]"
              priority
            />
          </Link>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
