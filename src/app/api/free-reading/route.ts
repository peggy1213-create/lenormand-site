import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@/lib/supabase/server";
import type { SpreadId } from "@/data/spreads";

export const dynamic = "force-dynamic";

type FreeReadingBody = {
  spread: SpreadId;
  prompt: string;
};

const ANON_SPREADS: SpreadId[] = ["daily"];
const AUTH_SPREADS: SpreadId[] = ["daily", "three", "five"];
const MAX_DAILY_ANON = 1;
const MAX_DAILY_AUTH = 2;
const MAX_OUTPUT_TOKENS = 512;
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

function todayKey(identifier: string): string {
  const d = new Date();
  const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return `free:${identifier}:${dateStr}`;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: FreeReadingBody;
  try {
    body = await req.json();
  } catch {
    return jsonError("bad_request", 400);
  }

  const { spread, prompt } = body;
  if (!prompt || typeof prompt !== "string" || prompt.length === 0) {
    return jsonError("bad_request", 400);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const allowedSpreads = user ? AUTH_SPREADS : ANON_SPREADS;
  const dailyLimit = user ? MAX_DAILY_AUTH : MAX_DAILY_ANON;

  if (!allowedSpreads.includes(spread)) {
    return jsonError("spread_not_allowed", 403);
  }

  let env: CloudflareEnv;
  let cf: Record<string, unknown> | undefined;
  try {
    const ctx = await getCloudflareContext({ async: true });
    env = ctx.env;
    cf = ctx.cf as Record<string, unknown> | undefined;
  } catch {
    return jsonError("runtime_unavailable", 503);
  }

  const ai = (env as Record<string, unknown>).AI as Ai | undefined;
  const kv = (env as Record<string, unknown>).FREE_READING_USAGE as KVNamespace | undefined;

  if (!ai) {
    return jsonError("ai_unavailable", 503);
  }

  const identifier = user
    ? `user:${user.id}`
    : (cf?.connecting_ip as string)
      ?? req.headers.get("cf-connecting-ip")
      ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? "unknown";

  if (kv) {
    const key = todayKey(identifier);
    const raw = await kv.get(key);
    const used = raw ? parseInt(raw, 10) : 0;
    if (used >= dailyLimit) {
      return jsonError("daily_limit_reached", 429);
    }
  }

  try {
    const result = await ai.run(MODEL, {
      messages: [{ role: "user", content: prompt }],
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
    }) as unknown as ReadableStream;

    if (kv) {
      const key = todayKey(identifier);
      const raw = await kv.get(key);
      const used = raw ? parseInt(raw, 10) : 0;
      await kv.put(key, String(used + 1), { expirationTtl: 86400 });
    }

    return new Response(result, {
      headers: { "Content-Type": "text/event-stream" },
    });
  } catch {
    return jsonError("ai_error", 502);
  }
}
