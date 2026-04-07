import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH = 100;

type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  send_push: boolean;
};

function truncateBody(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { announcement_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const announcementId = typeof body.announcement_id === "string" ? body.announcement_id.trim() : "";
  if (!announcementId) {
    return new Response(JSON.stringify({ error: "missing_announcement_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "missing_supabase_url" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: ann, error: annErr } = await supabase
    .from("announcements")
    .select("id,title,message,is_active,send_push")
    .eq("id", announcementId)
    .maybeSingle();

  if (annErr) {
    return new Response(JSON.stringify({ error: annErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const row = ann as AnnouncementRow | null;
  if (!row) {
    return new Response(JSON.stringify({ error: "announcement_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!row.is_active || !row.send_push) {
    return new Response(JSON.stringify({ error: "push_not_allowed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: tokenRows, error: tokErr } = await supabase
    .from("users")
    .select("expo_push_token")
    .not("expo_push_token", "is", null);

  if (tokErr) {
    return new Response(JSON.stringify({ error: tokErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokens = [
    ...new Set(
      (tokenRows ?? [])
        .map((r: { expo_push_token: string | null }) => r.expo_push_token)
        .filter((t): t is string => typeof t === "string" && t.length > 0)
    ),
  ];

  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const bodyText = truncateBody(row.message, 200);

  if (tokens.length > 0) {
    for (let i = 0; i < tokens.length; i += BATCH) {
      const chunk = tokens.slice(i, i + BATCH);
      const messages = chunk.map((to) => ({
        to,
        sound: "default",
        title: row.title,
        body: bodyText,
        data: { type: "announcement", announcementId: row.id },
        priority: "high",
        channelId: "announcements",
      }));

      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (expoAccessToken) {
        headers.Authorization = `Bearer ${expoAccessToken}`;
      }

      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        const detail = await res.text();
        return new Response(JSON.stringify({ error: "expo_push_failed", detail }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("announcements")
    .update({ push_last_sent_at: nowIso })
    .eq("id", announcementId);

  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message, warning: "push_sent_but_timestamp_not_saved" }), {
      status: 207,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, token_count: tokens.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
