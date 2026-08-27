import { isStoragePersistable } from "./storage";

export type ApiProvider = "anthropic" | "openai" | "gemini";

export type ProviderConfig = {
  apiKey: string;
  model: string;
};

type ApiSettings = {
  anthropic?: ProviderConfig;
  openai?: ProviderConfig;
  gemini?: ProviderConfig;
  lastUsedProvider?: ApiProvider;
};

const STORAGE_KEY = "lenormand.apiSettings";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readSettings(): ApiSettings {
  if (!hasWindow()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(settings: ApiSettings): boolean {
  if (!hasWindow()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export { isStoragePersistable };

export function getApiSettings(): ApiSettings {
  return readSettings();
}

export function getProviderConfig(provider: ApiProvider): ProviderConfig | undefined {
  return readSettings()[provider];
}

// Writes the config for `provider` and marks it as the provider the reading
// screen's "Read with your API" button defaults to, since that's the moment
// the user has just confirmed they intend to use it.
export function setProviderConfig(provider: ApiProvider, config: ProviderConfig): void {
  const next = { ...readSettings(), [provider]: config, lastUsedProvider: provider };
  writeSettings(next);
}

export function clearProviderConfig(provider: ApiProvider): void {
  const next = { ...readSettings() };
  delete next[provider];
  if (next.lastUsedProvider === provider) delete next.lastUsedProvider;
  writeSettings(next);
}

// A provider only counts as usable once both fields are filled — a saved
// key with no model (or vice versa) would otherwise pass this check, show
// the "Read with your API" button, and then fail with a generic proxy error
// that gives no hint the actual problem is a missing field back in Settings.
function isConfigComplete(config: ProviderConfig | undefined): config is ProviderConfig {
  return !!config && config.apiKey.trim().length > 0 && config.model.trim().length > 0;
}

export function getLastUsedProvider(): ApiProvider | undefined {
  const settings = readSettings();
  if (settings.lastUsedProvider && isConfigComplete(settings[settings.lastUsedProvider])) {
    return settings.lastUsedProvider;
  }
  // Fall back to whichever provider has a complete stored config, if the
  // recorded last-used provider's config was since cleared or incomplete.
  const providers: ApiProvider[] = ["anthropic", "openai", "gemini"];
  return providers.find((p) => isConfigComplete(settings[p]));
}

export function hasAnyProviderConfigured(): boolean {
  return getLastUsedProvider() !== undefined;
}
