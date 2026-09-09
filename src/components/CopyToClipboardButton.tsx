"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Button from "./ds/Button";

const DEFAULT_BUTTON_STYLE: CSSProperties = {
  cursor: "pointer",
  padding: "12px 26px",
  borderRadius: 8,
  border: "1px solid rgba(231,199,137,.45)",
  background: "transparent",
  color: "var(--gold-200)",
  fontFamily: "var(--font-smallcaps)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-caps)",
  fontSize: 12,
  whiteSpace: "nowrap",
  transition: "background var(--dur-med) var(--ease-out-soft)",
};

const PASTE_TARGETS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Claude", href: "https://claude.ai/new" },
  { label: "ChatGPT", href: "https://chatgpt.com/" },
  { label: "Gemini", href: "https://gemini.google.com/app" },
];

// Copies `text` to the clipboard, then surfaces one-click links to paste the
// prompt into Claude, ChatGPT, or Gemini. Falls back to a select-all modal
// when the Clipboard API is unavailable (old iOS Safari in some contexts).
export default function CopyToClipboardButton({
  text,
  label,
  copiedLabel,
  pasteIntoLabel,
  fallbackTitle,
  fallbackHint,
  selectAllLabel,
  buttonStyle = DEFAULT_BUTTON_STYLE,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  pasteIntoLabel: string;
  fallbackTitle: string;
  fallbackHint: string;
  selectAllLabel: string;
  buttonStyle?: CSSProperties;
}) {
  const [copied, setCopied] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleClick() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setJustCopied(true);
    } catch {
      setShowFallback(true);
    }
  }

  useEffect(() => {
    if (!justCopied) return;
    const timer = window.setTimeout(() => setJustCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [justCopied]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 10000);
    const onDocMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setCopied(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDocMouseDown);
    };
  }, [copied]);

  return (
    <>
      <span
        ref={popoverRef}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button type="button" onClick={handleClick} style={buttonStyle}>
          {justCopied ? copiedLabel : label}
        </button>
        {copied && (
          <span
            role="status"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ color: "var(--moss-100)" }}>{pasteIntoLabel}</span>
            {PASTE_TARGETS.map((target, i) => (
              <span key={target.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <a
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setCopied(false)}
                  style={{
                    color: "var(--gold-200)",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  {target.label}
                </a>
                {i < PASTE_TARGETS.length - 1 && (
                  <span aria-hidden="true" style={{ color: "var(--moss-100)" }}>
                    ·
                  </span>
                )}
              </span>
            ))}
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
