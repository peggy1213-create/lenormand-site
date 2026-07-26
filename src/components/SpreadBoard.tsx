"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  getSpread,
  getLine3PositionKeys,
  type SpreadId,
  type Line3Frame,
} from "@/data/spreads";
import { CARDS, getCardById, type Card } from "@/data/cards";
import { shuffle } from "@/lib/shuffle";
import { addReading, updateReadingNote, deleteReading } from "@/lib/storage";
import { buildAIPrompt } from "@/lib/prompt";
import type { Locale } from "@/i18n/routing";
import FlippableCard from "./FlippableCard";
import PlaceholderSlot from "./PlaceholderSlot";
import CardKeywordsPanel from "./CardKeywordsPanel";
import CopyToClipboardButton from "./CopyToClipboardButton";
import ShufflePile from "./ShufflePile";

type DrawnCard = { cardId: number; position: number };

function spreadNamespace(id: SpreadId): "daily" | "line3" | "line5" {
  if (id === "daily") return "daily";
  if (id === "line-3") return "line3";
  return "line5";
}

// spreads.ts stores fully-qualified keys like "spread.daily.pos1"; the `s`
// translator below is already scoped to the "spread" namespace.
function stripNamespace(fullKey: string): string {
  return fullKey.replace(/^spread\./, "");
}

export default function SpreadBoard({ spreadId }: { spreadId: SpreadId }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("draw");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");

  const spread = getSpread(spreadId);

  const [question, setQuestion] = useState("");
  const [frame, setFrame] = useState<Line3Frame>("past-present-future");
  const [deckOrder, setDeckOrder] = useState<Card[]>(() => shuffle(CARDS));
  const [shuffleCount, setShuffleCount] = useState(0);
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);
  const [revealed, setRevealed] = useState<boolean[]>([]);
  const [revealAllActive, setRevealAllActive] = useState(false);
  const [expandedPosition, setExpandedPosition] = useState<number | null>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const positionLabels = (
    spreadId === "line-3" ? getLine3PositionKeys(frame) : spread.positionKeys
  ).map((key) => s(stripNamespace(key)));

  function handleGestureShuffle() {
    setDeckOrder(shuffle(CARDS));
    setShuffleCount((c) => c + 1);
  }

  function handleDragShuffle() {
    setDeckOrder(shuffle(CARDS));
  }

  function handleDrawClick() {
    if (shuffleCount === 0) return;
    const cards = deckOrder.slice(0, spread.cardCount).map((c, i) => ({
      cardId: c.id,
      position: i,
    }));
    setDrawn(cards);
    setRevealed(new Array(cards.length).fill(false));
    setRevealAllActive(false);
    setExpandedPosition(null);
    setNote("");
    setNoteSaved(false);

    const reading = addReading({
      spread: spreadId,
      question: question.trim() || undefined,
      cards,
      lang: locale,
      frame: spreadId === "line-3" ? frame : undefined,
    });
    setReadingId(reading.id);
  }

  function handleRevealOne(i: number) {
    setRevealed((prev) => prev.map((v, idx) => (idx === i ? true : v)));
  }

  function handleRevealAll() {
    setRevealAllActive(true);
    setRevealed((prev) => prev.map(() => true));
  }

  function handleToggleExpand(position: number) {
    setExpandedPosition((prev) => (prev === position ? null : position));
  }

  function handleSaveNote() {
    if (!readingId) return;
    updateReadingNote(readingId, note);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  function resetToSetup() {
    setDrawn(null);
    setRevealed([]);
    setRevealAllActive(false);
    setExpandedPosition(null);
    setReadingId(null);
    setNote("");
    setNoteSaved(false);
    setQuestion("");
    setShuffleCount(0);
    setDeckOrder(shuffle(CARDS));
  }

  function handleDelete() {
    if (!readingId) return;
    if (!window.confirm(t("confirmDelete"))) return;
    deleteReading(readingId);
    resetToSetup();
  }

  const allRevealed =
    drawn !== null && revealed.length > 0 && revealed.every(Boolean);

  const promptText = drawn
    ? buildAIPrompt({
        spread: spreadId,
        cards: drawn.map((c) => ({ cardId: c.cardId })),
        question: question.trim() || undefined,
        frame: spreadId === "line-3" ? frame : undefined,
        locale,
      })
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-ink">
        {s(`${spreadNamespace(spreadId)}.name`)}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {s(`${spreadNamespace(spreadId)}.description`)}
      </p>

      {!drawn && (
        <div className="mt-4 space-y-4">
          <div
            className={`flex gap-3 ${
              spreadId === "line-5"
                ? "overflow-x-auto scroll-fade-right pb-2"
                : "flex-wrap justify-center"
            }`}
          >
            {positionLabels.map((label, i) => (
              <PlaceholderSlot key={i} label={label} />
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink" htmlFor="question">
              {t("questionLabel")}
            </label>
            <input
              id="question"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("questionPlaceholder")}
              className="mt-1 w-full rounded border border-muted/40 bg-white/60 px-3 py-2 text-sm"
            />
          </div>

          {spreadId === "line-3" && (
            <div>
              <span className="block text-sm font-medium text-ink">
                {s("line3.frameLabel")}
              </span>
              <div className="mt-1 flex gap-2">
                {(
                  ["past-present-future", "situation-action-outcome"] as Line3Frame[]
                ).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrame(f)}
                    aria-pressed={frame === f}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      frame === f
                        ? "border-gold bg-gold/30 text-ink"
                        : "border-muted/40 text-muted"
                    }`}
                  >
                    {s(
                      `line3.frames.${
                        f === "past-present-future"
                          ? "pastPresentFuture"
                          : "situationActionOutcome"
                      }`,
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-3 pt-2">
            <ShufflePile
              onGestureShuffle={handleGestureShuffle}
              onDragShuffle={handleDragShuffle}
              label={t("shuffleButton")}
            />
            <p className="text-sm text-muted" aria-live="polite">
              {shuffleCount === 0
                ? t("shufflePrompt")
                : t("shuffleCountHint", { count: shuffleCount })}
            </p>
            <button
              type="button"
              onClick={handleDrawClick}
              disabled={shuffleCount === 0}
              className="rounded-full bg-rust px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:opacity-40"
            >
              {t("drawButton")}
            </button>
          </div>
        </div>
      )}

      {drawn && (
        <div className="mt-6">
          {!allRevealed && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted">{t("tapToReveal")}</p>
              <button
                type="button"
                onClick={handleRevealAll}
                className="rounded-full border border-gold px-3 py-1.5 text-sm text-ink hover:bg-gold/20"
              >
                {t("revealAllButton")}
              </button>
            </div>
          )}

          <div
            className={`flex gap-3 ${
              spreadId === "line-5"
                ? "overflow-x-auto scroll-fade-right pb-2"
                : "flex-wrap justify-center"
            }`}
          >
            {drawn.map((c, i) => {
              const card = getCardById(c.cardId);
              const name = cardsT(`${card.slug}.name`);
              return (
                <div key={c.position} className="flex flex-col items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {positionLabels[i]}
                  </span>
                  <FlippableCard
                    frontSrc={card.image}
                    frontAlt={name}
                    revealed={revealed[i]}
                    onReveal={() => handleRevealOne(i)}
                    delaySeconds={revealAllActive ? i * 0.15 : 0}
                    selected={expandedPosition === c.position}
                    onSelect={() => handleToggleExpand(c.position)}
                  />
                  {revealed[i] && <span className="text-sm text-ink">{name}</span>}
                </div>
              );
            })}
          </div>

          {spreadId === "daily" && allRevealed && (
            <p className="mt-4 rounded bg-sage/10 p-3 text-sm text-ink">
              {s("daily.pairNote")}
            </p>
          )}

          {expandedPosition !== null &&
            (() => {
              const dc = drawn.find((d) => d.position === expandedPosition);
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

          {allRevealed && (
            <div className="mt-6 space-y-4 border-t border-muted/30 pt-4">
              <div>
                <label className="block text-sm font-medium text-ink" htmlFor="note">
                  {t("noteLabel")}
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("notePlaceholder")}
                  className="mt-1 w-full rounded border border-muted/40 bg-white/60 px-3 py-2 text-sm"
                  rows={3}
                />
                <span className="mt-2 inline-flex items-center gap-2">
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
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <CopyToClipboardButton
                  text={promptText}
                  label={t("copyPromptButton")}
                  copiedLabel={t("copiedToast")}
                  fallbackTitle={t("copyFallbackTitle")}
                  fallbackHint={t("copyFallbackHint")}
                  selectAllLabel={t("selectAllButton")}
                />
                <button
                  type="button"
                  onClick={resetToSetup}
                  className="rounded-full border border-muted/40 px-4 py-2 text-sm text-ink hover:bg-white"
                >
                  {t("drawAgainButton")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-full border border-muted/40 px-4 py-2 text-sm text-muted hover:border-rust hover:text-rust"
                >
                  {t("deleteButton")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
