"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getHistory,
  isStoragePersistable,
  updateReadingNote,
  deleteReading,
  type Reading,
} from "@/lib/storage";
import { getCardById } from "@/data/cards";
import { getSpread } from "@/data/spreads";
import CardKeywordsPanel from "./CardKeywordsPanel";

const NOTICE_SEEN_KEY = "lenormand.historyNoticeSeen";

function pillStyle(tone: "gilt" | "ghost" | "danger"): CSSProperties {
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

export default function HistoryList() {
  const locale = useLocale();
  const h = useTranslations("history");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");

  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [showNotice, setShowNotice] = useState(false);
  const [persistable, setPersistable] = useState(true);

  function refresh() {
    const list = [...getHistory()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    setReadings(list);
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

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  function handleExport() {
    const blocks = getHistory().map((reading) => {
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
        .map((c, i) => `  ${positionLabels[i]} — ${cardsT(`${getCardById(c.cardId).slug}.name`)}`)
        .join("\n");

      const lines = [
        dateFormatter.format(new Date(reading.createdAt)),
        spreadName,
        reading.question ? `"${reading.question}"` : h("questionPreviewNone"),
        cardLines,
      ];
      if (reading.notes) lines.push(reading.notes);
      return lines.join("\n");
    });

    const text = blocks.join("\n\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lenormand-history.txt";
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

      {readings && readings.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <button type="button" onClick={handleExport} style={pillStyle("ghost")}>
            {h("exportTxtButton")}
          </button>
        </div>
      )}

      {readings && readings.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontStyle: "italic", fontSize: 19, color: "var(--text-muted)", margin: "0 0 20px" }}>
            {h("empty")}
          </p>
          <Link
            href="/draw"
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

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {readings?.map((reading) => (
          <Row key={reading.id} reading={reading} dateFormatter={dateFormatter} onChanged={refresh} />
        ))}
      </div>
    </div>
  );
}

function Row({
  reading,
  dateFormatter,
  onChanged,
}: {
  reading: Reading;
  dateFormatter: Intl.DateTimeFormat;
  onChanged: () => void;
}) {
  const h = useTranslations("history");
  const t = useTranslations("draw");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");

  const [open, setOpen] = useState(false);
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);
  const [note, setNote] = useState(reading.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  function handleSaveNote() {
    updateReadingNote(reading.id, note);
    setNoteSaved(true);
    onChanged();
    setTimeout(() => setNoteSaved(false), 2000);
  }

  // An inline confirm row instead of window.confirm(): native confirm()
  // dialogs are silently blocked in sandboxed preview iframes, which made
  // delete look broken there even though the handler ran fine.
  function handleDelete() {
    deleteReading(reading.id);
    onChanged();
  }

  return (
    <article
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-hair)",
        borderRadius: 8,
        boxShadow: "var(--shadow-sm)",
        padding: "22px 26px",
      }}
    >
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.04em", color: "var(--gold-500)" }}>
            {dateFormatter.format(new Date(reading.createdAt))}
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 19,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-900)",
              margin: "8px 0 0",
            }}
          >
            {spreadName}
          </h2>
          <div style={{ fontSize: 17, lineHeight: 1.5, color: "var(--text-body)", marginTop: 6 }}>{cardNames}</div>
          <div style={{ fontStyle: "italic", fontSize: 16, color: "var(--text-muted)", marginTop: 6 }}>
            {reading.question ? `“${reading.question}”` : h("questionPreviewNone")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {confirmingDelete ? (
            <>
              <span style={{ fontSize: 13, fontStyle: "italic", color: "var(--status-danger)" }}>
                {t("confirmDelete")}
              </span>
              <button type="button" style={pillStyle("danger")} onClick={handleDelete}>
                {h("confirmDeleteYes")}
              </button>
              <button type="button" style={pillStyle("ghost")} onClick={() => setConfirmingDelete(false)}>
                {h("confirmDeleteCancel")}
              </button>
            </>
          ) : (
            <>
              <button type="button" style={pillStyle("gilt")} onClick={() => setOpen((v) => !v)}>
                {open ? h("hideDrawButton") : h("replayButton")}
              </button>
              <button type="button" style={pillStyle("ghost")} onClick={() => setConfirmingDelete(true)}>
                {h("deleteButton")}
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 22,
            paddingTop: 22,
            borderTop: "1px solid var(--border-hair)",
          }}
        >
          {reading.cards.map((c, i) => {
            const card = getCardById(c.cardId);
            const name = cardsT(`${card.slug}.name`);
            return (
              <div key={c.position} style={{ textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => setExpandedPosition((prev) => (prev === c.position ? null : c.position))}
                  style={{
                    display: "block",
                    width: 124,
                    height: 194,
                    borderRadius: 8,
                    backgroundImage: `url('${card.image}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid var(--gold-400)",
                    boxShadow: "var(--shadow-md)",
                    cursor: "pointer",
                  }}
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
                  {`${positionLabels[i]} — ${name}`}
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
