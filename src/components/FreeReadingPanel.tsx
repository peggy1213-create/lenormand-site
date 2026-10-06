"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import MarkdownReading from "./MarkdownReading";
import { streamFreeReading, type FreeReadingErrorCode } from "@/lib/readingApiClient";
import { useReadings } from "@/components/ReadingsProvider";
import posthog from "posthog-js";

type PanelState = "streaming" | "done" | "error";

function errorMessageKey(code: FreeReadingErrorCode | null): string {
  if (code === "captcha") return "freeErrorCaptcha";
  if (code === "limit") return "freeErrorLimit";
  if (code === "global_limit") return "freeErrorGlobalLimit";
  return "freeReadingError";
}

// Streams a free (no-key) reading from the unified Workers AI tier
// (src/app/api/reading/free/route.ts). Signed-in users get the higher daily
// cap; anonymous users the lower one — the server decides which applies from
// their session. Remaining daily uses are reported back through onRemaining
// the moment the response header arrives.
export default function FreeReadingPanel({
  prompt,
  readingId,
  signedIn,
  onRemaining,
}: {
  prompt: string;
  readingId: string | null;
  signedIn: boolean;
  onRemaining: (remaining: number | null) => void;
}) {
  const t = useTranslations("draw");
  const { updateApiText } = useReadings();
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

    (async () => {
      const result = await streamFreeReading(
        { prompt },
        (chunk) => {
          if (cancelled) return;
          fullText += chunk;
          setText((prev) => prev + chunk);
        },
        controller.signal,
        onRemaining,
      );
      if (cancelled) return;
      if (result.ok) {
        posthog.capture("free_ai_reading_completed", { tier: signedIn ? "auth" : "anon" });
        setState("done");
        if (readingId) updateApiText(readingId, fullText);
      } else {
        setErrorCode(result.error);
        setState("error");
      }
    })();

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
