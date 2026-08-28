"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ApiKeyInput from "./ApiKeyInput";
import { fetchProviderModels, resolveWorkingModel } from "@/lib/readingApiClient";
import {
  getActiveConfig,
  setActiveKey,
  setActiveModel,
  clearActiveConfig,
  detectProvider,
  modelCandidates,
  type ApiProvider,
} from "@/lib/apiSettings";

type CheckState = "idle" | "checking" | "ready" | "failed" | "throttled";

function providerLabelKey(provider: ApiProvider): string {
  return provider === "anthropic"
    ? "providerAnthropic"
    : provider === "openai"
      ? "providerOpenAI"
      : "providerGemini";
}

export default function ApiSettingsForm() {
  const t = useTranslations("settings");
  const [apiKey, setApiKey] = useState("");
  // Derived, not entered: `provider` comes from the saved key's prefix, and
  // `model` is resolved by probing the provider for one its list *and* a real
  // call both accept.
  const [provider, setProvider] = useState<ApiProvider | null>(null);
  const [model, setModel] = useState("");
  const [check, setCheck] = useState<CheckState>("idle");
  // Mirrors the persisted key (set on blur, not per keystroke) so the resolve
  // effect only fires on save.
  const [savedKey, setSavedKey] = useState("");
  // Guards persist() from writing before the stored config has loaded.
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const config = getActiveConfig();
    if (config) {
      setApiKey(config.apiKey);
      setProvider(config.provider);
      setModel(config.model);
      setSavedKey(config.apiKey);
      if (config.verified) setCheck("ready");
    }
    setLoaded(true);
  }, []);

  // Resolve a working model whenever a key is saved. A key whose model was
  // already probe-verified (returning visit) is left alone — no re-probe.
  useEffect(() => {
    if (!savedKey || !provider) return;
    if (getActiveConfig()?.verified) return;

    let cancelled = false;
    const controller = new AbortController();
    setCheck("checking");
    setModel("");

    (async () => {
      const listed = await fetchProviderModels(provider, savedKey, controller.signal);
      if (cancelled) return;
      const candidates = modelCandidates(provider, listed);
      const { model: resolved, verified, rateLimited } = await resolveWorkingModel(
        provider,
        savedKey,
        candidates,
        controller.signal,
      );
      if (cancelled) return;
      setModel(resolved);
      // Persist the best guess either way so the reading screen has something
      // better than a hardcoded default; `verified: false` makes the next
      // visit re-probe instead of trusting it.
      setActiveModel(resolved, verified);
      setCheck(verified ? "ready" : rateLimited ? "throttled" : "failed");
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [provider, savedKey]);

  function updateKey(value: string) {
    setApiKey(value);
    setCheck("idle");
  }

  function persist() {
    if (!loaded) return;
    const trimmed = apiKey.trim();
    if (trimmed) {
      const detected = setActiveKey(trimmed);
      setProvider(detected);
      setSavedKey(detected ? trimmed : "");
      if (!detected) setModel("");
    } else {
      clearActiveConfig();
      setProvider(null);
      setSavedKey("");
      setModel("");
    }
  }

  // Live prefix check while typing — no need to wait for blur/save.
  const liveProvider = detectProvider(apiKey);
  const keyEntered = apiKey.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div onBlurCapture={persist}>
        <label htmlFor="settings-api-key" style={fieldLabelStyle()}>
          {t("apiKeyLabel")}
        </label>
        <ApiKeyInput
          id="settings-api-key"
          value={apiKey}
          onChange={updateKey}
          placeholder={t("apiKeyPlaceholder")}
          showLabel={t("showKeyLabel")}
          hideLabel={t("hideKeyLabel")}
        />
        {keyEntered && liveProvider && (
          <p style={{ ...helpTextStyle(), color: "var(--moss-500)" }}>
            {t("providerDetectedFormat", { provider: t(providerLabelKey(liveProvider)) })}
          </p>
        )}
        {keyEntered && !liveProvider && (
          <p style={{ ...helpTextStyle(), color: "var(--status-danger)" }}>
            {t("providerUnrecognizedHint")}
          </p>
        )}
        <p style={helpTextStyle()}>{t("apiKeyHelp")}</p>
      </div>

      {provider && check !== "idle" && (
        <div>
          {check === "checking" && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              {t("keyCheckingLabel")}
            </p>
          )}
          {check === "ready" && (
            <p style={{ fontSize: 13, color: "var(--moss-500)", margin: 0 }}>
              ✓ {t("keyReadyFormat", { model })}
            </p>
          )}
          {check === "failed" && (
            <p style={{ fontSize: 13, color: "var(--status-danger)", margin: 0 }}>
              ✗ {t("keyFailedLabel")}
            </p>
          )}
          {check === "throttled" && (
            <p style={{ fontSize: 13, color: "var(--gold-500)", margin: 0 }}>
              {t("keyThrottledLabel")}
            </p>
          )}
          <p style={{ ...helpTextStyle(), margin: "6px 0 0" }}>{t("checkCostNote")}</p>
        </div>
      )}

      <div
        style={{
          marginTop: 4,
          paddingTop: 20,
          borderTop: "1px solid var(--border-hair)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-smallcaps)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            fontSize: 11,
            color: "var(--gold-500)",
            margin: "0 0 8px",
          }}
        >
          {t("privacyDisclosureTitle")}
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-subtle)", margin: 0 }}>
          {t("privacyDisclosureBody")}
        </p>
      </div>
    </div>
  );
}

function fieldLabelStyle(): React.CSSProperties {
  return {
    display: "block",
    fontFamily: "var(--font-smallcaps)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wide)",
    fontSize: 11,
    color: "var(--text-muted)",
    marginBottom: 6,
  };
}

function helpTextStyle(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "var(--text-subtle)",
    margin: "6px 0 0",
  };
}
