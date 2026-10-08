/**
 * Custom Worker entry (wrangler `main`).
 *
 * It splits the request path in two:
 *   - /api/auth/*  -> a framework-free handler (src/worker/auth.ts). No Next.js
 *     code is evaluated, so a cold isolate serving the sign-in callback starts
 *     in single-digit ms instead of ~150-160ms, staying far under Cloudflare's
 *     ~400ms startup budget (fixes the intermittent Error 1102 on sign-in).
 *   - everything else -> the generated OpenNext worker, imported DYNAMICALLY so
 *     its heavy static imports (next-intl middleware, the Next server bundle)
 *     are only evaluated on the first non-auth request, never during an
 *     auth-only cold start.
 *
 * The OpenNext worker also exports Durable Object classes (DOQueueHandler,
 * DOShardedTagCache, BucketCachePurge). They are only required when bound; this
 * deployment's wrangler.jsonc binds none, so they are intentionally not
 * re-exported here. If DO/queue cache bindings are ever added, re-export those
 * classes from their generated sources (NOT from ./.open-next/worker.js, whose
 * eager imports would defeat the cold-start split).
 */
import { handleAuth, isAuthPath } from "./src/worker/auth";

type OpenNextWorker = {
  default: {
    fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response>;
  };
};

export default {
  async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (isAuthPath(url.pathname)) {
      return handleAuth(request, env, url);
    }
    const mod = (await import("./.open-next/worker.js")) as unknown as OpenNextWorker;
    return mod.default.fetch(request, env, ctx);
  },
};
