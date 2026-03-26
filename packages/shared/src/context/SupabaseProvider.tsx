import { createContext, useContext, type ReactNode } from 'react';
import type { WokthaiSupabaseClient } from '../supabase/client';

const SupabaseContext = createContext<WokthaiSupabaseClient | null>(null);

export function SupabaseProvider({
  client,
  children,
}: {
  client: WokthaiSupabaseClient;
  children: ReactNode;
}) {
  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>;
}

export function useSupabase(): WokthaiSupabaseClient {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('SupabaseProvider est requis');
  return ctx;
}
