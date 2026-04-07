import { NextResponse } from "next/server";
import { requirePlatformAdminFromRequest } from "@/lib/require-platform-admin";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformAdminFromRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Configuration Supabase incomplète (URL ou SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 }
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Identifiant annonce manquant." }, { status: 400 });
  }

  const edgeUrl = `${url.replace(/\/$/, "")}/functions/v1/send-announcement-push`;
  const res = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ announcement_id: id }),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json(
      typeof json === "object" && json !== null ? json : { error: text },
      { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
    );
  }

  return NextResponse.json(typeof json === "object" && json !== null ? json : { ok: true });
}
