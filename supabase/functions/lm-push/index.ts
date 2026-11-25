// Gharwise on-phone app: sends a push notification when someone is invited to a family or group.
// Deploy: Supabase → Edge Functions → Deploy a new function → name "lm-push" → paste this file.
// Secret: Edge Functions → Secrets → FIREBASE_SERVICE_ACCOUNT = the whole service-account JSON from Firebase.
// The text is general on purpose: names and group names are encrypted on the phones, so nobody else (incl. Google) sees them.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function b64url(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

let cached: { token: string; exp: number } | null = null;
async function googleToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: "RS256", typ: "JWT" }) + "." + enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + unsigned + "." + b64url(sig),
  });
  const o = await r.json();
  if (!o.access_token) throw new Error("Google login failed: " + JSON.stringify(o).slice(0, 200));
  cached = { token: o.access_token, exp: now + (o.expires_in || 3600) };
  return cached.token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!raw) return json({ sent: 0, note: "FIREBASE_SERVICE_ACCOUNT secret not set" });
    const sa = JSON.parse(raw);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ error: "not logged in" }, 401);

    const { invite } = await req.json().catch(() => ({}));
    if (!invite) return json({ error: "invite missing" }, 400);
    const { data: t, error } = await sb.rpc("lm_push_targets", { p_invite: invite, p_caller: u.user.id });
    if (error) return json({ error: error.message }, 403);
    const tokens: string[] = t?.tokens || [];
    if (!tokens.length) return json({ sent: 0 });

    const family = t.kind === "family";
    const access = await googleToken(sa);
    let sent = 0;
    for (const token of tokens) {
      const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: family ? "Family invite" : "Group invite",
              body: family
                ? "Someone invited you to their family on Gharwise. Open the app to accept or reject."
                : "Someone invited you to a group on Gharwise. Open the app to accept or reject.",
            },
            data: { kind: "invite", invite: String(invite) },
            android: { priority: "HIGH", notification: { channel_id: "invites" } },
          },
        }),
      });
      if (r.ok) sent++;
      else {
        const e = await r.text();
        if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(e)) await sb.rpc("lm_push_forget", { p_token: token });
      }
    }
    return json({ sent });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
