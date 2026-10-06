import { getCloudflareContext } from "@opennextjs/cloudflare";
import { randomToken, base64url, sha256bytes, serializeCookie, sanitizeReturn } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Starts the Google OAuth flow: generates CSRF `state` + a PKCE verifier,
 * stashes them (and the post-login return path) in short-lived httpOnly
 * cookies, then redirects the browser to Google's consent screen.
 */
export async function GET(req: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const url = new URL(req.url);
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
