import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// Same stateless-relay contract as src/app/api/reading/route.ts: this route
// forwards the caller's own API key to their chosen provider's model-listing
// endpoint and returns only the resulting model IDs. Never log the request
// body (it contains the user's API key) or raw provider error objects.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApiProvider = "anthropic" | "openai" | "gemini";
type ErrorCode = "invalid_key" | "rate_limited" | "network";

function classifyError(err: unknown): ErrorCode {
  const status =
    (err as { status?: number } | null)?.status ??
    (err as { response?: { status?: number } } | null)?.response?.status;
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 429) return "rate_limited";
  return "network";
}

async function listAnthropicModels(apiKey: string, signal: AbortSignal): Promise<string[]> {
  const client = new Anthropic({ apiKey });
  const ids: string[] = [];
  for await (const model of await client.models.list({}, { signal })) {
    ids.push(model.id);
  }
  return ids;
}

// OpenAI's model list includes embeddings, TTS, Whisper, moderation, and
// image models alongside chat-capable ones with no capability field to
// filter on — this is a best-effort id-pattern filter, not exhaustive.
const OPENAI_CHAT_MODEL_RE = /^(gpt-|o[0-9]|chatgpt)/i;
const OPENAI_EXCLUDE_RE =
  /audio|realtime|transcribe|tts|whisper|embedding|moderation|dall-e|image|davinci|babbage|curie|ada-/i;

async function listOpenAiModels(apiKey: string, signal: AbortSignal): Promise<string[]> {
  const client = new OpenAI({ apiKey });
  const ids: string[] = [];
  for await (const model of await client.models.list({ signal })) {
    if (OPENAI_CHAT_MODEL_RE.test(model.id) && !OPENAI_EXCLUDE_RE.test(model.id)) {
      ids.push(model.id);
    }
  }
  return ids;
}

// Gemini model names come back as "models/gemini-x", but generateContent
// calls expect the bare id — strip the prefix. The catalog also lists
// entries that exist but routinely fail a real generateContent call on a
// given key/tier: dated snapshots, experimental/preview-tagged variants,
// vision/audio/tts/image specializations, and adjacent families (Gemma,
// LearnLM, legacy PaLM bison/gecko models). Rather than deny-listing every
// such case, this keeps only "clean" current-generation chat ids —
// gemini-<version>-<flash|pro>[-lite|-8b] — since that's the naming shape
// every actually-callable model observed so far has used. This is a
// heuristic, not a guarantee: the model field stays free text, so anything
// filtered out here can still be typed in manually.
const GEMINI_MODEL_RE = /^gemini-\d+(?:\.\d+)?-(?:flash|pro)(?:-lite|-8b)?$/;

async function listGeminiModels(apiKey: string, signal: AbortSignal): Promise<string[]> {
  const client = new GoogleGenAI({ apiKey });
  const ids: string[] = [];
  const pager = await client.models.list({ config: { pageSize: 200, abortSignal: signal } });
  for await (const model of pager) {
    const name = model.name ?? "";
    const id = name.startsWith("models/") ? name.slice("models/".length) : name;
    if (GEMINI_MODEL_RE.test(id)) ids.push(id);
  }
  return ids;
}

function jsonError(code: ErrorCode, status: number) {
  return Response.json({ error: code }, { status });
}

export async function POST(req: Request) {
  let body: { provider?: ApiProvider; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("network", 400);
  }

  const { provider, apiKey } = body;
  if ((provider !== "anthropic" && provider !== "openai" && provider !== "gemini") || !apiKey) {
    return jsonError("network", 400);
  }

  try {
    const models =
      provider === "anthropic"
        ? await listAnthropicModels(apiKey, req.signal)
        : provider === "openai"
          ? await listOpenAiModels(apiKey, req.signal)
          : await listGeminiModels(apiKey, req.signal);
    return Response.json({ models });
  } catch (err) {
    const code = classifyError(err);
    return jsonError(code, code === "invalid_key" ? 401 : code === "rate_limited" ? 429 : 502);
  }
}
