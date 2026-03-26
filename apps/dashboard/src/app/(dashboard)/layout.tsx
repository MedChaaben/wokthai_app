"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStaffProfile, useSupabase } from "@wokthai/shared";

const nav = [
  { href: "/orders", label: "Commandes" },
  { href: "/products", label: "Produits" },
  { href: "/categories", label: "Catégories" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const staff = useStaffProfile();

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

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-stone-200 bg-white md:w-56 md:border-b-0 md:border-r">
        <div className="flex flex-col gap-1 p-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-stone-500">WokThai</p>
          <p className="px-3 text-sm text-stone-600">Magasin assigné (commandes filtrées)</p>
          <p className="px-3 text-sm font-semibold text-stone-900">
            {staff.data.stores?.name ?? '—'}
            {staff.data.stores?.city ? (
              <span className="block text-xs font-normal text-stone-500">{staff.data.stores.city}</span>
            ) : null}
          </p>
          <nav className="mt-4 flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? "bg-orange-50 text-orange-800" : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-6 rounded-lg px-3 py-2 text-left text-sm font-medium text-stone-500 hover:bg-stone-100"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
