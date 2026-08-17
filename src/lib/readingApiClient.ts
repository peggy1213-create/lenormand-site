import type { ApiProvider } from "./apiSettings";

export type ReadingApiErrorCode = "invalid_key" | "rate_limited" | "refusal" | "network";

export type ReadingStreamResult =
  | { ok: true; usage: { inputTokens: number; outputTokens: number } }
  | { ok: false; error: ReadingApiErrorCode };

// Generous upper bound for the trailing "\n__USAGE__{...}" / "\n__ERROR__{...}"
// sentinel line the proxy appends after streaming text — held back from
// `onText` so it never briefly flashes on screen as reading content.
const SENTINEL_HOLDBACK = 400;

// Streams a reading from src/app/api/reading/route.ts, calling `onText` with
// prose chunks as they arrive and resolving once the trailing usage/error
// sentinel has been parsed off the end of the stream. Shared by the
// settings-page "Test key" button and the reading screen's live panel.
export async function streamReading(
  params: {
    provider: ApiProvider;
    model: string;
    apiKey: string;
    prompt: string;
    maxOutputTokens?: number;
  },
  onText: (chunk: string) => void,
): Promise<ReadingStreamResult> {
  let res: Response;
  try {
    res = await fetch("/api/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch {
    return { ok: false, error: "network" };
  }

  if (!res.ok || !res.body) {
    let code: ReadingApiErrorCode = "network";
    try {
      const data = await res.json();
      if (data?.error === "invalid_key" || data?.error === "rate_limited") code = data.error;
    } catch {
      // fall through to generic network error
    }
    return { ok: false, error: code };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

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
