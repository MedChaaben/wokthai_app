"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@wokthai/shared";

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
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <div className="flex justify-center">
        <Image
          src="/wokthai-logo.png"
          alt="Wok Thaï"
          width={220}
          height={56}
          className="h-14 w-auto"
          priority
        />
      </div>
      <h1 className="mt-6 text-center text-xl font-extrabold tracking-tight text-zinc-100">
        Espace équipe
      </h1>
      <p className="mt-1 text-center text-zinc-400">Connexion par email</p>
      <form onSubmit={onSubmit} className="mt-10 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-zinc-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2.5 text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-900/50"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-zinc-300" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-700 px-3 py-2.5 text-zinc-100 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-900/50"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
