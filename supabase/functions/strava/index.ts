// Edge Function "strava": guarda a chave secreta do app Strava longe da página.
// Ações: connect (troca o código do OAuth por tokens), activities (lista treinos), disconnect.
// Secrets necessários: STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Projetos novos expõem SUPABASE_SECRET_KEYS (JSON); os antigos, SUPABASE_SERVICE_ROLE_KEY.
const secretKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Object.values(JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"))[0] as string;
const admin = createClient(SUPABASE_URL, secretKey);

async function stravaToken(params: Record<string, string>) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("STRAVA_CLIENT_ID"),
      client_secret: Deno.env.get("STRAVA_CLIENT_SECRET"),
      ...params,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Strava recusou o token");
  return data;
}

async function freshAccessToken(userId: string) {
  const { data: row } = await admin.from("strava_tokens").select("*").eq("user_id", userId).maybeSingle();
  if (!row) throw new Error("Strava não conectado");
  if (row.expires_at > Date.now() / 1000 + 120) return row.access_token as string;
  const t = await stravaToken({ grant_type: "refresh_token", refresh_token: row.refresh_token });
  await admin.from("strava_tokens").update({
    access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  return t.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "Faça login de novo" }, 401);

    const { data: allowed } = await admin.from("allowed_emails").select("email");
    if (!allowed?.some((a) => a.email.toLowerCase() === (user.email ?? "").toLowerCase())) {
      return json({ error: "E-mail não liberado" }, 403);
    }

    const body = await req.json().catch(() => ({}));

    if (body.action === "connect") {
      if (!body.code) return json({ error: "Código ausente" }, 400);
      const t = await stravaToken({ grant_type: "authorization_code", code: body.code });
      await admin.from("strava_tokens").upsert({
        user_id: user.id, athlete_id: t.athlete?.id ?? null, access_token: t.access_token,
        refresh_token: t.refresh_token, expires_at: t.expires_at, updated_at: new Date().toISOString(),
      });
      const athlete = [t.athlete?.firstname, t.athlete?.lastname].filter(Boolean).join(" ");
      return json({ athlete });
    }

    if (body.action === "activities") {
      const token = await freshAccessToken(user.id);
      const after = Number(body.after) || Math.floor(Date.now() / 1000) - 90 * 86400;
      const out = [];
      for (let page = 1; page <= 3; page++) {
        const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100&page=${page}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) throw new Error("Strava não conectado");
        if (!res.ok) throw new Error(`Strava respondeu ${res.status}`);
        const list = await res.json();
        for (const a of list) {
          out.push({
            id: a.id, date: String(a.start_date_local).slice(0, 10), type: a.sport_type || a.type,
            name: a.name, moving_time: a.moving_time, distance: a.distance,
            start: a.start_date_local, elevation: a.total_elevation_gain, hr: a.average_heartrate,
          });
        }
        if (list.length < 100) break;
      }
      return json({ activities: out });
    }

    if (body.action === "disconnect") {
      try {
        const token = await freshAccessToken(user.id);
        await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch (_) { /* já estava desconectado */ }
      await admin.from("strava_tokens").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
