import { createClient } from "@supabase/supabase-js";
import type { Database } from "@wokthai/shared";

export function createServiceRoleSupabase(): ReturnType<typeof createClient<Database>> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
