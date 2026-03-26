"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@wokthai/shared";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    router.replace("/orders");
  }

  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex justify-center">
        <span className="wt-logo-surface">
          <Image
            src="/wokthai-logo.png"
            alt="Wok Thaï"
            width={220}
            height={56}
            className="h-12 w-auto"
            priority
          />
        </span>
      </div>
      <h1 className="mt-6 text-center text-xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
        Espace équipe
      </h1>
      <p className="mt-1 text-center text-stone-600 dark:text-zinc-400">Connexion par email</p>
      <form onSubmit={onSubmit} className="mt-10 space-y-4 wt-panel p-6">
        <div>
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-wt-bordeaux focus:ring-2 focus:ring-wt-bordeaux/25 dark:focus:ring-wt-bordeaux/35"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 dark:border-zinc-700 px-3 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-wt-bordeaux focus:ring-2 focus:ring-wt-bordeaux/25 dark:focus:ring-wt-bordeaux/35"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-wt-bordeaux py-3 font-semibold text-white transition hover:bg-wt-bordeaux-hover disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
