"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SupabaseProvider } from "@wokthai/shared";
import { ThemeProvider } from "@/components/ThemeProvider";
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
      <ThemeProvider>
        <div className="mx-auto max-w-lg px-4 py-16 text-zinc-800 dark:text-zinc-200">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Configuration Supabase</h1>
          <p className="mt-2 text-stone-600 dark:text-zinc-400">
            Définissez{" "}
            <code className="rounded bg-stone-200 px-1 dark:bg-zinc-700">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
            <code className="rounded bg-stone-200 px-1 dark:bg-zinc-700">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dans{" "}
            <code className="rounded bg-stone-200 px-1 dark:bg-zinc-700">apps/dashboard/.env.local</code>.
          </p>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SupabaseProvider client={supabase}>{children}</SupabaseProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
