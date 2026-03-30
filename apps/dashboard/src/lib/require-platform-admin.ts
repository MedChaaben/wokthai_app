import { createClient } from "@supabase/supabase-js";
import type { Database } from "@wokthai/shared";

export type PlatformAdminAuth =
  | { ok: true; userId: string }
  | { ok: false; message: string; status: number };

export async function requirePlatformAdminFromRequest(request: Request): Promise<PlatformAdminAuth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { ok: false, message: "Configuration Supabase manquante", status: 500 };
  }

  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return { ok: false, message: "Non authentifié", status: 401 };
  }

  const scoped = createClient<Database>(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userErr,
  } = await scoped.auth.getUser(token);
  if (userErr || !user) {
    return { ok: false, message: "Session invalide", status: 401 };
  }

  const { data: row, error: staffErr } = await scoped.from("staff").select("role").eq("user_id", user.id).maybeSingle();

  if (staffErr || !row || row.role !== "platform_admin") {
    return { ok: false, message: "Accès administrateur requis", status: 403 };
  }

  return { ok: true, userId: user.id };
}
