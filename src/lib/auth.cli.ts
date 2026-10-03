import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

/**
 * Config used ONLY by `@better-auth/cli generate` to produce the D1 schema.
 * It never runs at request time. The CLI introspects a real SQLite to diff the
 * schema, so we point it at a throwaway local file (git-ignored). D1 is also
 * SQLite, so the generated SQL applies cleanly to D1.
 *
 * Keep the auth options (providers, plugins) in sync with src/lib/auth.ts so
 * the generated schema stays correct.
 */
export const auth = betterAuth({
  database: new Database(".auth-gen.sqlite"),
  socialProviders: {
    google: { clientId: "cli", clientSecret: "cli" },
  },
});
