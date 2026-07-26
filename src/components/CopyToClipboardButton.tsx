"use client";

import { useRef, useState } from "react";

// Per docs/ai-prompts.md: copies `text` to the clipboard with a brief
// "copied" confirmation; falls back to a select-all modal if the Clipboard
// API is unavailable (old iOS Safari in some contexts).
export default function CopyToClipboardButton({
  text,
  label,
  copiedLabel,
  fallbackTitle,
  fallbackHint,
  selectAllLabel,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  fallbackTitle: string;
  fallbackHint: string;
  selectAllLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleClick() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowFallback(true);
    }
  }

  return (
    <>
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          className="rounded-full bg-rust px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {label}
        </button>
        {copied && (
          <span role="status" className="text-sm text-sage">
            {copiedLabel}
          </span>
        )}
      </span>

      {showFallback && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-cream p-4 shadow-lg">
            <h2 className="font-medium text-ink">{fallbackTitle}</h2>
            <p className="mt-1 text-sm text-muted">{fallbackHint}</p>
            <textarea
              ref={textareaRef}
              readOnly
              value={text}
              className="mt-3 h-48 w-full rounded border border-muted/40 p-2 text-sm"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => textareaRef.current?.select()}
                className="rounded border border-muted/40 px-3 py-1.5 text-sm text-ink"
              >
                {selectAllLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowFallback(false)}
                className="rounded bg-rust px-3 py-1.5 text-sm text-white"
              >
                {"✕"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
