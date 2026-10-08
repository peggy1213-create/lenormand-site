import { deleteSession, clearSessionCookie, serializeCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Legacy cookies from the old Better Auth setup (replaced in b6874fd). Clearing
// them here means a browser that still holds one can never get wedged in a
// "stuck signed in" state after the auth rewrite.
const LEGACY_COOKIES = ["better-auth.session_token", "better-auth.csrf_token"];

export async function POST(req: Request) {
  const secure = new URL(req.url).protocol === "https:";

  // Clearing the cookie must never depend on the DB delete succeeding — if
  // deleteSession throws (e.g. a transient D1 error), the client still needs to
  // end up signed out. getSessionUser also fails closed when the row is gone,
  // so a best-effort delete is safe.
  try {
    await deleteSession(req);
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
