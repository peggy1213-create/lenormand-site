// Client-side auth helpers. Plain fetch calls to /api/auth/* — no auth library
// in the bundle.

export type ClientUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

export async function fetchSession(): Promise<ClientUser | null> {
  try {
    const res = await fetch("/api/auth/get-session", {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: ClientUser | null };
    return data?.user ?? null;
  } catch {
    return null;
  }
}

/** Redirects the browser into the Google OAuth flow. */
export function signInWithGoogle(callbackURL?: string): void {
  const cb = callbackURL ?? (typeof window !== "undefined" ? window.location.href : "/");
  window.location.href = `/api/auth/signin/google?callbackURL=${encodeURIComponent(cb)}`;
}

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
  } catch {
    /* ignore — the cookie clears server-side and we reload regardless */
  }
}
