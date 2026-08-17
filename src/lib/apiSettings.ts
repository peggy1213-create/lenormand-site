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

export function getLastUsedProvider(): ApiProvider | undefined {
  const settings = readSettings();
  if (settings.lastUsedProvider && settings[settings.lastUsedProvider]) {
    return settings.lastUsedProvider;
  }
  // Fall back to whichever provider has a stored config, if the recorded
  // last-used provider's config was since cleared.
  const providers: ApiProvider[] = ["anthropic", "openai", "gemini"];
  return providers.find((p) => settings[p]);
}

export function hasAnyProviderConfigured(): boolean {
  return getLastUsedProvider() !== undefined;
}
