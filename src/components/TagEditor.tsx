"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import {
  updateReadingTags,
  getAllTags,
  MAX_TAGS_PER_READING,
  MAX_DISTINCT_TAGS,
} from "@/lib/storage";

function TagIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function tagChipStyle(removable: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: removable ? "3px 6px 3px 10px" : "3px 10px",
    borderRadius: 999,
    border: "1px solid var(--gold-400)",
    background: "var(--gilt-soft)",
    color: "var(--ink-900)",
    fontFamily: "var(--font-smallcaps)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-wide)",
    fontSize: 10,
    whiteSpace: "nowrap",
  };
}

/**
 * The tag button + popover kept with a saved reading. Used both in the history
 * list (compact, on a light card) and in the draw flow's dark overlay after a
 * spread is saved — `tone` switches the trigger's colours between the two.
 */
export default function TagEditor({
  readingId,
  initialTags,
  onChanged,
  tone = "light",
  triggerLabel,
}: {
  readingId: string;
  initialTags: string[];
  onChanged?: () => void;
  tone?: "light" | "dark";
  triggerLabel?: string;
}) {
  const h = useTranslations("history");

  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [panelShift, setPanelShift] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!popoverOpen) {
      setPanelShift(0);
      return;
    }
    inputRef.current?.focus();
    // The panel is anchored to the tag button via `left: 0`, but that button can
    // sit anywhere along the row — on narrow screens the panel can run past the
    // right (or, rarely, left) edge of the viewport, so nudge it back into view
    // after it mounts at its natural position.
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    const overflowRight = rect.right + margin - window.innerWidth;
    const overflowLeft = margin - rect.left;
    if (overflowRight > 0) {
      setPanelShift(-overflowRight);
    } else if (overflowLeft > 0) {
      setPanelShift(overflowLeft);
    }
  }, [popoverOpen]);

  useEffect(() => {
    if (!popoverOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [popoverOpen]);

  function addTagValue(value: string) {
    if (!value || tags.length >= MAX_TAGS_PER_READING || tags.includes(value)) return;
    const allTags = getAllTags();
    if (!allTags.includes(value) && allTags.length >= MAX_DISTINCT_TAGS) return;
    const next = [...tags, value];
    setTags(next);
    updateReadingTags(readingId, next);
    onChanged?.();
  }

  function handleAddTag() {
    addTagValue(tagInput.trim());
    setTagInput("");
  }

  function handleSelectExistingTag(tag: string) {
    addTagValue(tag);
    setTagInput("");
    inputRef.current?.focus();
  }

  function handleRemoveTag(tag: string) {
    const next = tags.filter((existing) => existing !== tag);
    setTags(next);
    updateReadingTags(readingId, next);
    onChanged?.();
  }

  const allTags = getAllTags();
  const unusedTags = allTags.filter((tag) => !tags.includes(tag));
  const canAddMoreTags =
    tags.length < MAX_TAGS_PER_READING &&
    (allTags.length < MAX_DISTINCT_TAGS || unusedTags.length > 0);

  const dark = tone === "dark";
  const emptyColor = dark ? "var(--gold-200)" : "var(--text-subtle)";
  const filledColor = dark ? "var(--gold-200)" : "var(--gold-500)";

  // In the draw flow (dark overlay) the trigger sits among the other action
  // buttons, so it takes a matching pill; in the history list it's a bare inline
  // control next to the date and note icons.
  const triggerStyle: CSSProperties = dark
    ? {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        padding: "12px 26px",
        borderRadius: 8,
        border: "1px solid rgba(231,199,137,.45)",
        background: "transparent",
        color: tags.length > 0 ? "var(--gold-200)" : "var(--gold-200)",
        fontFamily: "var(--font-smallcaps)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-caps)",
        fontSize: 12,
        whiteSpace: "nowrap",
      }
    : {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: tags.length > 0 ? filledColor : emptyColor,
        fontFamily: "var(--font-smallcaps)",
        textTransform: "uppercase",
        letterSpacing: "var(--tracking-wide)",
        fontSize: 11,
      };

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      <button
        type="button"
        aria-label={tags.length > 0 ? h("viewTagsTooltip") : h("addTagsTooltip")}
        title={tags.length > 0 ? h("viewTagsTooltip") : h("addTagsTooltip")}
        onClick={(e) => {
          e.stopPropagation();
          setPopoverOpen((v) => !v);
        }}
        style={triggerStyle}
      >
        {(dark || tags.length === 0) && <TagIcon />}
        {tags.length > 0
          ? tags.map((tag) => (
              <span key={tag} style={tagChipStyle(false)}>
                {tag}
              </span>
            ))
          : triggerLabel && (
              <span style={{ display: "inline-flex", alignItems: "center", minHeight: 22 }}>
                {triggerLabel}
              </span>
            )}
      </button>

      {popoverOpen && (
        <div
          ref={panelRef}
          style={{
            position: "absolute",
            // In the draw flow the trigger sits near the bottom of the overlay,
            // so the panel opens upward; in the history list it opens downward.
            ...(dark ? { bottom: "100%", marginBottom: 8 } : { top: "100%", marginTop: 8 }),
            left: 0,
            transform: panelShift ? `translateX(${panelShift}px)` : undefined,
            zIndex: 6,
            width: 260,
            maxWidth: "80vw",
            background: "var(--surface-card)",
            border: "1px solid var(--border-hair)",
            borderRadius: 8,
            boxShadow: "var(--shadow-md)",
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-smallcaps)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {h("tagsLabel")}
            </span>
            <button
              type="button"
              aria-label={h("closeTagsPopover")}
              title={h("closeTagsPopover")}
              onClick={() => setPopoverOpen(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <CloseIcon />
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {tags.map((tag) => (
              <span key={tag} style={tagChipStyle(true)}>
                {tag}
                <button
                  type="button"
                  aria-label={h("removeTagLabel")}
                  title={h("removeTagLabel")}
                  onClick={() => handleRemoveTag(tag)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 14,
                    height: 14,
                    padding: 0,
                    border: "none",
                    borderRadius: "50%",
                    background: "transparent",
                    color: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <CloseIcon />
                </button>
              </span>
            ))}
            {canAddMoreTags ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder={h("addTagPlaceholder")}
                  maxLength={24}
                  autoComplete="off"
                  style={{
                    flex: "1 1 120px",
                    minWidth: 100,
                    border: "none",
                    borderBottom: "1px solid var(--border-hair)",
                    background: "transparent",
                    padding: "3px 2px",
                    fontFamily: "var(--font-serif)",
                    fontSize: 13,
                    color: "var(--text-body)",
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  style={{
                    cursor: tagInput.trim() ? "pointer" : "not-allowed",
                    padding: "4px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border-hair)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-caps)",
                    fontSize: 11,
                    whiteSpace: "nowrap",
                    opacity: tagInput.trim() ? 1 : 0.5,
                  }}
                >
                  {h("addTagButton")}
                </button>
              </>
            ) : (
              <span style={{ fontSize: 12, fontStyle: "italic", color: "var(--text-subtle)" }}>
                {h("maxTagsReached")}
              </span>
            )}
          </div>

          {canAddMoreTags && unusedTags.length > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-hair)" }}>
              <div
                style={{
                  fontFamily: "var(--font-smallcaps)",
                  textTransform: "uppercase",
                  letterSpacing: "var(--tracking-wide)",
                  fontSize: 10,
                  color: "var(--text-subtle)",
                  marginBottom: 6,
                }}
              >
                {h("existingTagsLabel")}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {unusedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectExistingTag(tag)}
                    style={{
                      ...tagChipStyle(false),
                      cursor: "pointer",
                      border: "1px dashed var(--gold-400)",
                      background: "transparent",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
