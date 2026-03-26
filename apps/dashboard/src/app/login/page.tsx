"use client";

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
      <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">WokThai</h1>
      <p className="mt-1 text-stone-600">Espace équipe — connexion email</p>
      <form onSubmit={onSubmit} className="mt-10 space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-semibold text-stone-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-stone-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-stone-700" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-stone-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
