import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@/lib/supabase/server";

// The free (no-account, no-key) reading tier. Unlike the bring-your-own-key
// relay in ../route.ts, this path calls Cloudflare Workers AI with the site's
// own binding and meters usage so it can't be drained: every call counts
// against a per-visitor daily cap, a per-IP daily cap, and a global daily
// ceiling, all tracked in D1.
//
// Privacy: this route stores only opaque counters — an anonymous visitor UUID
// (in an HttpOnly cookie), a salted hash of the IP, and daily counts. It must
// never log, persist, or otherwise retain the prompt, the messages, the
// model's reply, or the raw IP. Do not add console.log/console.error calls
// that include any of req.json(), the reading text, or the client IP.

export const dynamic = "force-dynamic";

type ErrorCode = "invalid_key" | "rate_limited" | "network" | "captcha" | "limit" | "global_limit";
type ChatMessage = { role: "user" | "assistant"; content: string };

const MAX_OUTPUT_TOKENS = 4096;
const ANON_COOKIE = "lenormand_anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Accounts that bypass the daily cap entirely (e.g. the site owner, for
// testing on dev). Sign-in only exists on the dev site, so this never applies
// in production.
const UNLIMITED_EMAILS = new Set(["peichun1213@gmail.com"]);

// Same normalization contract as the BYO relay: accept either a single
// `prompt` string or a `messages` array, dropping anything that isn't a
// well-formed {role, content} pair.
function normalizeMessages(prompt: unknown, messages: unknown): ChatMessage[] {
  if (Array.isArray(messages)) {
    const cleaned = messages.filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string" &&
        (m as ChatMessage).content.length > 0,
    );
    if (cleaned.length > 0) return cleaned;
  }
  if (typeof prompt === "string" && prompt.length > 0) {
    return [{ role: "user", content: prompt }];
  }
  return [];
}

function jsonError(code: ErrorCode, status: number) {
  return Response.json({ error: code }, { status });
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function intVar(value: unknown, fallback: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : typeof value === "number" ? value : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Transforms Workers AI's SSE stream (lines of `data: {"response":"..."}`,
// terminated by `data: [DONE]`) into the same plain-text-plus-sentinel wire
// format the BYO relay uses, so the client can share one parser. Text chunks
// stream through as-is; a trailing "\n__USAGE__{...}" (or "\n__ERROR__{...}")
// line carries the token counts (best-effort — Workers AI may omit them).
function transformAiStream(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const usage = { inputTokens: 0, outputTokens: 0 };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.enqueue(encoder.encode(`\n__USAGE__${JSON.stringify(usage)}`));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload) as {
              response?: string;
              usage?: { prompt_tokens?: number; completion_tokens?: number };
            };
            if (typeof obj.response === "string" && obj.response.length > 0) {
              controller.enqueue(encoder.encode(obj.response));
            }
            if (obj.usage) {
              usage.inputTokens = obj.usage.prompt_tokens ?? usage.inputTokens;
              usage.outputTokens = obj.usage.completion_tokens ?? usage.outputTokens;
            }
          } catch {
            // Non-JSON keep-alive or partial line — ignore.
          }
        }
      } catch {
        controller.enqueue(encoder.encode(`\n__ERROR__${JSON.stringify({ code: "network" })}`));
        controller.close();
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}

// Minimal structural typings for the two D1 methods used here — avoids
// pulling the full @cloudflare/workers-types globals (and their DOM-lib
// conflicts) into this Next.js module.
interface D1Prepared {
  bind(...values: unknown[]): D1Prepared;
}
interface D1DB {
  prepare(query: string): D1Prepared;
  batch<T = unknown>(statements: D1Prepared[]): Promise<{ results: T[] }[]>;
}

interface FreeEnv {
  AI: { run: (model: string, options: Record<string, unknown>) => Promise<ReadableStream<Uint8Array>> };
  DB: D1DB;
  FREE_MODEL?: string;
  FREE_USER_DAILY_CAP?: string;
  FREE_AUTH_DAILY_CAP?: string;
  FREE_IP_DAILY_CAP?: string;
  FREE_GLOBAL_DAILY_CAP?: string;
  ANON_HASH_SALT?: string;
}

export async function POST(req: Request) {
  let body: { prompt?: string; messages?: ChatMessage[]; maxOutputTokens?: number };
  try {
    body = await req.json();
  } catch {
    return jsonError("network", 400);
  }

  const chatMessages = normalizeMessages(body.prompt, body.messages);
  if (chatMessages.length === 0) return jsonError("network", 400);

  const { env } = getCloudflareContext() as unknown as { env: FreeEnv };
  if (!env?.AI || !env?.DB) return jsonError("network", 500);

  const ip = req.headers.get("cf-connecting-ip") ?? "";

  // 1. Who is this? Sign-in exists on dev only. Signed-in users get a higher
  // daily cap; anonymous users get the lower cap. In production there is no
  // sign-in, so everyone is anonymous here.
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    userEmail = data.user?.email ?? null;
  } catch {
    userId = null;
  }
  const signedIn = !!userId;
  const isUnlimited = userEmail ? UNLIMITED_EMAILS.has(userEmail) : false;

  // 2. Identity + limits. (No bot check — anonymous abuse is bounded by the
  // per-cookie, per-IP, and global daily caps below.) Signed-in usage is keyed by user id (shared across
  // that person's devices); anonymous usage by the per-visitor cookie, with an
  // IP backstop. Both tiers share one daily table and the global ceiling.
  const cap = signedIn ? intVar(env.FREE_AUTH_DAILY_CAP, 3) : intVar(env.FREE_USER_DAILY_CAP, 2);
  const ipCap = intVar(env.FREE_IP_DAILY_CAP, 8);
  const globalCap = intVar(env.FREE_GLOBAL_DAILY_CAP, 200);
  const day = new Date().toISOString().slice(0, 10);

  const existingAnon = readCookie(req, ANON_COOKIE);
  // Regenerate a missing or implausibly long cookie value, and persist it so
  // the per-visitor counter can accumulate on the next request.
  const anonId = existingAnon && existingAnon.length <= 64 ? existingAnon : crypto.randomUUID();
  const isNewAnon = !signedIn && anonId !== existingAnon;
  const usageId = signedIn ? `user:${userId}` : anonId;
  const ipHash = ip ? await sha256Hex(`${env.ANON_HASH_SALT ?? ""}:${ip}`) : "noip";

  const db = env.DB;
  let usageCount = 0;
  let ipCount = 0;
  let globalCount = 0;
  try {
    const [usageRow, ipRow, globalRow] = await db.batch<{ count: number }>([
      db.prepare("SELECT count FROM anon_usage WHERE anon_id = ? AND day = ?").bind(usageId, day),
      db.prepare("SELECT count FROM ip_usage WHERE ip_hash = ? AND day = ?").bind(ipHash, day),
      db.prepare("SELECT count FROM global_usage WHERE day = ?").bind(day),
    ]);
    usageCount = usageRow.results[0]?.count ?? 0;
    ipCount = ipRow.results[0]?.count ?? 0;
    globalCount = globalRow.results[0]?.count ?? 0;
  } catch {
    return jsonError("network", 500);
  }

  if (!isUnlimited) {
    if (globalCount >= globalCap) return jsonError("global_limit", 429);
    // The IP backstop applies to anonymous visitors only — signed-in users are
    // already gated by their account, and a shared IP shouldn't block them.
    if (usageCount >= cap || (!signedIn && ipCount >= ipCap)) return jsonError("limit", 429);
  }

  // 4. Meter the call. Increment before generating so an aborted stream still
  // counts — "every AI call counts". A rare race (two requests both passing
  // the SELECT above) can let a count reach cap+1; acceptable for a free tier.
  // Unlimited accounts still bump the global counter (cost visibility) but not
  // the per-identity cap.
  try {
    const writes: D1Prepared[] = [
      db
        .prepare(
          "INSERT INTO global_usage (day, count) VALUES (?, 1) " +
            "ON CONFLICT(day) DO UPDATE SET count = count + 1",
        )
        .bind(day),
    ];
    if (!isUnlimited) {
      writes.push(
        db
          .prepare(
            "INSERT INTO anon_usage (anon_id, day, count) VALUES (?, ?, 1) " +
              "ON CONFLICT(anon_id, day) DO UPDATE SET count = count + 1",
          )
          .bind(usageId, day),
      );
      if (!signedIn) {
        writes.push(
          db
            .prepare(
              "INSERT INTO ip_usage (ip_hash, day, count) VALUES (?, ?, 1) " +
                "ON CONFLICT(ip_hash, day) DO UPDATE SET count = count + 1",
            )
            .bind(ipHash, day),
        );
      }
    }
    await db.batch(writes);
  } catch {
    return jsonError("network", 500);
  }
  const remaining = isUnlimited ? cap : Math.max(0, cap - (usageCount + 1));

  // 4. Generate.
  const maxTokens =
    typeof body.maxOutputTokens === "number" && body.maxOutputTokens > 0
      ? Math.min(body.maxOutputTokens, MAX_OUTPUT_TOKENS)
      : MAX_OUTPUT_TOKENS;
  const model = env.FREE_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

  let aiStream: ReadableStream<Uint8Array>;
  try {
    aiStream = await env.AI.run(model, {
      messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      max_tokens: maxTokens,
    });
  } catch {
    return jsonError("network", 502);
  }

  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "X-Free-Remaining": String(remaining),
  });
  if (isNewAnon) {
    headers.append(
      "Set-Cookie",
      `${ANON_COOKIE}=${anonId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
    );
  }

  return new Response(transformAiStream(aiStream), { headers });
}
