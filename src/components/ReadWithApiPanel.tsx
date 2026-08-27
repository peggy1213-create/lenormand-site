"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import CopyToClipboardButton from "./CopyToClipboardButton";
import MarkdownReading from "./MarkdownReading";
import { streamReading, type ReadingApiErrorCode } from "@/lib/readingApiClient";
import { getLastUsedProvider, getProviderConfig } from "@/lib/apiSettings";
import { updateReadingApiText } from "@/lib/storage";

type PanelState = "streaming" | "done" | "error";

// Streams a reading through the caller's own provider key (via
// src/app/api/reading/route.ts) and renders it progressively, no typewriter
// effect — text simply grows as it arrives. On any failure, the copy-prompt
// fallback is rendered directly below the error message so it stays
// reachable without scrolling back up to the button above this panel. On
// success, the finished markdown is saved onto the matching history entry
// (readingId) so it shows up again on the History page.
export default function ReadWithApiPanel({
  prompt,
  readingId,
}: {
  prompt: string;
  readingId: string | null;
}) {
  const t = useTranslations("draw");
  const locale = useLocale();
  const [text, setText] = useState("");
  const [state, setState] = useState<PanelState>("streaming");
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<ReadingApiErrorCode | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Actually cancels the in-flight request on cleanup — without this, a
    // component remount (e.g. React Strict Mode's dev-only double-invoke of
    // this effect) leaves the first, throwaway attempt's fetch running for
    // real in the background. Both attempts then hit the provider for real,
    // and whichever settles last wins the UI state — so a genuinely
    // successful first response can silently lose to a failing duplicate.
    const controller = new AbortController();
    // Accumulated outside React state — `text` state updates are batched and
    // this closure's own `text` binding never changes, so reading it back
    // inside the .then() below would just see the stale mount-time value.
    let fullText = "";
    setText("");
    setState("streaming");
    setErrorCode(null);

    const provider = getLastUsedProvider();
    const config = provider ? getProviderConfig(provider) : undefined;
    if (!provider || !config) {
      setState("error");
      setErrorCode("network");
      return;
    }

    streamReading(
      { provider, model: config.model, apiKey: config.apiKey, prompt },
      (chunk) => {
        if (cancelled) return;
        fullText += chunk;
        setText((prev) => prev + chunk);
      },
      controller.signal,
    ).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setTokenCount(result.usage.inputTokens + result.usage.outputTokens);
        setState("done");
        if (readingId) updateReadingApiText(readingId, fullText);
      } else {
        setErrorCode(result.error);
        setState("error");
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // Runs once on mount — the provider/model/key snapshot is taken at the
    // moment the panel appears, matching a single reading request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorMessageKey =
    errorCode === "invalid_key"
      ? "apiErrorInvalidKey"
      : errorCode === "rate_limited"
        ? "apiErrorRateLimited"
        : errorCode === "refusal"
          ? "apiErrorRefusal"
          : "apiErrorNetwork";

  return (
    <div
      style={{
        marginTop: "clamp(16px, 3vh, 32px)",
        maxWidth: 640,
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "left",
        background: "rgba(251, 246, 234, 0.06)",
        border: "1px solid rgba(231, 199, 137, 0.28)",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        padding: "clamp(20px, 4vw, 36px)",
      }}
    >
      {state === "streaming" && text.length === 0 && (
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--gold-200)",
            textAlign: "center",
          }}
        >
          {t("readingStreamingLabel")}
        </p>
      )}

      {text.length > 0 && <MarkdownReading text={text} tone="onDark" />}

      {state === "done" && tokenCount !== null && (
        <p
          style={{
            marginTop: 14,
            fontFamily: "var(--font-smallcaps)",
            textTransform: "uppercase",
            letterSpacing: "var(--tracking-wide)",
            fontSize: 11,
            color: "var(--gold-300)",
            textAlign: "right",
          }}
        >
          {t("tokenCountFormat", { count: tokenCount.toLocaleString(locale) })}
        </p>
      )}

      {state === "error" && (
        <div style={{ marginTop: 18, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "var(--gold-200)", marginBottom: 14 }}>
            {t(errorMessageKey)}
          </p>
          <CopyToClipboardButton
            text={prompt}
            label={t("copyPromptButton")}
            copiedLabel={t("copiedToast")}
            fallbackTitle={t("copyFallbackTitle")}
            fallbackHint={t("copyFallbackHint")}
            selectAllLabel={t("selectAllButton")}
          />
        </div>
      )}
    </div>
  );
}
