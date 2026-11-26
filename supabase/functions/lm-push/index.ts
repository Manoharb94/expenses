// Gharwise on-phone app: sends a push notification when someone is invited to a family or group.
// Deploy: Supabase → Edge Functions → Deploy a new function → name "lm-push" → paste this file.
// Secret: Edge Functions → Secrets → FIREBASE_SERVICE_ACCOUNT = the whole service-account JSON from Firebase.
// iPhone: also set APNS_KEY (the whole .p8 file from Apple), APNS_KEY_ID and APNS_TEAM_ID. iPhone push goes straight to Apple.
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

// ---- iPhone: Apple Push Notification service (APNs), token-based (.p8 key) ----
let apnsCached: { jwt: string; at: number } | null = null;
async function apnsJwt(): Promise<string | null> {
  const p8 = Deno.env.get("APNS_KEY"), kid = Deno.env.get("APNS_KEY_ID"), team = Deno.env.get("APNS_TEAM_ID");
  if (!p8 || !kid || !team) return null;
  const now = Math.floor(Date.now() / 1000);
  if (apnsCached && now - apnsCached.at < 45 * 60) return apnsCached.jwt;   // Apple wants a fresh one at least every hour
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ alg: "ES256", kid }) + "." + enc({ iss: team, iat: now });
  const pem = p8.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  apnsCached = { jwt: unsigned + "." + b64url(sig), at: now };
  return apnsCached.jwt;
}
// An iPhone push address is 64 hex characters; an Android (Firebase) one is much longer and has a colon.
const isApns = (t: string) => /^[0-9a-f]{64}$/i.test(t);

// deno-lint-ignore no-explicit-any
async function sendApns(token: string, title: string, body: string, data: Record<string, string>, sb: any): Promise<boolean> {
  const jwt = await apnsJwt();
  if (!jwt) return false;                     // iPhone secrets not set yet
  const host = Deno.env.get("APNS_HOST") || "api.push.apple.com";   // TestFlight and App Store use the production host
  const topic = Deno.env.get("APNS_TOPIC") || "in.nestwise.app.local";
  const r = await fetch(`https://${host}/3/device/${token}`, {
    method: "POST",
    headers: { authorization: "bearer " + jwt, "apns-topic": topic, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json" },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: "default" }, ...data }),
  });
  if (r.ok) return true;
  const e = await r.text();
  if (r.status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(e)) await sb.rpc("lm_push_forget", { p_token: token });
  console.log("apns", r.status, e.slice(0, 200));
  return false;
}

// deno-lint-ignore no-explicit-any
async function send(project: string, access: string, token: string, title: string, body: string, data: Record<string, string>, sb: any): Promise<boolean> {
  if (isApns(token)) return await sendApns(token, title, body, data, sb);
  if (!access) return false;
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`, {
    method: "POST",
    headers: { Authorization: "Bearer " + access, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title, body }, data, android: { priority: "HIGH", notification: { channel_id: "invites" } } } }),
  });
  if (r.ok) return true;
  const e = await r.text();
  if (r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(e)) await sb.rpc("lm_push_forget", { p_token: token });
  return false;
}

// Google sign-in only when there is an Android phone to reach (an iPhone-only setup needs no Firebase secret).
// deno-lint-ignore no-explicit-any
async function googleFor(sa: any, tokens: string[]): Promise<string> {
  if (!sa || !tokens.some((t) => !isApns(t))) return "";
  return await googleToken(sa);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const sa = raw ? JSON.parse(raw) : null;
    if (!sa && !Deno.env.get("APNS_KEY")) return json({ sent: 0, note: "FIREBASE_SERVICE_ACCOUNT / APNS_KEY secrets not set" });
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
        const access = await googleFor(sa, toks);
        for (const token of toks) {
          await send(sa?.project_id, access, token, "Gharwise test notification", "Push notifications work ✓ Tap to open Gharwise.", { kind: "test" }, sb);
        }
      })();
      // answer straight away so the person can leave the app; keep sending in the background
      // deno-lint-ignore no-explicit-any
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(job); else await job;
      return json({ queued: toks.length });
    }

    const invite = body.invite;
    if (!invite) return json({ error: "invite missing" }, 400);
    const { data: t, error } = await sb.rpc("lm_push_targets", { p_invite: invite, p_caller: u.user.id });
    if (error) return json({ error: error.message }, 403);
    const tokens: string[] = t?.tokens || [];
    if (!tokens.length) return json({ sent: 0 });

    const family = t.kind === "family";
    const delay = Math.min(Math.max(Number(body.delay) || 0, 0), 30) * 1000; // the one-phone invite test waits so the person can leave the app
    const job = (async () => {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const access = await googleFor(sa, tokens);
      let n = 0;
      for (const token of tokens) {
        if (await send(sa?.project_id, access, token,
          family ? "Family invite" : "Group invite",
          family
            ? "Someone invited you to their family on Gharwise. Open the app to accept or reject."
            : "Someone invited you to a group on Gharwise. Open the app to accept or reject.",
          { kind: "invite", invite: String(invite) }, sb)) n++;
      }
      return n;
    })();
    if (delay) {
      // deno-lint-ignore no-explicit-any
      const rt = (globalThis as any).EdgeRuntime;
      if (rt?.waitUntil) { rt.waitUntil(job); return json({ queued: tokens.length }); }
    }
    const sent = await job;
    return json({ sent });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
