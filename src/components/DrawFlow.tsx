"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import posthog from "posthog-js";
import type { Locale } from "@/i18n/routing";
import { SPREADS, type Spread, type SpreadId } from "@/data/spreads";
import { CARDS, CARD_BACK_IMAGE, type Card } from "@/data/cards";
import { useAuth } from "@/components/AuthProvider";
import { shuffle } from "@/lib/shuffle";
import { useReadings } from "@/components/ReadingsProvider";
import { buildAIPrompt } from "@/lib/prompt";
import { hasAnyProviderConfigured } from "@/lib/apiSettings";
import CopyToClipboardButton from "./CopyToClipboardButton";
import ReadWithApiPanel from "./ReadWithApiPanel";
import FreeReadingPanel from "./FreeReadingPanel";
import TagEditor from "./TagEditor";
import styles from "./DrawFlow.module.css";

type ScatterCard = { id: number; x: number; y: number; rot: number };
type Phase = "question" | "shuffle" | "choose" | "locked";

const FIELD_W = 820;
const TABLEAU_MAX_W = 1080;
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

// A low-emphasis text-link treatment for utility actions (copy, draw again,
// back) so they recede behind the primary reading CTA.
const quietActionStyle: CSSProperties = {
  cursor: "pointer",
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  fontFamily: "var(--font-smallcaps)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-caps)",
  fontSize: 11,
  whiteSpace: "nowrap",
  transition: "color var(--dur-med) var(--ease-out-soft)",
};

// Anchor card highlighted in each spread's picker glyph, if the spread reads
// from a centre card.
const GLYPH_ANCHOR: Partial<Record<SpreadId, number>> = { five: 2, nine: 4 };

function SpreadGlyph({ spread }: { spread: Spread }) {
  const anchor = GLYPH_ANCHOR[spread.id];
  return (
    <div
      aria-hidden
      className={styles.glyph}
      style={{ gridTemplateColumns: `repeat(${spread.columns ?? spread.cardCount}, var(--glyph-w))` }}
    >
      {Array.from({ length: spread.cardCount }, (_, i) => (
        <span key={i} className={i === anchor ? `${styles.glyphCard} ${styles.glyphAnchor}` : styles.glyphCard} />
      ))}
    </div>
  );
}

const FREE_READING_SPREADS_ANON: SpreadId[] = ["daily", "three", "five"];
const FREE_READING_SPREADS_AUTH: SpreadId[] = ["daily", "three", "five"];
const FREE_LIMIT_ANON = 2;
const FREE_LIMIT_AUTH = 3;
const UNLIMITED_EMAILS = new Set(["peichun1213@gmail.com"]);

// Sign-in exists on the dev site only (NEXT_PUBLIC_ENABLE_AUTH=true there).
// In production the flag is unset, so we treat everyone as anonymous and never
// show the sign-in affordances.
const AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_AUTH === "true";
// Free (no-key) readings are always offered; anonymous abuse is bounded by the
// per-cookie, per-IP, and global daily caps on the server (no bot check).
const FREE_ENABLED = true;

const FREE_STORE_KEY = "lenormand.freeReadings";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Display-only mirror of free readings left today, scoped to the UTC day so it
// resets in step with the server. The server is the real authority and
// corrects this via the X-Free-Remaining header after each reading.
function readFreeRemaining(defaultCap: number): number {
  if (typeof window === "undefined") return defaultCap;
  try {
    const raw = window.localStorage.getItem(FREE_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.day === todayUtc() && typeof parsed.remaining === "number") {
        return parsed.remaining;
      }
    }
  } catch {
    // private mode / quota — fall through to the optimistic default
  }
  return defaultCap;
}

function writeFreeRemaining(remaining: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FREE_STORE_KEY, JSON.stringify({ day: todayUtc(), remaining }));
  } catch {
    // private mode / quota — nothing to do
  }
}

export default function DrawFlow() {
  const locale = useLocale() as Locale;
  const t = useTranslations("draw");
  const s = useTranslations("spread");
  const cardsT = useTranslations("cards");
  const { user } = useAuth();
  const { addReading, hasDrawnDailyToday } = useReadings();

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
  const [questionHelpOpen, setQuestionHelpOpen] = useState(false);
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [showFreePanel, setShowFreePanel] = useState(false);
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [apiConfigured, setApiConfigured] = useState(false);
  const [currentReadingId, setCurrentReadingId] = useState<string | null>(null);

  // Sign-in only counts when auth is enabled (dev). In production the flag is
  // off, so everyone is treated as anonymous regardless of any stale session.
  const effectiveUser = AUTH_ENABLED ? user : null;
  const signedIn = !!effectiveUser;
  const isUnlimited = effectiveUser?.email ? UNLIMITED_EMAILS.has(effectiveUser.email) : false;
  const freeCap = signedIn ? FREE_LIMIT_AUTH : FREE_LIMIT_ANON;

  useEffect(() => {
    setApiConfigured(hasAnyProviderConfigured());
    setFreeRemaining(isUnlimited ? freeCap : readFreeRemaining(freeCap));
  }, [open, isUnlimited, freeCap]);

  function handleFreeRemaining(remaining: number | null) {
    if (remaining === null) return;
    setFreeRemaining(remaining);
    writeFreeRemaining(remaining);
  }
  const questionHelpRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!questionHelpOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (questionHelpRef.current && !questionHelpRef.current.contains(e.target as Node)) {
        setQuestionHelpOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setQuestionHelpOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [questionHelpOpen]);

  const spread = SPREADS[sel];
  const need = spread.cardCount;
  // A spread that uses the whole deck (the Grand Tableau) skips picking
  // from the fan: every card is laid straight into the tableau.
  const layAll = need >= CARDS.length;
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
    if (spreadAt.comingSoon) return;
    const skip = spreadAt.id === "daily";
    const locked = skip && dailyLocked;
    posthog.capture("spread_selected", { spread: spreadAt.id, locale });
    setSel(i);
    setOpen(true);
    setPhase(locked ? "locked" : skip ? "shuffle" : "question");
    if (skip) setQuestion("");
    setCards(scatter());
    setChurn(0);
    setDeckOrder([]);
    setChosen([]);
    setRevealed([]);
    setShowApiPanel(false);
    setShowFreePanel(false);
    setCurrentReadingId(null);
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
    const order = shuffle(CARDS);
    setDeckOrder(order);
    setRevealed([]);
    setPhase("choose");
    if (layAll) commitChosen(order.map((_, i) => i), order);
    else setChosen([]);
  }

  function choose(i: number, order: Card[]) {
    if (chosen.length >= need || chosen.includes(i)) return;
    commitChosen([...chosen, i], order);
  }

  function commitChosen(next: number[], order: Card[]) {
    setChosen(next);
    if (next.length >= need) {
      const reading = addReading({
        spread: spread.id,
        question: question.trim() || undefined,
        cards: next.map((di, idx) => ({ cardId: order[di].id, position: idx })),
        lang: locale,
      });
      setCurrentReadingId(reading.id);
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
    setShowApiPanel(false);
    setShowFreePanel(false);
    setCurrentReadingId(null);
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
      ? ""
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
          const featured = sp.cardCount >= CARDS.length;
          const unavailable = sp.comingSoon === true;
          return (
            <button
              key={sp.id}
              type="button"
              className={[styles.spreadCard, featured && styles.spreadCardFeatured, unavailable && styles.spreadCardUnavailable]
                .filter(Boolean)
                .join(" ")}
              onClick={() => openSpread(i)}
              disabled={unavailable}
              aria-disabled={unavailable}
              style={{ opacity: lockedCard ? 0.6 : 1 }}
            >
              <div className={styles.glowFrame} />
              <div className={styles.glyphWrap}>
                <SpreadGlyph spread={sp} />
              </div>
              <div className={styles.spreadBody}>
                {(featured || unavailable) && (
                  <div className={styles.spreadEyebrowRow}>
                    {featured && <span className={styles.spreadEyebrow}>{t("fullDeckEyebrow")}</span>}
                    {unavailable && <span className={styles.comingSoonBadge}>{t("comingSoonLabel")}</span>}
                  </div>
                )}
                <h2 className={styles.spreadName}>{s(`${sp.id}.name`)}</h2>
                <p className={styles.spreadDescription}>{s(`${sp.id}.description`)}</p>
                <div className={styles.spreadMeta}>
                  {lockedCard ? (
                    <span className={styles.spreadMetaLocked}>{t("dailyLockedBadge")}</span>
                  ) : (
                    <>
                      <span>{t("cardCountLabel", { count: sp.cardCount })}</span>
                      {sp.id === "daily" && (
                        <>
                          <span aria-hidden className={styles.spreadMetaDot}>✦</span>
                          <span>{t("onceADayLabel")}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <div className={styles.scrim}>
          <div style={{ textAlign: "center", width: "100%", maxWidth: layAll && choosing ? TABLEAU_MAX_W : 880 }}>
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
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <div ref={questionHelpRef} style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setQuestionHelpOpen((v) => !v)}
                      aria-expanded={questionHelpOpen}
                      aria-label={t("questionHelp.buttonLabel")}
                      title={t("questionHelp.buttonLabel")}
                      className={styles.questionHelpButton}
                    >
                      ?
                    </button>
                    {questionHelpOpen && (
                      <div className={styles.questionHelpPopover} role="dialog" aria-label={t("questionHelp.title")}>
                        <div className={styles.questionHelpTitle}>{t("questionHelp.title")}</div>
                        <p className={styles.questionHelpText}>{t("questionHelp.intro")}</p>
                        <p className={styles.questionHelpText}>
                          <span className={styles.questionHelpLabel}>{t("questionHelp.tryLabel")}</span>
                          {t("questionHelp.tryExamples")}
                        </p>
                        <p className={styles.questionHelpText}>
                          <span className={styles.questionHelpLabel}>{t("questionHelp.avoidLabel")}</span>
                          {t("questionHelp.avoidExamples")}
                        </p>
                        <p className={styles.questionHelpFooter}>{t("questionHelp.footer")}</p>
                      </div>
                    )}
                  </div>
                </div>
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
                    justifyContent: "flex-end",
                    alignItems: "baseline",
                    marginTop: 10,
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    fontSize: 11,
                    color: "var(--gold-200)",
                  }}
                >
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    fontFamily: "var(--font-smallcaps)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-caps)",
                    fontSize: 11,
                    color: "var(--gold-300)",
                    marginBottom: 8,
                  }}
                >
                  {t("yourQuestionLabel")}
                  {currentReadingId && (
                    <TagEditor
                      key={currentReadingId}
                      readingId={currentReadingId}
                      initialTags={[]}
                      tone="dark"
                    />
                  )}
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
              // The tableau fills the row nine cards wide, scrolling sideways
              // rather than shrinking below a legible size on phones.
              const chosenW = layAll
                ? `clamp(52px, calc((min(${TABLEAU_MAX_W}px, 100vw - 112px) - 64px) / 9), 104px)`
                : done
                  ? "clamp(80px, min(27vw, 18vh), 168px)"
                  : "clamp(70px, min(24vw, 14vh), 148px)";
              const chosenH = layAll
                ? `calc(${chosenW} * ${DECK_CARD_ASPECT})`
                : done
                  ? "clamp(126px, min(42.6vw, 28.4vh), 265px)"
                  : "clamp(110px, min(37.7vw, 22vh), 232px)";
              const columns = spread.columns;
              return (
              <div className={layAll ? styles.tableauScroller : undefined}>
              <div
                style={
                  columns
                    ? {
                        display: "grid",
                        gridTemplateColumns: `repeat(${columns}, ${chosenW})`,
                        gap: layAll ? "12px 8px" : 18,
                        width: layAll ? "max-content" : undefined,
                        margin: layAll ? "0 auto" : undefined,
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
                {chosen.map((di, idx) => {
                  const shown = revealed.includes(di);
                  const card = deckOrder[di];
                  return (
                    <div
                      key={di}
                      onClick={() => reveal(di)}
                      className={styles.chosenCard}
                      style={{
                        cursor: shown ? "default" : "pointer",
                        animationDelay: layAll ? `${idx * 18}ms` : undefined,
                      }}
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
                          marginTop: layAll ? 5 : 10,
                          minHeight: layAll ? 12 : 18,
                          width: layAll ? chosenW : undefined,
                          fontFamily: "var(--font-smallcaps)",
                          textTransform: "uppercase",
                          letterSpacing: layAll ? "0.04em" : "var(--tracking-wide)",
                          fontSize: layAll ? 9 : 11,
                          lineHeight: layAll ? 1.25 : undefined,
                          color: "var(--gold-200)",
                        }}
                      >
                        {shown ? cardsT(`${card.slug}.name`) : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
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

            <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", marginTop: "clamp(10px, 2.2vh, 22px)" }}>
              {!done && (
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
              )}

              {done && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {(signedIn || FREE_ENABLED) &&
                    (isUnlimited || (signedIn ? FREE_READING_SPREADS_AUTH : FREE_READING_SPREADS_ANON).includes(spread.id)) &&
                    freeRemaining !== 0 &&
                    !showFreePanel &&
                    !showApiPanel && (
                      <button
                        type="button"
                        onClick={() => setShowFreePanel(true)}
                        disabled={!allShown}
                        style={{ ...pillButtonStyle(allShown, "gilt"), opacity: allShown ? 1 : 0.45 }}
                      >
                        {freeRemaining === null || isUnlimited
                          ? t("freeReadingButton")
                          : t("freeReadingButtonCount", { count: freeRemaining })}
                      </button>
                    )}
                  {apiConfigured && !showApiPanel && !showFreePanel && (
                    <button
                      type="button"
                      onClick={() => setShowApiPanel(true)}
                      disabled={!allShown}
                      style={{ ...pillButtonStyle(allShown, "ghost"), opacity: allShown ? 1 : 0.45 }}
                    >
                      {t("readWithApiButton")}
                    </button>
                  )}
                </div>
              )}

              {/* Out of free readings for the day: explain and point to the
                  copy-prompt fallback (and, on dev, signing in for more). */}
              {done &&
                allShown &&
                (signedIn || FREE_ENABLED) &&
                freeRemaining === 0 &&
                !showFreePanel &&
                !showApiPanel && (
                  <p
                    style={{
                      maxWidth: 560,
                      margin: "clamp(8px, 2vh, 16px) auto 0",
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--gold-200)",
                      textAlign: "center",
                    }}
                  >
                    {t("freeExhaustedNote")}
                  </p>
                )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
                {done && !layAll && (
                  <CopyToClipboardButton
                    text={promptText}
                    label={t("copyPromptButton")}
                    copiedLabel={t("copiedToast")}
                    pasteIntoLabel={t("pasteIntoLabel")}
                    fallbackTitle={t("copyFallbackTitle")}
                    fallbackHint={t("copyFallbackHint")}
                    selectAllLabel={t("selectAllButton")}
                    buttonStyle={quietActionStyle}
                    buttonClassName={styles.quietAction}
                  />
                )}

                {done && (
                  <button
                    type="button"
                    onClick={layAction}
                    className={allShown ? styles.quietAction : `${styles.quietAction} ${styles.revealCta}`}
                    style={quietActionStyle}
                  >
                    {layLabel}
                  </button>
                )}

                <button type="button" onClick={back} className={styles.quietAction} style={quietActionStyle}>
                  {t("backToSpreadsButton")}
                </button>
              </div>
            </div>

            {done && allShown && showFreePanel && (
              <FreeReadingPanel
                prompt={promptText}
                readingId={currentReadingId}
                signedIn={signedIn}
                onRemaining={handleFreeRemaining}
              />
            )}

            {done && allShown && showApiPanel && (
              <ReadWithApiPanel prompt={promptText} readingId={currentReadingId} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
