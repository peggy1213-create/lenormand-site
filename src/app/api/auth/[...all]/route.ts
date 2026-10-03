import { getAuth } from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    const auth = await getAuth(new URL(req.url).origin);
    return auth.handler(req);
  } catch (err) {
    // TEMP DIAGNOSTIC: surface why auth 500s on the dev worker. Reports only
    // the presence (boolean) of each binding/secret, never their values.
    let present: Record<string, boolean> = {};
    try {
      const { env } = await getCloudflareContext({ async: true });
      const e = env as unknown as Record<string, unknown>;
      present = {
        DB: !!e.DB,
        BETTER_AUTH_SECRET: !!e.BETTER_AUTH_SECRET,
        GOOGLE_CLIENT_ID: !!e.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!e.GOOGLE_CLIENT_SECRET,
      };
    } catch (ctxErr) {
      present = { contextError: true };
    }
    const e = err as Error;
    return Response.json(
      { diagnostic: true, present, error: e?.message, stack: e?.stack?.split("\n").slice(0, 6) },
      { status: 500 },
    );
  }
}

export { handler as GET, handler as POST };
