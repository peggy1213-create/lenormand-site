"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ApiKeyInput from "./ApiKeyInput";
import { streamReading } from "@/lib/readingApiClient";
import {
  getProviderConfig,
  setProviderConfig,
  clearProviderConfig,
  type ApiProvider,
  type ProviderConfig,
} from "@/lib/apiSettings";

const PROVIDERS: ApiProvider[] = ["anthropic", "openai", "gemini"];
const EMPTY_CONFIG: ProviderConfig = { apiKey: "", model: "" };

type TestState = "idle" | "testing" | "success" | "failure";

export default function ApiSettingsForm() {
  const t = useTranslations("settings");
  const [provider, setProvider] = useState<ApiProvider>("anthropic");
  const [drafts, setDrafts] = useState<Record<ApiProvider, ProviderConfig>>({
    anthropic: EMPTY_CONFIG,
    openai: EMPTY_CONFIG,
    gemini: EMPTY_CONFIG,
  });
  const [testState, setTestState] = useState<TestState>("idle");

  useEffect(() => {
    setDrafts({
      anthropic: getProviderConfig("anthropic") ?? EMPTY_CONFIG,
      openai: getProviderConfig("openai") ?? EMPTY_CONFIG,
      gemini: getProviderConfig("gemini") ?? EMPTY_CONFIG,
    });
  }, []);

  const draft = drafts[provider];

  function updateDraft(patch: Partial<ProviderConfig>) {
    setDrafts((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));
    setTestState("idle");
  }

  function persist() {
    if (draft.apiKey.trim()) {
      setProviderConfig(provider, draft);
    } else {
      clearProviderConfig(provider);
    }
  }

  async function handleTest() {
    if (!draft.apiKey.trim() || !draft.model.trim()) return;
    setTestState("testing");
    const result = await streamReading(
      {
        provider,
        model: draft.model.trim(),
        apiKey: draft.apiKey.trim(),
        prompt: "Reply with OK.",
        maxOutputTokens: 16,
      },
      () => {},
    );
    setTestState(result.ok ? "success" : "failure");
  }

  const modelPlaceholder =
    provider === "anthropic" ? t("modelPlaceholderAnthropic") : t("modelPlaceholderOther");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <label htmlFor="settings-provider" style={fieldLabelStyle()}>
          {t("providerLabel")}
        </label>
        <select
          id="settings-provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value as ApiProvider);
            setTestState("idle");
          }}
          style={selectStyle()}
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {t(
                p === "anthropic"
                  ? "providerAnthropic"
                  : p === "openai"
                    ? "providerOpenAI"
                    : "providerGemini",
              )}
            </option>
          ))}
        </select>
      </div>

      <div onBlurCapture={persist}>
        <label htmlFor="settings-api-key" style={fieldLabelStyle()}>
          {t("apiKeyLabel")}
        </label>
        <ApiKeyInput
          id="settings-api-key"
          value={draft.apiKey}
          onChange={(v) => updateDraft({ apiKey: v })}
          placeholder={t("apiKeyPlaceholder")}
          showLabel={t("showKeyLabel")}
          hideLabel={t("hideKeyLabel")}
        />
        <p style={helpTextStyle()}>{t("apiKeyHelp")}</p>
      </div>

      <div>
        <label htmlFor="settings-model" style={fieldLabelStyle()}>
          {t("modelLabel")}
        </label>
        <input
          id="settings-model"
          type="text"
          value={draft.model}
          onChange={(e) => updateDraft({ model: e.target.value })}
          onBlur={persist}
          placeholder={modelPlaceholder}
          autoComplete="off"
          spellCheck={false}
          style={textInputStyle()}
        />
        <p style={helpTextStyle()}>{t("modelHelp")}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
        <button
          type="button"
          onClick={handleTest}
          disabled={!draft.apiKey.trim() || !draft.model.trim() || testState === "testing"}
          style={testButtonStyle(!draft.apiKey.trim() || !draft.model.trim())}
        >
          {t("testButton")}
        </button>
        <p style={{ ...helpTextStyle(), margin: 0 }}>{t("testCostNote")}</p>
        {testState === "testing" && (
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>…</span>
        )}
        {testState === "success" && (
          <span style={{ fontSize: 13, color: "var(--moss-500)" }}>✓ {t("testSuccessToast")}</span>
        )}
        {testState === "failure" && (
          <span style={{ fontSize: 13, color: "var(--status-danger)" }}>✗ {t("testFailureToast")}</span>
        )}
      </div>

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

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--border-hair)",
    borderRadius: 6,
    background: "var(--surface-raised)",
    padding: "9px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    color: "var(--text-body)",
    cursor: "pointer",
  };
}

function textInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--border-hair)",
    borderRadius: 6,
    background: "var(--surface-raised)",
    padding: "9px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    color: "var(--text-body)",
  };
}

function testButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: "1px solid var(--gold-400)",
    borderRadius: 999,
    background: disabled ? "transparent" : "var(--surface-raised)",
    color: disabled ? "var(--text-subtle)" : "var(--ink-900)",
    padding: "8px 20px",
    fontFamily: "var(--font-smallcaps)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wide)",
    fontSize: 12,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}
