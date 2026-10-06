import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Lightweight auth for Cloudflare Workers — no external auth framework.
 *
 * Google sign-in uses the OAuth 2.0 authorization-code flow with PKCE (see
 * src/app/api/auth/*). Sessions are opaque random tokens: the raw token lives
 * in an httpOnly cookie, and only its SHA-256 hash is stored in D1 (so a DB
 * read never exposes a usable token). This keeps better-auth + kysely out of
 * the OpenNext worker bundle, which is what caused the production cold-start
 * 1102s.
 *
 * Reuses the existing D1 tables (user/session/account). Timestamps are stored
 * as ISO-8601 UTC strings; lexicographic comparison of that format is correct.
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string | null;
  picture?: string | null;
};

export const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

// ---------------------------------------------------------------------------
// Encoding / crypto helpers (Web Crypto only — zero bundle cost)
// ---------------------------------------------------------------------------

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(size = 32): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", data));
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function getCookie(req: Request, name: string): string | null {
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

export type CookieOpts = {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
};

export function serializeCookie(name: string, value: string, opts: CookieOpts = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

/** Keep redirects on the same origin to avoid open-redirect abuse. */
export function sanitizeReturn(raw: string | null, origin: string): string {
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

// ---------------------------------------------------------------------------
// Session + user (D1)
// ---------------------------------------------------------------------------

async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const env = await getEnv();
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
export async function createSession(req: Request, userId: string): Promise<string> {
  const env = await getEnv();
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

export async function deleteSession(req: Request): Promise<void> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return;
  const env = await getEnv();
  const tokenHash = await sha256hex(token);
  await env.DB.prepare(`DELETE FROM session WHERE token = ?`).bind(tokenHash).run();
}

export function sessionCookie(rawToken: string, secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
}

/** Upserts the Google user + account, returns the user id. */
export async function upsertGoogleUser(profile: GoogleProfile): Promise<string> {
  const env = await getEnv();
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
