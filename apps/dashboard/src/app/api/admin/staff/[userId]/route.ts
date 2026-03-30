import { NextResponse } from "next/server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { requirePlatformAdminFromRequest } from "@/lib/require-platform-admin";

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

type PatchBody = {
  email?: string;
  password?: string;
  storeId?: string;
};

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId: targetUserId } = await context.params;
  if (!isUuid(targetUserId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const auth = await requirePlatformAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const service = createServiceRoleSupabase();
  if (!service) {
    return NextResponse.json(
      {
        error:
          "Clé service role absente : définissez SUPABASE_SERVICE_ROLE_KEY dans apps/dashboard/.env.local.",
      },
      { status: 503 }
    );
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const { data: staffRow, error: staffFetchErr } = await service
    .from("staff")
    .select("user_id, email, store_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (staffFetchErr || !staffRow) {
    return NextResponse.json({ error: "Profil staff introuvable" }, { status: 404 });
  }

  const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
  const storeIdIn = typeof body.storeId === "string" ? body.storeId.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : "";

  const authUpdates: { email?: string; password?: string } = {};
  if (password.length > 0) {
    if (password.length < 8) {
      return NextResponse.json({ error: "Mot de passe : au moins 8 caractères" }, { status: 400 });
    }
    authUpdates.password = password;
  }
  if (emailRaw !== undefined && emailRaw !== staffRow.email) {
    if (!emailRaw || !emailRaw.includes("@")) {
      return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
    }
    authUpdates.email = emailRaw;
  }

  if (storeIdIn !== undefined && storeIdIn !== staffRow.store_id) {
    if (!storeIdIn) {
      return NextResponse.json({ error: "Magasin requis" }, { status: 400 });
    }
    const { data: store, error: storeErr } = await service.from("stores").select("id").eq("id", storeIdIn).maybeSingle();
    if (storeErr || !store) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 400 });
    }
  }

  const staffUpdates: { email?: string; store_id?: string } = {};
  if (emailRaw !== undefined && emailRaw !== staffRow.email) {
    staffUpdates.email = emailRaw;
  }
  if (storeIdIn !== undefined && storeIdIn !== staffRow.store_id) {
    staffUpdates.store_id = storeIdIn;
  }

  if (Object.keys(authUpdates).length === 0 && Object.keys(staffUpdates).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error: updAuthErr } = await service.auth.admin.updateUserById(targetUserId, authUpdates);
    if (updAuthErr) {
      return NextResponse.json({ error: updAuthErr.message }, { status: 400 });
    }
  }

  if (Object.keys(staffUpdates).length > 0) {
    const { error: updStaffErr } = await service.from("staff").update(staffUpdates).eq("user_id", targetUserId);
    if (updStaffErr) {
      return NextResponse.json({ error: updStaffErr.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId: targetUserId } = await context.params;
  if (!isUuid(targetUserId)) {
    return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  }

  const auth = await requirePlatformAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  if (targetUserId === auth.userId) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  const service = createServiceRoleSupabase();
  if (!service) {
    return NextResponse.json(
      {
        error:
          "Clé service role absente : définissez SUPABASE_SERVICE_ROLE_KEY dans apps/dashboard/.env.local.",
      },
      { status: 503 }
    );
  }

  const { data: row, error: fetchErr } = await service.from("staff").select("user_id").eq("user_id", targetUserId).maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Profil staff introuvable" }, { status: 404 });
  }

  const { error: delErr } = await service.auth.admin.deleteUser(targetUserId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
