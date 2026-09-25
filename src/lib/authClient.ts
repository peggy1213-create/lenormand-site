import { createAuthClient } from "better-auth/react";

// baseURL defaults to the current origin, which is what we want (the auth API
// is served from /api/auth on the same domain).
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
