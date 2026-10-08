/**
 * Framework-free Google OAuth + session handling for the four /api/auth/*
 * endpoints, lifted out of the Next.js request path.
 *
 * Why this exists: the sign-in callback (/api/auth/callback/google) was hit by
 * intermittent Cloudflare Error 1102 ("Worker exceeded resource limits"). The
 * callback's own work is trivial (~6ms warm), but it ran through the full
 * Next.js/OpenNext worker, whose cold start (framework + next-intl middleware +
 * compiling the server bundle) measured ~150-160ms and occasionally crossed
 * Cloudflare's ~400ms startup budget on a cold/distant isolate. This module is
 * pure Web Crypto + D1 + fetch, so when the custom worker entry (worker-entry.ts)
 * routes an /api/auth/* request here it never evaluates any Next.js code — the
 * cold start drops to single-digit ms with ~20-30x headroom.
 *
 * The logic is a straight port of src/lib/auth.ts + src/app/api/auth/*. It must
 * stay behaviourally identical: same cookie names, same D1 schema, same
 * /api/auth/callback/google redirect path (so the registered Google redirect
 * URIs keep working). `env` is passed in from the worker's fetch() instead of
 * being read via getCloudflareContext().
 *
 * Privacy: never log request bodies, cookies, tokens, codes, or raw provider
 * errors here.
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  picture?: string | null;
};

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ---------------------------------------------------------------------------
// Encoding / crypto helpers (Web Crypto only)
// ---------------------------------------------------------------------------

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(size = 32): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

type CookieOpts = {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
};

function serializeCookie(name: string, value: string, opts: CookieOpts = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

/** Keep redirects on the same origin to avoid open-redirect abuse. */
function sanitizeReturn(raw: string | null, origin: string): string {
  if (!raw) return "/";
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
    const u = new URL(raw, origin);
    if (u.origin === origin) return u.pathname + u.search;
  } catch {
    /* fall through */
  }
  return "/";
}

function sessionCookie(rawToken: string, secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

function clearSessionCookie(secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
}

// ---------------------------------------------------------------------------
// Session + user (D1)
// ---------------------------------------------------------------------------

async function getSessionUser(req: Request, env: CloudflareEnv): Promise<SessionUser | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id AS id, u.email AS email, u.name AS name, u.image AS image, s.expiresAt AS expiresAt
     FROM session s JOIN "user" u ON u.id = s.userId
     WHERE s.token = ? LIMIT 1`,
  )
    .bind(tokenHash)
    .first<{ id: string; email: string; name: string | null; image: string | null; expiresAt: string }>();
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await env.DB.prepare(`DELETE FROM session WHERE token = ?`).bind(tokenHash).run().catch(() => {});
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, image: row.image };
}

/** Creates a session row and returns the raw token to put in the cookie. */
async function createSession(req: Request, env: CloudflareEnv, userId: string): Promise<string> {
  const rawToken = randomToken(32);
  const tokenHash = await sha256hex(rawToken);
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO session (id, token, userId, expiresAt, createdAt, updatedAt, ipAddress, userAgent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      tokenHash,
      userId,
      expiresIso,
      nowIso,
      nowIso,
      req.headers.get("cf-connecting-ip"),
      req.headers.get("user-agent"),
    )
    .run();
  return rawToken;
}

async function deleteSession(req: Request, env: CloudflareEnv): Promise<void> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return;
  const tokenHash = await sha256hex(token);
  await env.DB.prepare(`DELETE FROM session WHERE token = ?`).bind(tokenHash).run();
}

/** Upserts the Google user + account, returns the user id. */
async function upsertGoogleUser(env: CloudflareEnv, profile: GoogleProfile): Promise<string> {
  const nowIso = new Date().toISOString();
  const displayName = profile.name ?? profile.email;

  const existing = await env.DB.prepare(`SELECT id FROM "user" WHERE email = ? LIMIT 1`)
    .bind(profile.email)
    .first<{ id: string }>();

  let userId: string;
  if (existing) {
    userId = existing.id;
    await env.DB.prepare(
      `UPDATE "user" SET name = ?, image = ?, emailVerified = ?, updatedAt = ? WHERE id = ?`,
    )
      .bind(displayName, profile.picture ?? null, profile.emailVerified ? 1 : 0, nowIso, userId)
      .run();
  } else {
    userId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO "user" (id, name, email, emailVerified, image, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(userId, displayName, profile.email, profile.emailVerified ? 1 : 0, profile.picture ?? null, nowIso, nowIso)
      .run();
  }

  const account = await env.DB.prepare(
    `SELECT id FROM account WHERE providerId = 'google' AND accountId = ? LIMIT 1`,
  )
    .bind(profile.sub)
    .first<{ id: string }>();
  if (!account) {
    await env.DB.prepare(
      `INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
       VALUES (?, ?, 'google', ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), profile.sub, userId, nowIso, nowIso)
      .run();
  }

  return userId;
}

// ---------------------------------------------------------------------------
// Google ID token
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * Starts the Google OAuth flow: generates CSRF `state` + a PKCE verifier,
 * stashes them (and the post-login return path) in short-lived httpOnly
 * cookies, then redirects the browser to Google's consent screen.
 */
async function signinGoogle(req: Request, env: CloudflareEnv, url: URL): Promise<Response> {
  const origin = url.origin;
  const secure = url.protocol === "https:";

  const state = randomToken(24);
  const verifier = randomToken(32);
  const challenge = base64url(await sha256bytes(verifier));
  const returnTo = sanitizeReturn(url.searchParams.get("callbackURL"), origin);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", `${origin}/api/auth/callback/google`);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");

  const opts = { httpOnly: true, secure, sameSite: "Lax" as const, path: "/", maxAge: 600 };
  const headers = new Headers();
  headers.append("Set-Cookie", serializeCookie("oauth_state", state, opts));
  headers.append("Set-Cookie", serializeCookie("oauth_verifier", verifier, opts));
  headers.append("Set-Cookie", serializeCookie("oauth_return", returnTo, opts));
  headers.set("Location", authUrl.toString());
  return new Response(null, { status: 302, headers });
}

async function callbackGoogle(req: Request, env: CloudflareEnv, url: URL): Promise<Response> {
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

  const userId = await upsertGoogleUser(env, profile);
  const rawToken = await createSession(req, env, userId);
  headers.append("Set-Cookie", sessionCookie(rawToken, secure));
  headers.set("Location", returnTo);
  return new Response(null, { status: 302, headers });
}

async function getSession(req: Request, env: CloudflareEnv): Promise<Response> {
  const user = await getSessionUser(req, env);
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Legacy cookies from the old Better Auth setup (replaced by this lightweight
// OAuth). Clearing them on sign-out means a browser that still holds one can
// never get wedged in a "stuck signed in" state after the auth rewrite.
const LEGACY_COOKIES = ["better-auth.session_token", "better-auth.csrf_token"];

async function signout(req: Request, env: CloudflareEnv, url: URL): Promise<Response> {
  const secure = url.protocol === "https:";

  // Clearing the cookie must never depend on the DB delete succeeding — if
  // deleteSession throws (e.g. a transient D1 error), the client still needs to
  // end up signed out. getSessionUser also fails closed once the row is gone,
  // so a best-effort delete is safe.
  try {
    await deleteSession(req, env);
  } catch {
    /* fall through — cookie clearing below is what signs the user out */
  }

  const headers = new Headers();
  headers.append("Set-Cookie", clearSessionCookie(secure));
  for (const name of LEGACY_COOKIES) {
    headers.append("Set-Cookie", serializeCookie(name, "", { path: "/", maxAge: 0, sameSite: "Lax" }));
    // Better Auth uses the __Secure- prefix over HTTPS; that variant can only be
    // cleared with the Secure attribute set.
    if (secure) {
      headers.append(
        "Set-Cookie",
        serializeCookie(`__Secure-${name}`, "", { path: "/", maxAge: 0, sameSite: "Lax", secure: true }),
      );
    }
  }

  return new Response(null, { status: 200, headers });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const AUTH_PATHS = new Set([
  "/api/auth/signin/google",
  "/api/auth/callback/google",
  "/api/auth/get-session",
  "/api/auth/signout",
]);

/** True when this request should be served by the framework-free handler below
 * (and therefore skip the Next.js worker entirely). */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}

const METHOD_NOT_ALLOWED = () => new Response("Method Not Allowed", { status: 405 });

/** Dispatch an /api/auth/* request. Caller must have checked isAuthPath first. */
export async function handleAuth(req: Request, env: CloudflareEnv, url: URL): Promise<Response> {
  const { pathname } = url;
  const method = req.method.toUpperCase();

  if (pathname === "/api/auth/signin/google") {
    return method === "GET" ? signinGoogle(req, env, url) : METHOD_NOT_ALLOWED();
  }
  if (pathname === "/api/auth/callback/google") {
    return method === "GET" ? callbackGoogle(req, env, url) : METHOD_NOT_ALLOWED();
  }
  if (pathname === "/api/auth/get-session") {
    return method === "GET" ? getSession(req, env) : METHOD_NOT_ALLOWED();
  }
  if (pathname === "/api/auth/signout") {
    return method === "POST" ? signout(req, env, url) : METHOD_NOT_ALLOWED();
  }
  // Unreachable when isAuthPath gated the call, but stay safe.
  return new Response("Not Found", { status: 404 });
}
