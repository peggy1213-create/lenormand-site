import type { Ai, D1Database, KVNamespace } from "@cloudflare/workers-types";

// Augments the empty CloudflareEnv interface from @opennextjs/cloudflare with
// this project's bindings and secrets, so getCloudflareContext().env is typed.
declare global {
  interface CloudflareEnv {
    // Bindings (wrangler.jsonc)
    AI: Ai;
    FREE_READING_USAGE: KVNamespace;
    DB: D1Database;

    // Better Auth secrets (wrangler secret put / .dev.vars)
    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;

    // Existing secrets
    TURNSTILE_SECRET_KEY?: string;
    ANON_HASH_SALT?: string;
  }
}

export {};
