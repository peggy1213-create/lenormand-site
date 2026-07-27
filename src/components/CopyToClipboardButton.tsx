"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import Button from "./ds/Button";

const DEFAULT_BUTTON_STYLE: CSSProperties = {
  color: "var(--gold-200)",
  borderColor: "rgba(231,199,137,.45)",
};

// Copies `text` to the clipboard with a brief "copied" confirmation; falls
// back to a select-all modal if the Clipboard API is unavailable (old iOS
// Safari in some contexts).
export default function CopyToClipboardButton({
  text,
  label,
  copiedLabel,
  fallbackTitle,
  fallbackHint,
  selectAllLabel,
  buttonStyle = DEFAULT_BUTTON_STYLE,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  fallbackTitle: string;
  fallbackHint: string;
  selectAllLabel: string;
  buttonStyle?: CSSProperties;
}) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleClick() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setShowFallback(true);
    }
  }

  return (
    <>
      <span style={{ position: "relative", display: "inline-block" }}>
        <Button variant="plain" onClick={handleClick} style={buttonStyle}>
          {label}
        </Button>
        {copied && (
          <span
            role="status"
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 8,
              background: "var(--surface-card)",
              border: "1px solid var(--gold-400)",
              boxShadow: "var(--shadow-md)",
              color: "var(--ink-900)",
              fontFamily: "var(--font-smallcaps)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              fontSize: 11,
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
          >
            <span style={{ color: "var(--gold-300)" }}>✦</span>
            {copiedLabel}
          </span>
        )}
      </span>

      {showFallback && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--surface-overlay)",
            padding: 16,
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              background: "var(--surface-card)",
              border: "1px solid var(--gold-400)",
              borderRadius: 8,
              boxShadow: "var(--shadow-lg)",
              padding: 24,
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                letterSpacing: "var(--tracking-wide)",
                color: "var(--ink-900)",
                margin: 0,
              }}
            >
              {fallbackTitle}
            </h2>
            <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-muted)" }}>{fallbackHint}</p>
            <textarea
              ref={textareaRef}
              readOnly
              value={text}
              style={{
                marginTop: 12,
                height: 200,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 8,
                border: "1px solid var(--border-hair)",
                padding: 10,
                fontSize: 13,
                fontFamily: "var(--font-mono)",
              }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button variant="ghost" onClick={() => textareaRef.current?.select()}>
                {selectAllLabel}
              </Button>
              <Button variant="gilt" onClick={() => setShowFallback(false)}>
                {"✕"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
