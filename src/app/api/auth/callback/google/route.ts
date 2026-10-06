import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getCookie,
  serializeCookie,
  sanitizeReturn,
  createSession,
  upsertGoogleUser,
  sessionCookie,
  type GoogleProfile,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Decodes and lightly validates the Google ID token (received directly from
 * Google's token endpoint over TLS, so the claims are trusted). */
function parseIdToken(idToken: string | undefined, clientId: string): GoogleProfile | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length < 2) return null;
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    b64 += "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const p = JSON.parse(new TextDecoder().decode(bytes));
    if (p.aud !== clientId) return null;
    if (p.iss !== "https://accounts.google.com" && p.iss !== "accounts.google.com") return null;
    if (typeof p.exp === "number" && p.exp * 1000 < Date.now()) return null;
    if (!p.email) return null;
    return {
      sub: String(p.sub),
      email: String(p.email),
      emailVerified: p.email_verified === true || p.email_verified === "true",
      name: p.name ?? null,
      picture: p.picture ?? null,
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(req.url);
  const origin = url.origin;
  const secure = url.protocol === "https:";

  const returnTo = sanitizeReturn(getCookie(req, "oauth_return"), origin);
  const stateCookie = getCookie(req, "oauth_state");
  const verifier = getCookie(req, "oauth_verifier");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Clear the short-lived OAuth cookies on every outcome.
  const clearOpts = { httpOnly: true, secure, sameSite: "Lax" as const, path: "/", maxAge: 0 };
  const headers = new Headers();
  for (const name of ["oauth_state", "oauth_verifier", "oauth_return"]) {
    headers.append("Set-Cookie", serializeCookie(name, "", clearOpts));
  }

  const fail = (reason: string) => {
    const dest = new URL(returnTo, origin);
    dest.searchParams.set("auth_error", reason);
    headers.set("Location", dest.pathname + dest.search);
    return new Response(null, { status: 302, headers });
  };

  if (oauthError) return fail("denied");
  if (!code || !state || !stateCookie || state !== stateCookie || !verifier) {
    return fail("state");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin}/api/auth/callback/google`,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) return fail("exchange");

  const tokenJson = (await tokenRes.json()) as { id_token?: string };
  const profile = parseIdToken(tokenJson.id_token, env.GOOGLE_CLIENT_ID);
  if (!profile) return fail("token");

  const userId = await upsertGoogleUser(profile);
  const rawToken = await createSession(req, userId);
  headers.append("Set-Cookie", sessionCookie(rawToken, secure));
  headers.set("Location", returnTo);
  return new Response(null, { status: 302, headers });
}
