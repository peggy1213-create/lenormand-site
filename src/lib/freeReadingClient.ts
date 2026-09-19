import type { SpreadId } from "@/data/spreads";

export type FreeReadingErrorCode =
  | "daily_limit_reached"
  | "spread_not_allowed"
  | "ai_error"
  | "network";

export type FreeReadingResult =
  | { ok: true }
  | { ok: false; error: FreeReadingErrorCode };

export async function streamFreeReading(
  params: { spread: SpreadId; prompt: string },
  onText: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<FreeReadingResult> {
  let res: Response;
  try {
    res = await fetch("/api/free-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });
  } catch {
    return { ok: false, error: "network" };
  }

  if (!res.ok) {
    let code: FreeReadingErrorCode = "network";
    try {
      const data = (await res.json()) as { error?: string };
      if (
        data?.error === "daily_limit_reached" ||
        data?.error === "spread_not_allowed"
      ) {
        code = data.error as FreeReadingErrorCode;
      } else if (data?.error === "ai_error" || data?.error === "ai_unavailable") {
        code = "ai_error";
      }
    } catch {
      // fall through
    }
    return { ok: false, error: code };
  }

  if (!res.body) {
    return { ok: false, error: "network" };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      // Workers AI SSE stream: extract data lines
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content =
              parsed.choices?.[0]?.delta?.content ?? parsed.response;
            if (content) onText(content);
          } catch {
            // non-JSON data line, skip
          }
        }
      }
    }
  } catch {
    return { ok: false, error: "network" };
  }

  return { ok: true };
}

const FREE_READING_USAGE_KEY = "lenormand.freeReadingUsage";

type UsageRecord = { date: string; count: number };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getLocalFreeReadingCount(): number {
  try {
    const raw = localStorage.getItem(FREE_READING_USAGE_KEY);
    if (!raw) return 0;
    const record: UsageRecord = JSON.parse(raw);
    if (record.date !== todayStr()) return 0;
    return record.count;
  } catch {
    return 0;
  }
}

export function incrementLocalFreeReadingCount(): void {
  try {
    const today = todayStr();
    const current = getLocalFreeReadingCount();
    const record: UsageRecord = { date: today, count: current + 1 };
    localStorage.setItem(FREE_READING_USAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable
  }
}
