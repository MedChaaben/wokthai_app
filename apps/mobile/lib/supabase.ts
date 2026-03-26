import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWokthaiSupabase, type WokthaiSupabaseClient } from '@wokthai/shared';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseReady = Boolean(url && key);

let client: WokthaiSupabaseClient | null = null;

/** À n’appeler que si `supabaseReady` est vrai (évite createClient avec URL vide). */
export function getSupabase(): WokthaiSupabaseClient {
  if (!supabaseReady) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY sont requis');
  }
  if (!client) {
    client = createWokthaiSupabase(url, key, { storage: AsyncStorage });
  }
  return client;
}
