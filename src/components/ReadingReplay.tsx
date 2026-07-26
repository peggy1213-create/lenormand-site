"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getCardById } from "@/data/cards";
import { getSpread, getLine3PositionKeys, type Line3Frame } from "@/data/spreads";
import { updateReadingNote, deleteReading, type Reading } from "@/lib/storage";
import CardKeywordsPanel from "./CardKeywordsPanel";

function stripNamespace(fullKey: string): string {
  return fullKey.replace(/^spread\./, "");
}

// Read-only render of a saved reading: card content re-localizes to the
// current UI locale (only cardId is stored), while question/notes stay in
// whatever language the user actually typed them in.
export default function ReadingReplay({
  reading,
  onChanged,
  onDeleted,
}: {
  reading: Reading;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("draw");
  const h = useTranslations("history");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");

  const spread = getSpread(reading.spread);
  const positionLabels = (
    reading.spread === "line-3"
      ? getLine3PositionKeys((reading.frame ?? "past-present-future") as Line3Frame)
      : spread.positionKeys
  ).map((key) => s(stripNamespace(key)));

  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);
  const [note, setNote] = useState(reading.notes ?? "");
  const [noteSaved, setNoteSaved] = useState(false);

  function handleSaveNote() {
    updateReadingNote(reading.id, note);
    setNoteSaved(true);
    onChanged();
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function handleDelete() {
    if (!window.confirm(t("confirmDelete"))) return;
    deleteReading(reading.id);
    onDeleted();
  }

  return (
    <div className="mt-3 rounded-lg border border-muted/30 bg-white/40 p-4">
      {reading.question && (
        <p className="text-sm text-ink">
          <span className="font-medium">{t("questionLabel")}: </span>
          {reading.question}
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {reading.cards.map((c, i) => {
          const card = getCardById(c.cardId);
          const name = cardsT(`${card.slug}.name`);
          return (
            <div key={c.position} className="flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted">
                {positionLabels[i]}
              </span>
              <button
                type="button"
                onClick={() =>
                  setExpandedPosition((prev) => (prev === c.position ? null : c.position))
                }
                className="h-40 w-24 overflow-hidden rounded-lg shadow-sm sm:h-48 sm:w-28"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image} alt={name} className="h-full w-full object-cover" />
              </button>
              <span className="text-sm text-ink">{name}</span>
            </div>
          );
        })}
      </div>

      {expandedPosition !== null &&
        (() => {
          const dc = reading.cards.find((d) => d.position === expandedPosition);
          if (!dc) return null;
          const card = getCardById(dc.cardId);
          return (
            <div className="mt-4">
              <CardKeywordsPanel
                positionLabel={positionLabels[dc.position]}
                name={cardsT(`${card.slug}.name`)}
                keywords={cardsT.raw(`${card.slug}.keywords`) as string[]}
              />
            </div>
          );
        })()}

      <div className="mt-4 space-y-2 border-t border-muted/30 pt-3">
        <label className="block text-sm font-medium text-ink" htmlFor={`note-${reading.id}`}>
          {t("noteLabel")}
        </label>
        <textarea
          id={`note-${reading.id}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded border border-muted/40 bg-white/60 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveNote}
            className="rounded border border-muted/40 px-3 py-1.5 text-sm text-ink hover:bg-white"
          >
            {t("saveNoteButton")}
          </button>
          {noteSaved && (
            <span role="status" className="text-sm text-sage">
              {t("noteSavedToast")}
            </span>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto rounded-full border border-muted/40 px-4 py-1.5 text-sm text-muted hover:border-rust hover:text-rust"
          >
            {h("deleteButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
