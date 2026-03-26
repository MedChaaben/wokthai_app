"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SupabaseProvider } from "@wokthai/shared";
import { createDashboardSupabaseClient } from "@/lib/supabase/browser";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const supabase = useMemo(() => {
    try {
      return createDashboardSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  if (!supabase) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-zinc-200">
        <h1 className="text-xl font-bold">Configuration Supabase</h1>
        <p className="mt-2 text-zinc-400">
          Définissez <code className="rounded bg-zinc-700 px-1">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
          <code className="rounded bg-zinc-700 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans{" "}
          <code className="rounded bg-zinc-700 px-1">apps/dashboard/.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider client={supabase}>{children}</SupabaseProvider>
    </QueryClientProvider>
  );
}
