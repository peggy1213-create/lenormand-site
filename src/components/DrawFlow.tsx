"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { SPREADS } from "@/data/spreads";
import { CARDS, CARD_BACK_IMAGE, type Card } from "@/data/cards";
import { shuffle } from "@/lib/shuffle";
import { addReading, hasDrawnDailyToday } from "@/lib/storage";
import { buildAIPrompt } from "@/lib/prompt";
import CopyToClipboardButton from "./CopyToClipboardButton";
import styles from "./DrawFlow.module.css";

type ScatterCard = { id: number; x: number; y: number; rot: number };
type Phase = "question" | "shuffle" | "choose" | "locked";

const FIELD_W = 820;
const FIELD_H = 260;
const DECK_CARD_MIN_W = 46;
const DECK_CARD_MAX_W = 96;
const DECK_CARD_ASPECT = 152 / 96;
const DECK_OVERLAP = 0.6;

function scatter(): ScatterCard[] {
  const n = 16;
  const cx = (FIELD_W - 96) / 2;
  const cy = (FIELD_H - 152) / 2;
  const out: ScatterCard[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: i, x: cx + i * 1.2, y: cy - i * 0.8, rot: -1.5 + (i % 4) * 1 });
  }
  return out;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function cardBackStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: 96,
    height: 152,
    borderRadius: 8,
    backgroundImage: `url('${CARD_BACK_IMAGE}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    border: "1px solid var(--gold-400)",
    boxShadow: "var(--shadow-md)",
    ...extra,
  };
}

function pillButtonStyle(on: boolean, tone: "gilt" | "ghost"): CSSProperties {
  return {
    cursor: on ? "pointer" : "not-allowed",
    padding: "12px 26px",
    borderRadius: 8,
    border: `1px solid ${tone === "gilt" ? "var(--gold-400)" : "rgba(231,199,137,.45)"}`,
    background: tone === "gilt" ? (on ? "var(--gilt)" : "rgba(193,138,69,.25)") : "transparent",
    color: tone === "gilt" ? (on ? "var(--ink-900)" : "rgba(251,246,234,.55)") : "var(--gold-200)",
    fontFamily: "var(--font-smallcaps)",
    textTransform: "uppercase",
    letterSpacing: "var(--tracking-caps)",
    fontSize: 12,
    whiteSpace: "nowrap",
    transition: "background var(--dur-med) var(--ease-out-soft)",
  };
}

export default function DrawFlow() {
  const locale = useLocale() as Locale;
  const t = useTranslations("draw");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");

  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("question");
  const [question, setQuestion] = useState("");
  const [cards, setCards] = useState<ScatterCard[]>(() => scatter());
  const [churn, setChurn] = useState(0);
  const [deckOrder, setDeckOrder] = useState<Card[]>([]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [dailyLocked, setDailyLocked] = useState(false);
  const [fieldScale, setFieldScale] = useState(1);
  const [deckCardW, setDeckCardW] = useState(DECK_CARD_MAX_W);
  const [deckScrollable, setDeckScrollable] = useState(false);

  // Read on mount only (not during SSR): the lock depends on localStorage
  // and the viewer's local clock, so it can only be known client-side.
  useEffect(() => {
    setDailyLocked(hasDrawnDailyToday());
  }, []);

  const fieldRef = useRef<HTMLDivElement | null>(null);
  const deckRowRef = useRef<HTMLDivElement | null>(null);
  const pressedRef = useRef(false);
  const phaseRef = useRef<Phase>("question");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // The scatter field's card coordinates are authored for a fixed
  // FIELD_W x FIELD_H stage; scale that stage down to fit narrower
  // viewports instead of letting cards land outside the visible area.
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? FIELD_W;
      setFieldScale(Math.min(1, width / FIELD_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  // The scrim covers the viewport, but without this the page behind it is
  // still scrollable — lock it while the overlay is open. The scrolling
  // element is <html>, not <body>, so both need to be locked.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  const spread = SPREADS[sel];
  const need = spread.cardCount;
  const asking = phase === "question";
  const choosing = phase === "choose";
  const done = choosing && chosen.length >= need;
  const allShown = done && chosen.every((di) => revealed.includes(di));
  const ready = churn >= 60;

  // The fanned deck's card size is derived from its actual rendered width
  // rather than guessed from viewport units, so every card gets the largest
  // overlap-adjusted size that still fits without clipping; below the
  // comfortable minimum it falls back to a scrollable row instead of
  // shrinking cards into an unclickably thin sliver.
  useEffect(() => {
    const el = deckRowRef.current;
    if (!el) return;
    const factor = 1 + (CARDS.length - 1) * (1 - DECK_OVERLAP);
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (!width) return;
      const raw = width / factor;
      setDeckCardW(clamp(raw, DECK_CARD_MIN_W, DECK_CARD_MAX_W));
      setDeckScrollable(raw < DECK_CARD_MIN_W);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase, done]);

  function openSpread(i: number) {
    const spreadAt = SPREADS[i];
    const skip = spreadAt.id === "daily";
    const locked = skip && dailyLocked;
    setSel(i);
    setOpen(true);
    setPhase(locked ? "locked" : skip ? "shuffle" : "question");
    if (skip) setQuestion("");
    setCards(scatter());
    setChurn(0);
    setDeckOrder([]);
    setChosen([]);
    setRevealed([]);
  }

  function toShuffle() {
    setPhase("shuffle");
    setCards(scatter());
    setChurn(0);
    setDeckOrder([]);
    setChosen([]);
    setRevealed([]);
  }

  function handlePress() {
    if (phaseRef.current !== "shuffle") return;
    pressedRef.current = true;
    const jitter = (span: number) => (Math.random() * 2 - 1) * span;
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        x: clamp(c.x + jitter(110), -20, FIELD_W - 76),
        y: clamp(c.y + jitter(75), -16, FIELD_H - 116),
        rot: c.rot + jitter(13),
      })),
    );
    setChurn((c) => Math.min(100, c + 22));
  }

  function handleRelease() {
    pressedRef.current = false;
  }

  function handleMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== "shuffle" || !pressedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = fieldScale || 1;
    const mx = (e.clientX - rect.left) / scale;
    const my = (e.clientY - rect.top) / scale;
    let touched = 0;
    setCards((prev) =>
      prev.map((c) => {
        const dx = c.x + 48 - mx;
        const dy = c.y + 76 - my;
        const dist = Math.hypot(dx, dy);
        if (dist > 120) return c;
        touched++;
        const push = (120 - dist) / 6;
        const nx = clamp(c.x + (dx / (dist || 1)) * push, -30, FIELD_W - 66);
        const ny = clamp(c.y + (dy / (dist || 1)) * push, -24, FIELD_H - 110);
        return { ...c, x: nx, y: ny, rot: c.rot + (dx > 0 ? 2.5 : -2.5) };
      }),
    );
    if (touched) setChurn((c) => Math.min(100, c + touched * 2));
  }

  function lay() {
    setDeckOrder(shuffle(CARDS));
    setChosen([]);
    setRevealed([]);
    setPhase("choose");
  }

  function choose(i: number, order: Card[]) {
    if (chosen.length >= need || chosen.includes(i)) return;
    const next = [...chosen, i];
    setChosen(next);
    if (next.length >= need) {
      addReading({
        spread: spread.id,
        question: question.trim() || undefined,
        cards: next.map((di, idx) => ({ cardId: order[di].id, position: idx })),
        lang: locale,
      });
      if (spread.id === "daily") setDailyLocked(true);
    }
  }

  function reveal(i: number) {
    setRevealed((prev) => (prev.includes(i) ? prev : [...prev, i]));
  }

  function back() {
    setOpen(false);
    setPhase("question");
    setCards(scatter());
    setChurn(0);
    setDeckOrder([]);
    setChosen([]);
    setRevealed([]);
    setQuestion("");
  }

  const promptText = allShown
    ? buildAIPrompt({
        spread: spread.id,
        cards: chosen.map((di) => ({ cardId: deckOrder[di].id })),
        question: question.trim() || undefined,
        locale,
      })
    : "";

  const questionMissing = asking && question.trim().length === 0;

  function layAction() {
    if (phase === "locked") return;
    if (asking) {
      if (questionMissing) return;
      toShuffle();
      return;
    }
    if (allShown) {
      openSpread(sel);
      return;
    }
    if (done) {
      setRevealed(chosen.slice());
      return;
    }
    if (choosing) return;
    if (ready) lay();
  }

  const layLabel = asking
    ? t("drawCardsButton")
    : allShown
      ? t("drawAgainButton")
      : done
        ? t("revealAllCardsButton")
        : t("layTheCardsButton");

  const stageTitle =
    phase === "locked"
      ? t("stageTitle.locked")
      : asking
        ? t("stageTitle.question")
        : done
          ? t("stageTitle.laid")
          : choosing
            ? t("stageTitle.choose")
            : t("stageTitle.shuffle");

  const stageHint = phase === "locked"
    ? t("hint.dailyLocked")
    : asking
    ? ""
    : allShown
      ? t("hint.sitWithIt")
      : done
        ? t("hint.turnCards")
        : choosing
          ? t("hint.choosing", { need, chosen: chosen.length })
          : ready
            ? t("hint.ready")
            : churn > 0
              ? t("hint.keepGoing")
              : t("hint.pressAndDrag");

  const charCount = question.length;

  return (
    <>
      <div className={styles.spreadGrid}>
        {SPREADS.map((sp, i) => {
          const lockedCard = sp.id === "daily" && dailyLocked;
          return (
            <div
              key={sp.id}
              className={styles.spreadCard}
              onClick={() => openSpread(i)}
              style={{ opacity: lockedCard ? 0.6 : 1 }}
            >
              <div className={styles.glowFrame} />
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 22,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ink-900)",
                  margin: "0 0 10px",
                }}
              >
                {s(`${sp.id}.name`)}
              </h2>
              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: "var(--text-muted)",
                  margin: "0 0 20px",
                  flex: 1,
                }}
              >
                {s(`${sp.id}.description`)}
              </p>
              {lockedCard && (
                <div
                  style={{
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    fontSize: 11,
                    color: "var(--gold-300)",
                  }}
                >
                  {t("dailyLockedBadge")}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {open && (
        <div className={styles.scrim}>
          <div style={{ textAlign: "center", width: "100%", maxWidth: 880 }}>
            <div
              style={{
                fontFamily: "var(--font-smallcaps)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-caps)",
                fontSize: 12,
                color: "var(--gold-200)",
              }}
            >
              {s(`${spread.id}.name`)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 30,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--parchment-50)",
                marginTop: "clamp(6px, 1.5vh, 12px)",
              }}
            >
              {stageTitle}
            </div>

            {asking && (
              <div style={{ marginTop: 28, textAlign: "left" }}>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value.slice(0, 250))}
                  rows={5}
                  placeholder={t("questionPlaceholder")}
                  className={styles.questionTextarea}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginTop: 10,
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    fontSize: 11,
                    color: "var(--gold-200)",
                  }}
                >
                  <span>{t("askOneAtATime")}</span>
                  <span style={{ color: charCount >= 250 ? "var(--gold-300)" : "var(--gold-200)" }}>
                    {t("charCount", { count: charCount })}
                  </span>
                </div>
              </div>
            )}

            {!choosing && !asking && phase !== "locked" && (
              <div
                ref={fieldRef}
                onPointerDown={handlePress}
                onPointerMove={handleMove}
                onPointerUp={handleRelease}
                onPointerLeave={handleRelease}
                className={styles.shuffleField}
                style={{ maxWidth: FIELD_W, height: FIELD_H * fieldScale }}
              >
                <div style={{ width: FIELD_W, height: FIELD_H, transform: `scale(${fieldScale})`, transformOrigin: "top left" }}>
                  {cards.map((c) => (
                    <div
                      key={c.id}
                      style={cardBackStyle({
                        position: "absolute",
                        left: c.x,
                        top: c.y,
                        transform: `rotate(${c.rot}deg)`,
                        transition:
                          "left 320ms var(--ease-serpentine), top 320ms var(--ease-serpentine), transform 320ms var(--ease-serpentine)",
                      })}
                    />
                  ))}
                </div>
              </div>
            )}

            {choosing && spread.id !== "daily" && question.trim() && (
              <div
                style={{
                  maxWidth: 620,
                  margin: "clamp(10px, 2.5vh, 24px) auto 0",
                  textAlign: "center",
                  paddingTop: "clamp(8px, 2vh, 18px)",
                  borderTop: "1px solid rgba(231,199,137,.28)",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-caps)",
                    fontSize: 11,
                    color: "var(--gold-300)",
                    marginBottom: 8,
                  }}
                >
                  {t("yourQuestionLabel")}
                </span>
                <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, lineHeight: 1.45, color: "var(--gold-200)" }}>
                  {question.trim()}
                </span>
              </div>
            )}

            {choosing && (() => {
              // While the deck fan is still on screen, the chosen row shares
              // vertical space with it, so it gets a smaller reserved size;
              // once selection is done the fan disappears and there's room
              // to grow the cards for the reveal moment.
              const chosenW = done
                ? "clamp(80px, min(27vw, 18vh), 168px)"
                : "clamp(70px, min(24vw, 14vh), 148px)";
              const chosenH = done
                ? "clamp(126px, min(42.6vw, 28.4vh), 265px)"
                : "clamp(110px, min(37.7vw, 22vh), 232px)";
              const isGrid = spread.id === "nine";
              return (
              <div
                style={
                  isGrid
                    ? {
                        display: "grid",
                        gridTemplateColumns: `repeat(3, ${chosenW})`,
                        gap: 18,
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: "clamp(10px, 2.5vh, 22px)",
                      }
                    : {
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 18,
                        justifyContent: "center",
                        alignItems: "center",
                        marginTop: "clamp(10px, 2.5vh, 22px)",
                        minHeight: `calc(${chosenH} + 28px)`,
                      }
                }
              >
                {chosen.map((di) => {
                  const shown = revealed.includes(di);
                  const card = deckOrder[di];
                  return (
                    <div
                      key={di}
                      onClick={() => reveal(di)}
                      className={styles.chosenCard}
                      style={{ cursor: shown ? "default" : "pointer" }}
                    >
                      <div
                        style={cardBackStyle({
                          width: chosenW,
                          height: chosenH,
                          backgroundImage: `url('${shown ? card.image : CARD_BACK_IMAGE}')`,
                        })}
                      />
                      <div
                        style={{
                          marginTop: 10,
                          minHeight: 18,
                          fontFamily: "var(--font-smallcaps)",
                          textTransform: "uppercase",
                          letterSpacing: "var(--tracking-wide)",
                          fontSize: 11,
                          color: "var(--gold-200)",
                        }}
                      >
                        {shown ? cardsT(`${card.slug}.name`) : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}

            {choosing && !done && (
              <div
                ref={deckRowRef}
                className={styles.deckRow}
                style={{
                  overflowX: deckScrollable ? "auto" : "hidden",
                  justifyContent: deckScrollable ? "flex-start" : "center",
                }}
              >
                {deckOrder.map((card, i) => {
                  const taken = chosen.includes(i);
                  return (
                    <div
                      key={card.id}
                      onClick={() => choose(i, deckOrder)}
                      style={cardBackStyle({
                        width: deckCardW,
                        height: deckCardW * DECK_CARD_ASPECT,
                        flex: "0 0 auto",
                        marginLeft: i ? -(deckCardW * DECK_OVERLAP) : 0,
                        cursor: done || taken ? "default" : "pointer",
                        opacity: taken ? 0 : 1,
                        transform: taken ? "translateY(-24px)" : "none",
                        transition:
                          "transform var(--dur-med) var(--ease-out-soft), opacity var(--dur-med) var(--ease-out-soft)",
                      })}
                    />
                  );
                })}
              </div>
            )}

            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 17,
                color: "var(--moss-100)",
                marginTop: "clamp(10px, 2.5vh, 26px)",
                minHeight: 26,
              }}
            >
              {stageHint}
            </div>

            <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: "clamp(10px, 2.2vh, 22px)", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={layAction}
                disabled={(choosing && !done) || questionMissing || phase === "locked"}
                style={{
                  ...pillButtonStyle(
                    !questionMissing && (asking || done || allShown || (ready && !choosing)),
                    "gilt",
                  ),
                  display: (choosing && !done) || phase === "locked" ? "none" : "inline-block",
                }}
              >
                {layLabel}
              </button>

              {done && (
                <div style={{ opacity: allShown ? 1 : 0.45, pointerEvents: allShown ? "auto" : "none" }}>
                  <CopyToClipboardButton
                    text={promptText}
                    label={t("copyPromptButton")}
                    copiedLabel={t("copiedToast")}
                    fallbackTitle={t("copyFallbackTitle")}
                    fallbackHint={t("copyFallbackHint")}
                    selectAllLabel={t("selectAllButton")}
                  />
                </div>
              )}

              <button type="button" onClick={back} style={pillButtonStyle(true, "ghost")}>
                {t("backToSpreadsButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
