import { deleteSession, clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await deleteSession(req);
  const secure = new URL(req.url).protocol === "https:";
  return new Response(null, {
    status: 200,
    headers: { "Set-Cookie": clearSessionCookie(secure) },
  });
}
