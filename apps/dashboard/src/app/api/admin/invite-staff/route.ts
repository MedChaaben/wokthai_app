import { NextResponse } from "next/server";
import { createServiceRoleSupabase } from "@/lib/supabase-service-role";
import { requirePlatformAdminFromRequest } from "@/lib/require-platform-admin";

type Body = {
  email?: string;
  password?: string;
  storeId?: string;
};

export async function POST(request: Request) {
  const auth = await requirePlatformAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const service = createServiceRoleSupabase();
  if (!service) {
    return NextResponse.json(
      {
        error:
          "Clé service role absente : définissez SUPABASE_SERVICE_ROLE_KEY dans apps/dashboard/.env.local pour créer des comptes depuis l’interface.",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const storeId = body.storeId?.trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Mot de passe : au moins 8 caractères" }, { status: 400 });
  }
  if (!storeId) {
    return NextResponse.json({ error: "Restaurant requis" }, { status: 400 });
  }

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Création du compte impossible (e-mail déjà utilisé ?)" },
      { status: 400 }
    );
  }

  const userId = created.user.id;

  const { error: staffErr } = await service.from("staff").insert({
    user_id: userId,
    email,
    store_id: storeId,
    role: "store",
  });

  if (staffErr) {
    await service.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: staffErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId });
}
