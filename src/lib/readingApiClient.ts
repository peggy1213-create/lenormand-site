import { DEFAULT_MODELS, type ApiProvider } from "./apiSettings";

export type ReadingApiErrorCode = "invalid_key" | "rate_limited" | "refusal" | "network";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ReadingStreamResult =
  | { ok: true; usage: { inputTokens: number; outputTokens: number } }
  | { ok: false; error: ReadingApiErrorCode };

// The free (no-key) tier can additionally run out of daily uses or be blocked
// by the bot check; those map to their own error codes so the UI can explain
// them. `remaining` (free-tier daily uses left) rides along on success.
export type FreeReadingErrorCode = ReadingApiErrorCode | "captcha" | "limit" | "global_limit";
export type FreeReadingStreamResult =
  | { ok: true; usage: { inputTokens: number; outputTokens: number }; remaining: number | null }
  | { ok: false; error: FreeReadingErrorCode };

// Generous upper bound for the trailing "\n__USAGE__{...}" / "\n__ERROR__{...}"
// sentinel line the proxy appends after streaming text — held back from
// `onText` so it never briefly flashes on screen as reading content.
const SENTINEL_HOLDBACK = 400;

// Streams a reading from src/app/api/reading/route.ts, calling `onText` with
// prose chunks as they arrive and resolving once the trailing usage/error
// sentinel has been parsed off the end of the stream. Shared by the
// settings-page "Test key" button and the reading screen's live panel.
// Pass `prompt` for a one-shot reading, or `messages` for a multi-turn
// conversation (the reading plus follow-up questions).
export async function streamReading(
  params: {
    provider: ApiProvider;
    model: string;
    apiKey: string;
    prompt?: string;
    messages?: ChatMessage[];
    maxOutputTokens?: number;
  },
  onText: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<ReadingStreamResult> {
  let res: Response;
  try {
    res = await fetch("/api/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });
  } catch {
    return { ok: false, error: "network" };
  }

  if (!res.ok || !res.body) {
    let code: ReadingApiErrorCode = "network";
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error === "invalid_key" || data?.error === "rate_limited")
        code = data.error as ReadingApiErrorCode;
    } catch {
      // fall through to generic network error
    }
    return { ok: false, error: code };
  }

  return consumeReadingStream(res.body, onText);
}

// Reads the plain-text-plus-sentinel stream both reading routes produce,
// forwarding prose to `onText` and parsing the trailing "\n__USAGE__{...}" /
// "\n__ERROR__{...}" line off the end. Shared by the BYO relay and the free
// tier, which produce identical stream bodies.
async function consumeReadingStream(
  body: ReadableStream<Uint8Array>,
  onText: (chunk: string) => void,
): Promise<ReadingStreamResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      if (pending.length > SENTINEL_HOLDBACK) {
        const emitLength = pending.length - SENTINEL_HOLDBACK;
        onText(pending.slice(0, emitLength));
        pending = pending.slice(emitLength);
      }
    }
  } catch {
    // Aborted mid-stream (e.g. the caller cancelled) or a genuine read
    // error — either way, resolve rather than leaving an unhandled
    // rejection; the caller decides whether this result still matters.
    return { ok: false, error: "network" };
  }
  pending += decoder.decode();

  const usageMatch = pending.match(/\n__USAGE__(\{[\s\S]*\})$/);
  const errorMatch = pending.match(/\n__ERROR__(\{[\s\S]*\})$/);

  if (usageMatch) {
    onText(pending.slice(0, usageMatch.index));
    try {
      const usage = JSON.parse(usageMatch[1]);
      return { ok: true, usage };
    } catch {
      return { ok: true, usage: { inputTokens: 0, outputTokens: 0 } };
    }
  }

  if (errorMatch) {
    onText(pending.slice(0, errorMatch.index));
    try {
      const parsed = JSON.parse(errorMatch[1]);
      return { ok: false, error: parsed?.code === "refusal" ? "refusal" : "network" };
    } catch {
      return { ok: false, error: "network" };
    }
  }

  // Stream ended without a recognizable sentinel — treat as a successful
  // reading with unknown token usage rather than discarding the text.
  onText(pending);
  return { ok: true, usage: { inputTokens: 0, outputTokens: 0 } };
}

// Streams a free-tier reading from src/app/api/reading/free/route.ts. Same
// shape as streamReading, but with no API key — the server uses Cloudflare
// Workers AI and meters usage — and a Turnstile token proving a human is
// driving it.
//
// The server counts the call and returns the visitor's remaining free uses in
// the X-Free-Remaining header *before* generating, so `onRemaining` fires as
// soon as that header is read — not after the stream finishes. This keeps the
// displayed count in sync with the server even when the reading is slow, gets
// aborted, or errors mid-stream (the server already counted it). It also fires
// with 0 on a "limit"/"global_limit" rejection.
export async function streamFreeReading(
  params: {
    // Required for anonymous visitors; signed-in users (dev only) skip
    // Turnstile, so this may be omitted for them.
    turnstileToken?: string;
    prompt?: string;
    messages?: ChatMessage[];
    maxOutputTokens?: number;
  },
  onText: (chunk: string) => void,
  signal?: AbortSignal,
  onRemaining?: (remaining: number | null) => void,
): Promise<FreeReadingStreamResult> {
  let res: Response;
  try {
    res = await fetch("/api/reading/free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });
  } catch {
    return { ok: false, error: "network" };
  }

  if (!res.ok || !res.body) {
    let code: FreeReadingErrorCode = "network";
    try {
      const data = (await res.json()) as { error?: string };
      const known: string[] = [
        "invalid_key",
        "rate_limited",
        "network",
        "captcha",
        "limit",
        "global_limit",
      ];
      if (data?.error && known.includes(data.error)) code = data.error as FreeReadingErrorCode;
    } catch {
      // fall through to generic network error
    }
    // A cap rejection means none left — reflect that in the UI immediately.
    if (code === "limit" || code === "global_limit") onRemaining?.(0);
    return { ok: false, error: code };
  }

  const remainingHeader = res.headers.get("X-Free-Remaining");
  const remaining =
    remainingHeader !== null && Number.isFinite(Number(remainingHeader)) ? Number(remainingHeader) : null;
  // Fire before consuming the body: the server has already counted this call,
  // so the displayed count must update even if the stream below fails.
  onRemaining?.(remaining);

  const result = await consumeReadingStream(res.body, onText);
  if (!result.ok) return result;
  return { ok: true, usage: result.usage, remaining };
}

export type ModelResolution = {
  model: string;
  verified: boolean;
  // Set when no candidate was verified and at least one failed specifically
  // with a rate limit — the key may be fine, just temporarily throttled
  // (common on Gemini's free tier).
  rateLimited: boolean;
};

// How many of the ranked candidates to actually probe. The provider listing
// is dozens of entries deep; probing all of them would burn real quota (and
// on a free tier, trip the rate limit that then fails the rest). The best
// few cover the realistic cases — newest model, newest-that-has-quota,
// newest-that-isn't-retired.
const MAX_PROBES = 4;

// Walks the top `candidates` in order and returns the first model that
// completes a tiny real call through the proxy. The provider's model listing
// can't be trusted on its own — it returns retired models (404) and models
// with no free-tier quota (429) — so this is how the settings page lands on
// a model that actually works for this key. If none respond, returns the top
// candidate with `verified: false` so the caller can flag the key.
export async function resolveWorkingModel(
  provider: ApiProvider,
  apiKey: string,
  candidates: string[],
  signal?: AbortSignal,
): Promise<ModelResolution> {
  let throttledModel: string | undefined;
  for (const model of candidates.slice(0, MAX_PROBES)) {
    if (signal?.aborted) break;
    const result = await streamReading(
      // Above Gemini's thinking floor (thinkingBudget: 128 in the reading
      // route) — a lower cap makes those models return an empty MAX_TOKENS
      // response, which is a useless probe signal.
      { provider, model, apiKey, prompt: "Reply with OK.", maxOutputTokens: 256 },
      () => {},
      signal,
    );
    // Stop the moment the caller cancels — streamReading reports an aborted
    // request as a plain failure, which would otherwise fall through to
    // probing the next candidate for a run that no longer matters.
    if (signal?.aborted) break;
    if (result.ok) return { model, verified: true, rateLimited: false };
    // A 429 means the model exists for this key, just has no quota right now —
    // a better fallback than the top candidate, which might be retired (404).
    if (result.error === "rate_limited" && !throttledModel) throttledModel = model;
  }
  return {
    model: throttledModel ?? candidates[0] ?? DEFAULT_MODELS[provider],
    verified: false,
    rateLimited: throttledModel !== undefined,
  };
}

// Best-effort model suggestions for the settings page — used to rank models
// for resolveWorkingModel, never to block. Any failure (bad key, network,
// rate limit) is swallowed and returns an empty list.
export async function fetchProviderModels(
  provider: ApiProvider,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  try {
    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
      signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: unknown };
    return Array.isArray(data?.models) ? data.models.filter((m: unknown) => typeof m === "string") : [];
  } catch {
    return [];
  }
}
