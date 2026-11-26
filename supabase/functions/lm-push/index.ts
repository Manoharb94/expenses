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

// deno-lint-ignore no-explicit-any
async function send(project: string, access: string, token: string, title: string, body: string, data: Record<string, string>, sb: any): Promise<boolean> {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
    method: "POST",
    headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title, body }, data, android: { priority: "HIGH", ttl: "120s", notification: { channel_id: "invites", notification_priority: "PRIORITY_MAX", default_sound: true } },
      apns: { headers: { "apns-priority": "10", "apns-push-type": "alert" }, payload: { aps: { sound: "default" } } } } }),
  });
  if (r.ok) { console.log("FCM ok", token.slice(0, 10)); return true; }
  const e = await r.text();
  // the reason shows in Supabase → Edge Functions → lm-push → Logs
  console.error("FCM failed", r.status, token.slice(0, 10), e.slice(0, 400));
  // forget a token only when Google says that phone is gone (not for other errors, so a good token is never thrown away)
  if (r.status === 404 || /UNREGISTERED|not a valid FCM registration token/.test(e)) await sb.rpc("lm_push_forget", { p_token: token });
  return false;
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

    const body = await req.json().catch(() => ({}));

    // test mode (hidden Testing menu / Maestro 14_push): after a short wait, send one notification to the caller's own phone(s)
    if (body.test) {
      const { data: mine, error: e1 } = await sb.rpc("lm_push_mine", { p_user: u.user.id });
      if (e1) return json({ error: e1.message }, 500);
      const toks: string[] = mine || [];
      if (!toks.length) return json({ queued: 0 });
      const delay = Math.min(Math.max(Number(body.delay) || 10, 0), 30) * 1000;
      const job = (async () => {
        await new Promise((r) => setTimeout(r, delay));
        const access = await googleToken(sa);
        await Promise.all(toks.map((token) =>
          send(sa.project_id, access, token, "Gharwise test notification", "Push notifications work ✓ Tap to open Gharwise.", { kind: "test" }, sb)));
      })();
      // answer straight away so the person can leave the app; keep sending in the background
      // deno-lint-ignore no-explicit-any
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(job); else await job;
      return json({ queued: toks.length });
    }

    // the invited phone has a new key: ask the family's phones to lock the invite again (they do it when Gharwise opens)
    if (body.rekey) {
      const { data: rt, error: e2 } = await sb.rpc("lm_rekey_targets", { p_caller: u.user.id });
      if (e2) return json({ error: e2.message }, 500);
      const rtoks: string[] = rt || [];
      if (!rtoks.length) return json({ sent: 0 });
      const access = await googleToken(sa);
      const res = await Promise.all(rtoks.map((token) => send(sa.project_id, access, token,
        "Your invite needs a quick refresh", "Open Gharwise so the person you invited can accept.", { kind: "reseal" }, sb)));
      return json({ sent: res.filter(Boolean).length });
    }

    const invite = body.invite;
    if (!invite) return json({ error: "invite missing" }, 400);
    const { data: t, error } = await sb.rpc("lm_push_targets", { p_invite: invite, p_caller: u.user.id });
    if (error) return json({ error: error.message }, 403);
    const tokens: string[] = t?.tokens || [];
    if (!tokens.length) { console.log("invite", invite, "no push token for the invited phone"); return json({ sent: 0 }); }

    const family = t.kind === "family";
    const delay = Math.min(Math.max(Number(body.delay) || 0, 0), 30) * 1000; // the one-phone invite test waits so the person can leave the app
    const job = (async () => {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const access = await googleToken(sa);
      const res = await Promise.all(tokens.map((token) => send(sa.project_id, access, token,
        family ? "👨‍👩‍👧 Family invite" : "👥 Group invite",
        family
          ? "Someone invited you to their family. Tap to open Gharwise and accept ✓ or reject ✕."
          : "Someone invited you to a group. Tap to open Gharwise and accept ✓ or reject ✕.",
        { kind: "invite", invite: String(invite) }, sb)));
      const n = res.filter(Boolean).length;
      return n;
    })();
    if (delay) {
      // deno-lint-ignore no-explicit-any
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) { rt.waitUntil(job); return json({ queued: tokens.length }); }
    }
    const sent = await job;
    // nothing was delivered: allow the next try to notify again
    if (!sent) await sb.from("lm_invites").update({ notified_for: null }).eq("id", invite);
    return json({ sent });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
