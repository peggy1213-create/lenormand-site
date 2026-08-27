import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// This route is a stateless relay: it forwards the caller's own API key and
// prompt to their chosen provider and streams the reply straight back. It
// must never log, persist, or otherwise retain the request body (which
// contains the user's API key and the reading prompt) or the provider's
// response. Do not add console.log/console.error calls that include any of
// req.json(), the api key, the prompt, or raw provider error objects.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Extended thinking on Gemini can otherwise push a single response past 30–70s
// (observed directly), which risks the Vercel serverless timeout on top of
// being a slow reading. Gives the route more room than the 10s default.
export const maxDuration = 60;

type ApiProvider = "anthropic" | "openai" | "gemini";
type ErrorCode = "invalid_key" | "rate_limited" | "network";
type Usage = { inputTokens: number; outputTokens: number };
type ProviderResult = { usage: Usage; refused: boolean };

const MAX_OUTPUT_TOKENS = 4096;

function classifyError(err: unknown): ErrorCode {
  const status =
    (err as { status?: number } | null)?.status ??
    (err as { response?: { status?: number } } | null)?.response?.status;
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 429) return "rate_limited";
  return "network";
}

async function* anthropicChunks(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  signal: AbortSignal,
): AsyncGenerator<string, ProviderResult, void> {
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream(
    {
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    },
    { signal },
  );
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
  const final = await stream.finalMessage();
  return {
    usage: {
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
    },
    refused: final.stop_reason === "refusal",
  };
}

async function* openaiChunks(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  signal: AbortSignal,
): AsyncGenerator<string, ProviderResult, void> {
  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create(
    {
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      stream: true,
      stream_options: { include_usage: true },
    },
    { signal },
  );
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let refused = false;
  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (choice?.delta?.content) yield choice.delta.content;
    if (choice?.finish_reason === "content_filter") refused = true;
    if (chunk.usage) {
      usage.inputTokens = chunk.usage.prompt_tokens;
      usage.outputTokens = chunk.usage.completion_tokens;
    }
  }
  return { usage, refused };
}

// Gemini's request/response shape was verified against @google/genai's
// published quickstart and confirmed against live calls during development.
// Thinking is explicitly disabled (thinkingBudget: 0) — on models that
// support extended reasoning (observed on 3.x-generation Flash models),
// leaving it at its default cost 30-70+ seconds for a single reading, which
// risks the serverless timeout on top of just being slow for this use case.
async function* geminiChunks(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  signal: AbortSignal,
): AsyncGenerator<string, ProviderResult, void> {
  const client = new GoogleGenAI({ apiKey });
  const stream = await client.models.generateContentStream({
    model,
    contents: prompt,
    config: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 }, abortSignal: signal },
  });
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let refused = false;
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
    const finishReason = chunk.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS") {
      refused = true;
    }
    if (chunk.usageMetadata) {
      usage.inputTokens = chunk.usageMetadata.promptTokenCount ?? 0;
      usage.outputTokens = chunk.usageMetadata.candidatesTokenCount ?? 0;
    }
  }
  return { usage, refused };
}

function providerChunks(
  provider: ApiProvider,
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number,
  signal: AbortSignal,
): AsyncGenerator<string, ProviderResult, void> {
  if (provider === "anthropic") return anthropicChunks(apiKey, model, prompt, maxTokens, signal);
  if (provider === "openai") return openaiChunks(apiKey, model, prompt, maxTokens, signal);
  return geminiChunks(apiKey, model, prompt, maxTokens, signal);
}

function jsonError(code: ErrorCode, status: number) {
  return Response.json({ error: code }, { status });
}

export async function POST(req: Request) {
  let body: {
    provider?: ApiProvider;
    model?: string;
    apiKey?: string;
    prompt?: string;
    maxOutputTokens?: number;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("network", 400);
  }

  const { provider, model, apiKey, prompt, maxOutputTokens } = body;
  if (
    (provider !== "anthropic" && provider !== "openai" && provider !== "gemini") ||
    !model ||
    !apiKey ||
    !prompt
  ) {
    return jsonError("network", 400);
  }
  const maxTokens =
    typeof maxOutputTokens === "number" && maxOutputTokens > 0
      ? Math.min(maxOutputTokens, MAX_OUTPUT_TOKENS)
      : MAX_OUTPUT_TOKENS;

  const generator = providerChunks(provider, apiKey, model, prompt, maxTokens, req.signal);

  // Drive the generator once before returning a Response, so an immediate
  // auth or rate-limit failure surfaces as a proper HTTP status instead of a
  // 200 response that fails mid-stream.
  let first: IteratorResult<string, ProviderResult>;
  try {
    first = await generator.next();
  } catch (err) {
    const code = classifyError(err);
    return jsonError(code, code === "invalid_key" ? 401 : code === "rate_limited" ? 429 : 502);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let current = first;
        while (!current.done) {
          controller.enqueue(encoder.encode(current.value));
          current = await generator.next();
        }
        if (current.value.refused) {
          controller.enqueue(encoder.encode(`\n__ERROR__${JSON.stringify({ code: "refusal" })}`));
        } else {
          controller.enqueue(encoder.encode(`\n__USAGE__${JSON.stringify(current.value.usage)}`));
        }
      } catch (err) {
        const code = classifyError(err);
        controller.enqueue(encoder.encode(`\n__ERROR__${JSON.stringify({ code })}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
