"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import MarkdownReading from "./MarkdownReading";
import type { SpreadId } from "@/data/spreads";
import {
  streamFreeReading,
  incrementLocalFreeReadingCount,
  type FreeReadingErrorCode,
} from "@/lib/freeReadingClient";
import { updateReadingApiText } from "@/lib/storage";
import posthog from "posthog-js";

type PanelState = "streaming" | "done" | "error";

function errorMessageKey(code: FreeReadingErrorCode | null): string {
  if (code === "daily_limit_reached") return "freeReadingLimitReached";
  if (code === "spread_not_allowed") return "freeReadingSpreadLocked";
  return "freeReadingError";
}

export default function FreeReadingPanel({
  prompt,
  spread,
  readingId,
}: {
  prompt: string;
  spread: SpreadId;
  readingId: string | null;
}) {
  const t = useTranslations("draw");
  const [text, setText] = useState("");
  const [state, setState] = useState<PanelState>("streaming");
  const [errorCode, setErrorCode] = useState<FreeReadingErrorCode | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let fullText = "";
    setText("");
    setState("streaming");
    setErrorCode(null);

    streamFreeReading(
      { spread, prompt },
      (chunk) => {
        if (cancelled) return;
        fullText += chunk;
        setText((prev) => prev + chunk);
      },
      controller.signal,
    ).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        posthog.capture("free_ai_reading_completed", { spread });
        setState("done");
        incrementLocalFreeReadingCount();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "error") {
    return (
      <p
        style={{
          marginTop: "clamp(16px, 3vh, 32px)",
          maxWidth: 640,
          marginLeft: "auto",
          marginRight: "auto",
          fontSize: 14,
          color: "var(--gold-200)",
          textAlign: "center",
        }}
      >
        {t(errorMessageKey(errorCode))}
      </p>
    );
  }

  return (
    <div
      style={{
        marginTop: "clamp(16px, 3vh, 32px)",
        maxWidth: 640,
        marginLeft: "auto",
        marginRight: "auto",
        textAlign: "left",
        background: "rgba(18, 26, 16, 0.55)",
        border: "1px solid rgba(231, 199, 137, 0.35)",
        borderRadius: 12,
        boxShadow: "var(--shadow-md)",
        padding: "clamp(20px, 4vw, 36px)",
        backdropFilter: "blur(2px)",
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

    </div>
  );
}
