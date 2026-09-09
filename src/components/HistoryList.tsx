"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getHistory,
  isStoragePersistable,
  updateReadingNote,
  deleteReadings,
  getAllTags,
  type Reading,
} from "@/lib/storage";
import { getCardById } from "@/data/cards";
import { getSpread } from "@/data/spreads";
import { buildAIPrompt } from "@/lib/prompt";
import { exportReadingAsJpeg } from "@/lib/exportImage";
import CardKeywordsPanel from "./CardKeywordsPanel";
import CopyToClipboardButton from "./CopyToClipboardButton";
import MarkdownReading from "./MarkdownReading";
import TagEditor from "./TagEditor";
import styles from "./HistoryList.module.css";

const NOTICE_SEEN_KEY = "lenormand.historyNoticeSeen";
const PAGE_SIZE = 10;
const DAILY_TAG_VALUE = "__daily__";

function PencilIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function NotebookPenIcon() {
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
      <path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4" />
      <path d="M2 6h4" />
      <path d="M2 10h4" />
      <path d="M2 14h4" />
      <path d="M2 18h4" />
      <path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
    </svg>
  );
}

function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function pillStyle(tone: "gilt" | "ghost" | "danger"): CSSProperties {
  const borderColor =
    tone === "gilt" ? "var(--gold-400)" : tone === "danger" ? "var(--status-danger)" : "var(--border-hair)";
  return {
    cursor: "pointer",
    padding: "9px 18px",
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: tone === "gilt" ? "var(--gilt-soft)" : "transparent",
    color: tone === "gilt" ? "var(--ink-900)" : tone === "danger" ? "var(--status-danger)" : "var(--text-muted)",
    fontFamily: "var(--font-smallcaps)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-caps)",
    fontSize: 11,
    whiteSpace: "nowrap",
  };
}

function toolbarSegmentStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "0 14px",
    height: 34,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "var(--text-muted)",
    fontFamily: "var(--font-smallcaps)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-caps)",
    fontSize: 11,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

function ToolbarDivider() {
  return <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", background: "var(--border-hair)", flexShrink: 0 }} />;
}

// zh-TW's default Intl date/time style ("2026年7月27日 晚上9:42") is replaced
// with a numeric date ("2026/07/27") and an English-style AM/PM time
// ("9:42 PM", matching the English UI) rather than the localized "晚上9:42".
const zhTWDatePart = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
const zhTWTimePart = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

export type ReadingDateFormatter = { format: (date: Date) => string };

export function makeReadingDateFormatter(locale: string): ReadingDateFormatter {
  if (locale === "zh-TW") {
    return { format: (date: Date) => `${zhTWDatePart.format(date)} ${zhTWTimePart.format(date)}` };
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
}

export default function HistoryList() {
  const locale = useLocale();
  const h = useTranslations("history");
  const t = useTranslations("draw");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");

  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [persistable, setPersistable] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [page, setPage] = useState(1);
  const [tagFilter, setTagFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function refresh() {
    const list = [...getHistory()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setReadings(list);
    setSelectedIds((prev) => {
      const ids = new Set(list.map((r) => r.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredReadings.map((r) => r.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
    setConfirmingBulkDelete(false);
  }

  function clearFilters() {
    setTagFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function handleBulkDelete() {
    deleteReadings(Array.from(selectedIds));
    selectNone();
    refresh();
  }

  useEffect(() => {
    refresh();
    setPersistable(isStoragePersistable());
    try {
      const seen = window.localStorage.getItem(NOTICE_SEEN_KEY);
      if (!seen) {
        setShowNotice(true);
        window.localStorage.setItem(NOTICE_SEEN_KEY, "1");
      }
    } catch {
      setShowNotice(true);
    }
  }, []);

  const dateFormatter = makeReadingDateFormatter(locale);

  const allTags = getAllTags();
  const filteredReadings = (readings ?? []).filter((r) => {
    if (tagFilter === DAILY_TAG_VALUE) {
      if (r.spread !== "daily") return false;
    } else if (tagFilter && !(r.tags ?? []).includes(tagFilter)) {
      return false;
    }
    if (dateFrom && new Date(r.createdAt) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo && new Date(r.createdAt) > new Date(`${dateTo}T23:59:59.999`)) return false;
    return true;
  });
  const filtersActive = !!tagFilter || !!dateFrom || !!dateTo;

  const totalPages = Math.max(1, Math.ceil(filteredReadings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedReadings = filteredReadings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleExport() {
    const selected = (readings ?? []).filter((reading) => selectedIds.has(reading.id));
    const blocks = selected.map((reading) => {
      let spreadName: string;
      let positionLabels: string[];
      try {
        const spread = getSpread(reading.spread);
        positionLabels = spread.positionKeys.map((key) => s(key.replace(/^spread\./, "")));
        spreadName = s(`${reading.spread}.name`);
      } catch {
        positionLabels = reading.cards.map((_, i) => `#${i + 1}`);
        spreadName = reading.spread;
      }

      const cardLines = reading.cards
        .map((c, i) => `- ${positionLabels[i]} — ${cardsT(`${getCardById(c.cardId).slug}.name`)}`)
        .join("\n");

      const lines = [
        `### ${spreadName} — ${dateFormatter.format(new Date(reading.createdAt))}`,
        "",
        reading.question ? `#### *"${reading.question}"*` : `#### *${h("questionPreviewNone")}*`,
        "",
        cardLines,
      ];
      if (reading.notes) {
        lines.push("", `### ${t("noteLabel")}: `, reading.notes);
      }
      return lines.join("\n");
    });

    const text = `## ${h("exportTitle")}\n\n${blocks.join("\n\n---\n\n")}\n`;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const datestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    a.href = url;
    a.download = `lenormand-history-${datestamp}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {showNotice && (
        <p
          style={{
            textAlign: "center",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--text-muted)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hair)",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 24,
          }}
        >
          {h("firstVisitNotice")}
        </p>
      )}
      {!persistable && (
        <p
          style={{
            textAlign: "center",
            fontStyle: "italic",
            fontSize: 15,
            color: "var(--status-danger)",
            background: "var(--surface-raised)",
            border: "1px solid var(--status-danger)",
            borderRadius: 8,
            padding: "10px 16px",
            marginBottom: 24,
          }}
        >
          {h("incognitoWarning")}
        </p>
      )}

      {selectedIds.size > 0 && (
        <div
          style={{
            position: "sticky",
            top: 8,
            zIndex: 5,
            display: "flex",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <div style={{ position: "relative", maxWidth: "100%" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "stretch",
                justifyContent: "center",
                background: "var(--surface-card)",
                border: "1px solid var(--border-hair)",
                borderRadius: 999,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <button
                type="button"
                aria-label={h("closeSelectionLabel")}
                title={h("closeSelectionLabel")}
                onClick={selectNone}
                style={toolbarSegmentStyle()}
              >
                <CloseIcon />
              </button>
              <ToolbarDivider />
              <span style={{ ...toolbarSegmentStyle(), color: "var(--gold-500)", fontWeight: 600, cursor: "default" }}>
                {h("selectedCount", { count: selectedIds.size })}
              </span>
              <ToolbarDivider />
              <button
                type="button"
                onClick={selectedIds.size === filteredReadings.length ? selectNone : selectAll}
                style={toolbarSegmentStyle()}
              >
                <CheckIcon />
                <span>{selectedIds.size === filteredReadings.length ? h("deselectAllButton") : h("selectAllButton")}</span>
              </button>
              <ToolbarDivider />
              <button type="button" onClick={handleExport} style={toolbarSegmentStyle()}>
                <DownloadIcon />
                <span>{h("exportMdButton")}</span>
              </button>
              <ToolbarDivider />
              <button
                type="button"
                aria-label={h("deleteSelectedButton")}
                title={h("deleteSelectedButton")}
                onClick={() => setConfirmingBulkDelete(true)}
                style={{ ...toolbarSegmentStyle(), color: "var(--status-danger)" }}
              >
                <TrashIcon />
              </button>
            </div>

            {confirmingBulkDelete && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  zIndex: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  maxWidth: 320,
                  background: "var(--surface-card)",
                  border: "1px solid var(--status-danger)",
                  borderRadius: 8,
                  boxShadow: "var(--shadow-md)",
                  padding: "10px 16px",
                }}
              >
                <span style={{ fontSize: 13, fontStyle: "italic", color: "var(--status-danger)" }}>
                  {h("confirmDeleteSelected", { count: selectedIds.size })}
                </span>
                <button type="button" style={pillStyle("danger")} onClick={handleBulkDelete}>
                  {h("confirmDeleteYes")}
                </button>
                <button type="button" style={pillStyle("ghost")} onClick={() => setConfirmingBulkDelete(false)}>
                  {h("confirmDeleteCancel")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {readings && readings.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontStyle: "italic", fontSize: 19, color: "var(--text-muted)", margin: "0 0 20px" }}>
            {h("empty")}
          </p>
          <Link
            href="/spreads"
            style={{
              fontFamily: "var(--font-smallcaps)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-caps)",
              fontSize: 12,
              color: "var(--gold-500)",
            }}
          >
            {h("beginReading")}
          </Link>
        </div>
      )}

      {readings && readings.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label
              htmlFor="history-filter-tag"
              style={{
                fontFamily: "var(--font-smallcaps)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {h("tagsLabel")}
            </label>
            <select
              id="history-filter-tag"
              value={tagFilter}
              onChange={(e) => {
                setTagFilter(e.target.value);
                setPage(1);
              }}
              style={{
                border: "1px solid var(--border-hair)",
                borderRadius: 6,
                background: "var(--surface-raised)",
                padding: "5px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-body)",
                cursor: "pointer",
              }}
            >
              <option value="">{h("filterAllTags")}</option>
              <option value={DAILY_TAG_VALUE}>{h("dailyTagOption")}</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label
              htmlFor="history-filter-date-from"
              style={{
                fontFamily: "var(--font-smallcaps)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {h("filterDateFrom")}
            </label>
            <input
              id="history-filter-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              style={{
                border: "1px solid var(--border-hair)",
                borderRadius: 6,
                background: "var(--surface-raised)",
                padding: "5px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-body)",
              }}
            />
            <label
              htmlFor="history-filter-date-to"
              style={{
                fontFamily: "var(--font-smallcaps)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wide)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {h("filterDateTo")}
            </label>
            <input
              id="history-filter-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              style={{
                border: "1px solid var(--border-hair)",
                borderRadius: 6,
                background: "var(--surface-raised)",
                padding: "5px 8px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-body)",
              }}
            />
          </div>

          {filtersActive && (
            <button type="button" style={pillStyle("ghost")} onClick={clearFilters}>
              {h("clearFiltersButton")}
            </button>
          )}
        </div>
      )}

      {readings && readings.length > 0 && filteredReadings.length === 0 && (
        <p style={{ textAlign: "center", fontStyle: "italic", fontSize: 16, color: "var(--text-muted)", padding: "20px 0" }}>
          {h("noResultsFiltered")}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {pagedReadings.map((reading) => (
          <Row
            key={reading.id}
            reading={reading}
            dateFormatter={dateFormatter}
            onChanged={refresh}
            selected={selectedIds.has(reading.id)}
            onToggleSelected={() => toggleSelected(reading.id)}
          />
        ))}
      </div>

      {filteredReadings.length > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 28 }}>
          <button
            type="button"
            aria-label={h("prevPage")}
            title={h("prevPage")}
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              ...pillStyle("ghost"),
              opacity: currentPage <= 1 ? 0.4 : 1,
              cursor: currentPage <= 1 ? "default" : "pointer",
            }}
          >
            ‹
          </button>
          <span
            style={{
              fontFamily: "var(--font-smallcaps)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-caps)",
              fontSize: 11,
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            {h("pageIndicator", { page: currentPage, total: totalPages })}
          </span>
          <button
            type="button"
            aria-label={h("nextPage")}
            title={h("nextPage")}
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              ...pillStyle("ghost"),
              opacity: currentPage >= totalPages ? 0.4 : 1,
              cursor: currentPage >= totalPages ? "default" : "pointer",
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export function Row({
  reading,
  dateFormatter,
  onChanged,
  selected,
  onToggleSelected,
}: {
  reading: Reading;
  dateFormatter: ReadingDateFormatter;
  onChanged: () => void;
  selected?: boolean;
  onToggleSelected?: () => void;
}) {
  const h = useTranslations("history");
  const t = useTranslations("draw");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");
  const siteT = useTranslations("site");

  const [open, setOpen] = useState(false);
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);
  const [note, setNote] = useState(reading.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [pendingNoteFocus, setPendingNoteFocus] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && pendingNoteFocus && noteRef.current) {
      noteRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      noteRef.current.focus();
      setPendingNoteFocus(false);
    }
  }, [open, pendingNoteFocus]);

  function handleEditNoteClick() {
    setOpen(true);
    setPendingNoteFocus(true);
  }

  // reading.spread/cardCount is historical data — a reading drawn under a
  // previous version of the spread model may not match any current SPREADS
  // entry, so this falls back to generic position labels rather than
  // throwing and taking down the whole list.
  let positionLabels: string[];
  let spreadName: string;
  try {
    const spread = getSpread(reading.spread);
    positionLabels = spread.positionKeys.map((key) => s(key.replace(/^spread\./, "")));
    spreadName = s(`${reading.spread}.name`);
  } catch {
    positionLabels = reading.cards.map((_, i) => `#${i + 1}`);
    spreadName = reading.spread;
  }
  const cardNames = reading.cards
    .map((c) => cardsT(`${getCardById(c.cardId).slug}.name`))
    .join(" · ");

  const orderedCards = [...reading.cards].sort((a, b) => a.position - b.position);
  const promptText = buildAIPrompt({
    spread: reading.spread,
    cards: orderedCards.map((c) => ({ cardId: c.cardId })),
    question: reading.question,
    locale: reading.lang,
  });

  function handleSaveNote() {
    updateReadingNote(reading.id, note);
    setNoteSaved(true);
    onChanged();
    setTimeout(() => setNoteSaved(false), 2000);
  }

  async function handleDownloadImage() {
    if (downloadingImage) return;
    setDownloadingImage(true);
    try {
      const url = await exportReadingAsJpeg({
        siteTitle: siteT("title"),
        spreadName,
        dateLabel: dateFormatter.format(new Date(reading.createdAt)),
        question: reading.question,
        noQuestionLabel: h("questionPreviewNone"),
        notesLabel: t("noteLabel"),
        notes: reading.notes,
        cards: reading.cards.map((c) => {
          const card = getCardById(c.cardId);
          return {
            position: c.position,
            image: card.image,
            name: cardsT(`${card.slug}.name`),
            positionLabel: positionLabels[c.position] ?? `#${c.position + 1}`,
          };
        }),
      });
      const createdAt = new Date(reading.createdAt);
      const datestamp = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(
        createdAt.getDate(),
      ).padStart(2, "0")}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = `lenormand-${reading.spread}-${datestamp}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export reading image", err);
    } finally {
      setDownloadingImage(false);
    }
  }

  return (
    <article
      style={{
        background: "var(--surface-card)",
        border: `1px solid ${selected ? "var(--gold-400)" : "var(--border-hair)"}`,
        borderRadius: 8,
        boxShadow: "var(--shadow-sm)",
        padding: "22px 26px",
      }}
    >
      <div className={styles.rowHeader}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: "1 1 0%" }}>
          {onToggleSelected && (
            <input
              type="checkbox"
              checked={!!selected}
              onChange={onToggleSelected}
              aria-label={h("selectReadingLabel")}
              style={{ marginTop: 4, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
            />
          )}
          <div className={styles.content}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "var(--gold-500)",
                margin: 0,
              }}
            >
              {spreadName}
            </h2>
            <span style={{ fontSize: 12, color: "var(--gold-500)" }}>·</span>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--gold-500)" }}>
              {dateFormatter.format(new Date(reading.createdAt))}
            </div>
            <button
              type="button"
              aria-label={note.trim() ? h("readNoteTooltip") : h("addNoteTooltip")}
              title={note.trim() ? h("readNoteTooltip") : h("addNoteTooltip")}
              onClick={(e) => {
                e.stopPropagation();
                handleEditNoteClick();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 22,
                height: 22,
                padding: 0,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: note.trim() ? "var(--gold-500)" : "var(--text-subtle)",
              }}
            >
              {note.trim() ? <NotebookPenIcon /> : <PencilIcon />}
            </button>
            <TagEditor
              readingId={reading.id}
              initialTags={reading.tags ?? []}
              onChanged={onChanged}
            />
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.5, color: "var(--text-body)", marginTop: 10 }}>{cardNames}</div>
          <div style={{ fontStyle: "italic", fontSize: 18, color: "var(--text-muted)", marginTop: 6, overflowWrap: "break-word" }}>
            {reading.question ? `“${reading.question}”` : h("questionPreviewNone")}
          </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            aria-label={open ? h("hideDrawButton") : h("replayButton")}
            title={open ? h("hideDrawButton") : h("replayButton")}
            aria-expanded={open}
            onClick={() => {
              setOpen((v) => !v);
              setExpandedPosition(null);
            }}
            style={{
              ...pillStyle("gilt"),
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 35,
              height: 35,
              padding: 0,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <ChevronIcon />
            </span>
          </button>
          <CopyToClipboardButton
            text={promptText}
            label={h("copyPromptButton")}
            copiedLabel={t("copiedToast")}
            pasteIntoLabel={t("pasteIntoLabel")}
            fallbackTitle={t("copyFallbackTitle")}
            fallbackHint={t("copyFallbackHint")}
            selectAllLabel={t("selectAllButton")}
            buttonStyle={pillStyle("ghost")}
          />
          <button
            type="button"
            aria-label={h("downloadImageButton")}
            title={downloadingImage ? h("downloadingImage") : h("downloadImageButton")}
            onClick={handleDownloadImage}
            disabled={downloadingImage}
            style={{
              ...pillStyle("ghost"),
              display: "inline-flex",
              alignItems: "center",
              opacity: downloadingImage ? 0.6 : 1,
              cursor: downloadingImage ? "default" : "pointer",
            }}
          >
            <DownloadIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.cardsRow}>
          {reading.cards.map((c) => {
            const card = getCardById(c.cardId);
            const name = cardsT(`${card.slug}.name`);
            return (
              <div key={c.position} style={{ textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => setExpandedPosition((prev) => (prev === c.position ? null : c.position))}
                  className={styles.cardImage}
                  style={{ backgroundImage: `url('${card.image}')` }}
                  aria-label={name}
                />
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open &&
        expandedPosition !== null &&
        (() => {
          const dc = reading.cards.find((d) => d.position === expandedPosition);
          if (!dc) return null;
          const card = getCardById(dc.cardId);
          return (
            <div style={{ marginTop: 16 }}>
              <CardKeywordsPanel
                positionLabel={positionLabels[dc.position]}
                name={cardsT(`${card.slug}.name`)}
                keywords={cardsT.raw(`${card.slug}.keywords`) as string[]}
              />
            </div>
          );
        })()}

      {open && reading.apiReadingText && (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border-hair)" }}>
          <div
            style={{
              fontFamily: "var(--font-smallcaps)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            {h("apiReadingLabel")}
          </div>
          <MarkdownReading text={reading.apiReadingText} tone="onLight" />

          {reading.apiFollowUps && reading.apiFollowUps.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {reading.apiFollowUps.map((f, i) => (
                <div key={i} style={{ marginTop: i === 0 ? 0 : 14, paddingTop: 14, borderTop: "1px solid var(--border-hair)" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-smallcaps)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--tracking-wide)",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    {t("followUpQuestionLabel")}
                  </div>
                  <div style={{ fontStyle: "italic", fontSize: 16, color: "var(--text-muted)", marginBottom: 8 }}>
                    {f.question}
                  </div>
                  <MarkdownReading text={f.answer} tone="onLight" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border-hair)" }}>
          <label
            htmlFor={`note-${reading.id}`}
            style={{
              display: "block",
              fontFamily: "var(--font-smallcaps)",
              textTransform: "uppercase",
              letterSpacing: "var(--tracking-wide)",
              fontSize: 11,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            {t("noteLabel")}
          </label>
          <textarea
            id={`note-${reading.id}`}
            ref={noteRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={2}
            style={{
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 8,
              border: "1px solid var(--border-hair)",
              background: "var(--surface-raised)",
              padding: "10px 12px",
              fontFamily: "var(--font-serif)",
              fontSize: 15,
              color: "var(--text-body)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button type="button" style={pillStyle("ghost")} onClick={handleSaveNote}>
              {t("saveNoteButton")}
            </button>
            {noteSaved && (
              <span role="status" style={{ fontSize: 13, color: "var(--moss-300)" }}>
                {t("noteSavedToast")}
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
