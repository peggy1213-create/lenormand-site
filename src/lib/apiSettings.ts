import { isStoragePersistable } from "./storage";

export type ApiProvider = "anthropic" | "openai" | "gemini";

// One active configuration at a time. The provider is derived from the key's
// own prefix (see detectProvider), and the model is chosen automatically by
// probing what the key can actually use (see modelCandidates +
// resolveWorkingModel) — neither is a field the user fills in, so there's no
// per-provider store to keep any more.
export type ActiveConfig = {
  provider: ApiProvider;
  apiKey: string;
  model: string;
  // Whether `model` was confirmed by a probe (see resolveWorkingModel). When
  // false, the settings form re-probes on the next visit rather than trusting
  // the stored value.
  verified: boolean;
};

const STORAGE_KEY = "lenormand.apiSettings";

// Last-resort model per provider, used only when the models listing came back
// empty (some keys can't list). Any of these can still be wrong for a given
// key/tier — that surfaces as the normal "key didn't work" path with the
// copy-prompt fallback, same as the no-model-selection sites accept.
export const DEFAULT_MODELS: Record<ApiProvider, string> = {
  anthropic: "claude-opus-5",
  openai: "gpt-4o",
  gemini: "gemini-2.5-flash",
};

// OpenAI's model names don't sort by recency, so rank by family instead —
// earlier entries score higher. Anything unmatched scores 0 and falls back
// to the listing's own order.
const OPENAI_TIERS: RegExp[] = [
  /^gpt-5/,
  /^gpt-4\.1/,
  /^gpt-4o/,
  /^o4/,
  /^o3/,
  /^gpt-4-turbo/,
  /^gpt-4/,
];

// Higher is preferred. Scoring is version-aware rather than a hardcoded model
// list, so it keeps working as providers ship new versions:
//   Gemini    — newest version wins; flash over pro (the reading route sets
//               thinkingBudget: 0, which the pro tiers don't always allow),
//               full over -lite/-8b.
//   Anthropic — models.list is already newest-first, so this only nudges
//               sonnet/opus above haiku; a stable sort keeps recency within
//               a tier.
//   OpenAI    — family rank from OPENAI_TIERS.
function scoreModel(provider: ApiProvider, id: string): number {
  if (provider === "gemini") {
    const m = id.match(/^gemini-(\d+)(?:\.(\d+))?-(flash|pro)(-lite|-8b)?$/);
    if (!m) return -1;
    const version = parseInt(m[1], 10) * 100 + (m[2] ? parseInt(m[2], 10) : 0);
    const kind = m[3] === "flash" ? 2 : 1;
    const full = m[4] ? 0 : 1;
    return version * 10 + kind * 3 + full;
  }
  if (provider === "anthropic") {
    if (/sonnet/i.test(id)) return 3;
    if (/opus/i.test(id)) return 2;
    if (/haiku/i.test(id)) return 1;
    return 0;
  }
  const tier = OPENAI_TIERS.findIndex((re) => re.test(id));
  return tier === -1 ? 0 : OPENAI_TIERS.length - tier;
}

// Provider is inferred from the key prefix — the three supported providers
// each use distinct ones:
//   Anthropic  sk-ant-…
//   Gemini     AIza…  (classic AI Studio keys)  or  AQ.…  (newer key format)
//   OpenAI     sk-… / sk-proj-… / sk-svcacct-…  (any sk- that isn't sk-ant-)
// Order matters: sk-ant- must be tested before the bare sk- catch. Returns
// null for anything unrecognized (Azure, OpenAI-compatible third parties,
// custom proxies) — those are out of scope for this feature.
export function detectProvider(apiKey: string): ApiProvider | null {
  const key = apiKey.trim();
  if (!key) return null;
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza") || key.startsWith("AQ.")) return "gemini";
  if (key.startsWith("sk-")) return "openai";
  return null;
}

// Ranks the models the key exposes, best-first, with the provider default
// appended as a last resort. `available` comes from the provider's own
// listing via /api/models — but that listing is not trustworthy on its own
// (it returns retired models that 404, and models with no free-tier quota
// that 429), so the caller probes this list in order and takes the first
// that actually completes a call. A stable sort keeps listing order for
// equal scores, which is newest-first for Anthropic.
export function modelCandidates(provider: ApiProvider, available: string[]): string[] {
  const ranked = [...available].sort(
    (a, b) => scoreModel(provider, b) - scoreModel(provider, a),
  );
  if (!ranked.includes(DEFAULT_MODELS[provider])) ranked.push(DEFAULT_MODELS[provider]);
  return ranked;
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function isProvider(value: unknown): value is ApiProvider {
  return value === "anthropic" || value === "openai" || value === "gemini";
}

function readConfig(): ActiveConfig | undefined {
  if (!hasWindow()) return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;

    // Current shape: { provider, apiKey, model, verified }.
    if (
      isProvider(parsed.provider) &&
      typeof parsed.apiKey === "string" &&
      parsed.apiKey.trim()
    ) {
      return {
        provider: parsed.provider,
        apiKey: parsed.apiKey,
        model: typeof parsed.model === "string" ? parsed.model : "",
        verified: parsed.verified === true,
      };
    }

    // Legacy shape: { anthropic?, openai?, gemini?, lastUsedProvider? }.
    // Migrate the one usable entry across so an existing key isn't lost.
    const legacyProvider = isProvider(parsed.lastUsedProvider)
      ? parsed.lastUsedProvider
      : (["anthropic", "openai", "gemini"] as ApiProvider[]).find(
          (p) => parsed[p]?.apiKey,
        );
    if (legacyProvider && typeof parsed[legacyProvider]?.apiKey === "string") {
      return {
        provider: legacyProvider,
        apiKey: parsed[legacyProvider].apiKey,
        // The old model came from a free-text field or the old picker — force
        // a re-probe rather than trust it.
        model: "",
        verified: false,
      };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function writeConfig(config: ActiveConfig | null): void {
  if (!hasWindow()) return;
  try {
    if (config) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Private-mode / quota — nothing to do; getActiveConfig just returns
    // undefined and the reading screen keeps the copy-prompt fallback.
  }
}

export { isStoragePersistable };

export function getActiveConfig(): ActiveConfig | undefined {
  return readConfig();
}

// Stores the key and the provider its prefix implies. Returns the detected
// provider, or null if the key isn't recognizable (in which case any previous
// config is cleared, so the reading screen falls back to copy-prompt).
// A model already resolved for the exact same key is kept; any key change
// clears it so the settings form probes again.
export function setActiveKey(apiKey: string): ApiProvider | null {
  const trimmed = apiKey.trim();
  const provider = detectProvider(trimmed);
  if (!provider) {
    writeConfig(null);
    return null;
  }
  const existing = readConfig();
  // Keep the resolved model only when the exact same key is re-saved — a
  // changed key (even for the same provider) needs a fresh probe, since a
  // different account/tier can serve a different set of models.
  const sameKey =
    !!existing && existing.provider === provider && existing.apiKey === trimmed;
  writeConfig({
    provider,
    apiKey: trimmed,
    model: sameKey ? existing.model : "",
    verified: sameKey ? existing.verified : false,
  });
  return provider;
}

export function setActiveModel(model: string, verified: boolean): void {
  const existing = readConfig();
  if (!existing) return;
  writeConfig({ ...existing, model, verified });
}

export function clearActiveConfig(): void {
  writeConfig(null);
}

// True once a recognizable key is stored. The model may not be resolved yet
// (the settings form fills it in asynchronously) — the reading screen falls
// back to DEFAULT_MODELS in that window, so the key alone is enough to offer
// the "Read with your API" button.
export function hasAnyProviderConfigured(): boolean {
  return readConfig() !== undefined;
}
