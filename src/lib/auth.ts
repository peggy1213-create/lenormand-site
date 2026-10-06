import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Better Auth runs on Cloudflare Workers, so the D1 binding is only available
 * per-request via getCloudflareContext() — not at module load. We build the
 * auth instance on each request instead of exporting a singleton.
 *
 * baseURL comes from the incoming request origin so the same code works on
 * localhost and on www.in-betweens.cc without extra config.
 */
export async function getAuth(baseURL?: string) {
  const { env } = await getCloudflareContext({ async: true });

  return betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: "sqlite",
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  });
}
