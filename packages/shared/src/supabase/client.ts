import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export type WokthaiSupabaseClient = SupabaseClient<Database>;

type StorageLike = {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
};

export function createWokthaiSupabase(
  url: string,
  anonKey: string,
  options?: { storage?: StorageLike }
): WokthaiSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: {
      ...(options?.storage ? { storage: options.storage } : {}),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}
