import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Returns the current user ({ user: null } when signed out). */
export async function GET(req: Request) {
  const user = await getSessionUser(req);
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
